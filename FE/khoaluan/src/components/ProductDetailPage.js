import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Star, ArrowLeft } from "lucide-react";
import axios from "axios";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import Header from "./Header";
import API_BASE_URL from "../config";

const ProductDetailPage = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE_URL}/Customer/product-detail/${productId}`);
        setProduct(response.data);
        setLoading(false);
      } catch (err) {
        setError("Không thể tải thông tin sản phẩm. Vui lòng thử lại sau.");
        setLoading(false);
        console.error("API error:", err);
      }
    };

    fetchProduct();
  }, [productId]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return "/placeholder-food.jpg";
    
    // Check if the image URL is a full web URL or a local path
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      return imageUrl;
    } else {
      // For local uploads, prepend the base URL if needed
      return `${API_BASE_URL}${imageUrl}`;
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!product) return <div className="container mx-auto px-4 py-8">Sản phẩm không tồn tại</div>;

  return (
    <div className="bg-white">
  {/* Header tràn full width */}
  <div className="w-full">
    <Header />
  </div>
    <div className="container mx-auto px-4 py-8">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center text-blue-600 mb-4 hover:text-blue-800"
      >
        <ArrowLeft className="h-5 w-5 mr-1" />
        Quay lại
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <img
            src={getImageUrl(product.imageUrl)}
            alt={product.name}
            className="w-full h-96 object-cover"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "/placeholder-food.jpg";
            }}
          />
        </div>
        
        <div>
          <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
          <div className="flex items-center mb-4">
            {product.averageRating ? (
              <div className="flex items-center mr-4">
                <Star className="h-5 w-5 text-yellow-400 fill-current" />
                <span className="ml-1 font-medium">{product.averageRating.toFixed(1)}</span>
                <span className="text-gray-500 text-sm ml-2">
                  ({product.reviewStatistics?.totalReviews || 0} đánh giá)
                </span>
              </div>
            ) : (
              <div className="flex items-center mr-4">
                <span className="text-gray-500">Chưa có đánh giá</span>
              </div>
            )}
            <span className="text-gray-500">Danh mục: {product.foodCategory?.name}</span>
          </div>
          
          <p className="text-2xl font-bold text-blue-600 mb-4">{formatPrice(product.price)}</p>
          
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Mô tả</h2>
            <p className="text-gray-700 whitespace-pre-line">{product.description}</p>
          </div>
          
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Thông tin nhà hàng</h2>
            <div 
              className="bg-gray-50 p-4 rounded-lg cursor-pointer hover:bg-gray-100"
              onClick={() => navigate(`/restaurant/${product.restaurant.restaurantId}`)}
            >
              <p className="font-medium">{product.restaurant?.name}</p>
              <p className="text-gray-600">{product.restaurant?.address}</p>
              {product.restaurant?.phoneNumber && (
                <p className="text-gray-600">Điện thoại: {product.restaurant.phoneNumber}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center mb-6">
            <div className="mr-4">
              <label className="text-gray-700 block mb-2">Số lượng:</label>
              <div className="flex items-center">
                <button className="bg-gray-200 px-3 py-1 rounded-l-lg">-</button>
                <input 
                  type="number" 
                  className="w-16 text-center border-y border-gray-200 py-1"
                  min="1"
                  max={product.stockQuantity}
                  defaultValue="1"
                />
                <button className="bg-gray-200 px-3 py-1 rounded-r-lg">+</button>
              </div>
            </div>
            <div className="text-gray-600">
              <p>Còn lại: {product.stockQuantity} sản phẩm</p>
            </div>
          </div>
          
          <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium">
            Thêm vào giỏ hàng
          </button>
        </div>
      </div>
      
      {/* Phần đánh giá sản phẩm */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6">Đánh giá sản phẩm</h2>
        
        {product.reviews && product.reviews.length > 0 ? (
          <div className="space-y-6">
            {product.reviews.map((review, index) => (
              <div key={index} className="bg-white p-4 rounded-lg shadow-sm">
                <div className="flex items-center mb-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 ${
                          i < review.rating ? "text-yellow-400 fill-current" : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="ml-2 font-medium">{review.userName}</span>
                </div>
                <p className="text-gray-700">{review.comment}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 p-6 rounded-lg text-center">
            <p className="text-gray-600">Chưa có đánh giá nào cho sản phẩm này.</p>
          </div>
        )}
      </div>
    </div>
    </div>
  );
};

export default ProductDetailPage;
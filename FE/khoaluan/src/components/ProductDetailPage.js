import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Star, ArrowLeft } from "lucide-react";
import axios from "axios";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";

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
        const response = await axios.get(`https://localhost:44308/api/Customer/product-detail/${productId}`);
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

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!product) return <div className="container mx-auto px-4 py-8">Sản phẩm không tồn tại</div>;

  return (
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
            src={product.imageUrl || "/placeholder-food.jpg"}
            alt={product.name}
            className="w-full h-96 object-cover"
          />
        </div>
        
        <div>
          <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
          <div className="flex items-center mb-4">
            <div className="flex items-center mr-4">
              <Star className="h-5 w-5 text-yellow-400 fill-current" />
              <span className="ml-1 font-medium">{product.averageRating?.toFixed(1)}</span>
              <span className="text-gray-500 text-sm ml-2">({product.reviewCount} đánh giá)</span>
            </div>
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
              <p className="text-gray-600">Điện thoại: {product.restaurant?.phoneNumber}</p>
            </div>
          </div>
          
          <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium">
            Thêm vào giỏ hàng
          </button>
        </div>
      </div>
      
      {/* Phần đánh giá sản phẩm có thể thêm vào sau */}
    </div>
  );
};

export default ProductDetailPage;
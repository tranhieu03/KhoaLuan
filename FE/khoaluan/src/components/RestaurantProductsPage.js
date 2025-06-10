import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import axios from "axios";
import ProductCard from "../components/ProductCard";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import API_BASE_URL from "../config";

const RestaurantProductsPage = () => {
  const { restaurantId } = useParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `${API_BASE_URL}/Customer/products-by-restaurant/${restaurantId}`,
          { withCredentials: true }
        );
        setProducts(response.data);
        setLoading(false);
      } catch (err) {
        const errorMessage = err.response?.data?.message || "Không thể tải danh sách sản phẩm. Vui lòng thử lại sau.";
        setError(errorMessage);
        setLoading(false);
        console.error("API error:", err);
      }
    };

    fetchProducts();
  }, [restaurantId]);

  const handleViewDetail = (productId) => {
    navigate(`/product/${productId}`);
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="container mx-auto px-4 py-8">
      <button 
        onClick={handleGoBack}
        className="flex items-center text-blue-600 mb-4 hover:text-blue-800"
      >
        <ArrowLeft className="h-5 w-5 mr-1" />
        Quay lại
      </button>

      <h2 className="text-2xl font-bold mb-6">Danh sách món ăn</h2>
      
      {products.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard 
              key={product.productId} 
              product={product} 
              onViewDetail={handleViewDetail}
            />
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-12">Nhà hàng hiện chưa có món ăn nào</p>
      )}
    </div>
  );
};

export default RestaurantProductsPage;

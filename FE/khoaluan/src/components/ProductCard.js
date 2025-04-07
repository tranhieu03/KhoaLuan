import { Star, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";
import { useState } from "react";

const ProductCard = ({ product, onViewDetail, onCartUpdate }) => {
  const navigate = useNavigate();
  const [isAdding, setIsAdding] = useState(false);
  
  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const handleViewDetail = (productId) => {
    if (typeof onViewDetail === 'function') {
      onViewDetail(productId);
    } else {
      console.warn('onViewDetail is not provided as a function');
    }
  };

  const handleViewRestaurant = (restaurantId) => {
    navigate(`/restaurant-products/${restaurantId}`);
  };

  const handleAddToCart = async () => {
    try {
      setIsAdding(true);
      await axios.post(
        "https://localhost:44308/api/Cart/Cart_add",
        { 
          ProductId: product.productId, 
          Quantity: 1 
        },
        { 
          withCredentials: true 
        }
      );

      toast.success("Đã thêm sản phẩm vào giỏ hàng!");
      
      // Gọi callback để cập nhật giỏ hàng nếu được cung cấp
      if (typeof onCartUpdate === 'function') {
        onCartUpdate();
      }
    } catch (error) {
      console.error("Lỗi khi thêm vào giỏ hàng:", error);
      toast.error(error.response?.data?.message || "Không thể thêm vào giỏ hàng");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col">
      <div className="relative flex-shrink-0">
        <img
          src={product.imageUrl || "/placeholder-food.jpg"}
          alt={product.name}
          className="w-full h-48 object-cover cursor-pointer"
          onClick={() => handleViewDetail(product.productId)}
        />
        {product.foodCategory && (
          <div className="absolute bottom-0 left-0 bg-black bg-opacity-70 text-white px-2 py-1 text-xs">
            {product.foodCategory.name}
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-2">
          <h3 
            className="font-bold text-lg truncate cursor-pointer hover:text-blue-600"
            onClick={() => handleViewDetail(product.productId)}
          >
            {product.name}
          </h3>
          <div className="flex items-center">
            <Star className="h-4 w-4 text-yellow-400 fill-current" />
            <span className="ml-1 text-sm">{product.averageRating?.toFixed(1) || "N/A"}</span>
          </div>
        </div>
        <p className="text-gray-600 text-sm mb-2 line-clamp-2">{product.description}</p>
        <p 
          className="text-gray-500 text-xs mb-3 truncate cursor-pointer hover:text-blue-600"
          onClick={() => handleViewRestaurant(product.restaurant?.restaurantId)}
        >
          {product.restaurant?.name}
        </p>
        <div className="mt-auto flex justify-between items-center">
          <p className="font-bold text-lg text-blue-600">{formatPrice(product.price)}</p>
          <div className="flex gap-2">
            <button 
              onClick={handleAddToCart}
              disabled={isAdding}
              className={`flex items-center gap-1 ${isAdding ? 'bg-orange-400' : 'bg-orange-500'} text-white px-3 py-1 rounded-md hover:bg-orange-600 text-sm transition-colors`}
            >
              {isAdding ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Đang thêm...
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4" />
                  Thêm
                </>
              )}
            </button>
            <button 
              onClick={() => handleViewDetail(product.productId)}
              className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm transition-colors"
            >
              Chi tiết
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
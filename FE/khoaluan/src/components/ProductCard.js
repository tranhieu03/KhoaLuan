import { Star, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";
import { useState } from "react";
import API_BASE_URL from "../config";

const ProductCard = ({ product, onViewDetail, onCartUpdate }) => {
  const navigate = useNavigate();
  const [isAdding, setIsAdding] = useState(false);
  
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
      return `${API_BASE_URL}}${imageUrl}`;
    }
  };

  const handleViewDetail = (productId) => {
    if (typeof onViewDetail === 'function') {
      onViewDetail(productId);
    } else {
      // If no handler provided, navigate directly
      navigate(`/product/${productId}`);
    }
  };

  const handleViewRestaurant = (restaurantId) => {
    navigate(`/restaurant-products/${restaurantId}`);
  };

  const handleAddToCart = async (e) => {
    // Prevent event from bubbling up to parent (card click)
    e.stopPropagation();
    
    try {
      setIsAdding(true);
      await axios.post(
        `${API_BASE_URL}//Cart/Cart_add`,
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
      
      if (error.response?.status === 401) {
        toast.error("Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng");
        navigate("/login", { state: { from: window.location.pathname } });
      } else {
        toast.error(error.response?.data?.message || "Không thể thêm vào giỏ hàng");
      }
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col">
      <div className="relative flex-shrink-0">
        <img
          src={getImageUrl(product.imageUrl)}
          alt={product.name}
          className="w-full h-48 object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
          onClick={() => handleViewDetail(product.productId)}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = "/placeholder-food.jpg";
          }}
        />
        {product.foodCategory && (
          <div className="absolute bottom-0 left-0 bg-black bg-opacity-70 text-white px-2 py-1 text-xs">
            {product.foodCategory.name}
          </div>
        )}
        {product.stockQuantity !== undefined && product.stockQuantity <= 0 && (
          <div className="absolute top-0 right-0 bg-red-600 text-white px-2 py-1 text-xs">
            Hết hàng
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
            {product.averageRating ? (
              <>
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <span className="ml-1 text-sm">{product.averageRating.toFixed(1)}</span>
              </>
            ) : (
              <span className="text-xs text-gray-500">Chưa có đánh giá</span>
            )}
          </div>
        </div>
        
        <p className="text-gray-600 text-sm mb-2 line-clamp-2">{product.description}</p>
        
        {product.restaurant && (
  <div className="flex items-center justify-between mb-3">
    <p 
      className="text-gray-500 text-xs truncate cursor-pointer hover:text-blue-600 mr-2"
      onClick={(e) => {
        e.stopPropagation();
        handleViewRestaurant(product.restaurant.restaurantId);
      }}
    >
      {product.restaurant.name}
    </p>
    {product.distance && (
      <span className="text-xs text-gray-400 flex items-center whitespace-nowrap">
       
        {parseFloat(product.distance).toFixed(1)} km
      </span>
    )}
  </div>
)}
        
        <div className="mt-auto flex justify-between items-center">
          
          <p className="font-bold text-lg text-blue-600">{formatPrice(product.price)}</p>
          
          <div className="flex gap-2">
            <button 
              onClick={handleAddToCart}
              disabled={isAdding || (product.stockQuantity !== undefined && product.stockQuantity <= 0)}
              className={`flex items-center gap-1 ${
                isAdding 
                  ? 'bg-orange-400' 
                  : product.stockQuantity !== undefined && product.stockQuantity <= 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-orange-500 hover:bg-orange-600'
              } text-white px-3 py-1 rounded-md text-sm transition-colors`}
            >
              {isAdding ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Đang thêm...</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4" />
                  <span>Thêm</span>
                </>
              )}
            </button>
            
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleViewDetail(product.productId);
              }}
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
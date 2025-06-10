import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import LoadingSpinner from "../components/LoadingSpinner";
import Header from "./Header";
import API_BASE_URL from "../config";

export default function RestaurantProductsPage() {
  const { restaurantId } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Replace with actual API calls
        setTimeout(() => {
          const mockRestaurant = {
            restaurantId: parseInt(restaurantId),
            name: `Nhà hàng ${restaurantId}`,
            address: "123 Đường ABC, Quận XYZ",
            phoneNumber: "0123456789",
            imageUrl: "/placeholder-restaurant.jpg"
          };
          
          const mockProducts = Array(8).fill().map((_, i) => ({
            productId: i + 1,
            name: `Món ăn ${i + 1}`,
            description: "Mô tả món ăn ngon",
            price: 50000 + Math.floor(Math.random() * 100000),
            imageUrl: "/placeholder-food.jpg",
            stockQuantity: 10 + Math.floor(Math.random() * 20),
            averageRating: 3 + Math.random() * 2,
            foodCategory: {
              foodCategoryId: Math.floor(Math.random() * 5) + 1,
              name: `Danh mục ${Math.floor(Math.random() * 5) + 1}`
            }
          }));
          
          setRestaurant(mockRestaurant);
          setProducts(mockProducts);
          setLoading(false);
        }, 500);
      } catch (err) {
        setError("Không thể tải thông tin nhà hàng. Vui lòng thử lại sau.");
        setLoading(false);
      }
    };

    fetchData();
  }, [restaurantId]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="container mx-auto px-4 py-8 text-red-500">{error}</div>;

  return (
    <div className="container mx-auto px-4 py-8">
<Header/>
      {restaurant && (
        <div className="mb-8">
          <div className="flex flex-col md:flex-row gap-6">
            <img
              src={restaurant.imageUrl}
              alt={restaurant.name}
              className="w-full md:w-1/3 h-48 object-cover rounded-lg"
            />
            <div>
              <h1 className="text-3xl font-bold mb-2">{restaurant.name}</h1>
              <p className="text-gray-600 mb-2">
                <span className="font-medium">Địa chỉ:</span> {restaurant.address}
              </p>
              <p className="text-gray-600">
                <span className="font-medium">Điện thoại:</span> {restaurant.phoneNumber}
              </p>
            </div>
          </div>
        </div>
      )}
      
      <h2 className="text-2xl font-bold mb-6">Danh sách món ăn</h2>
      
      {products.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard 
              key={product.productId} 
              product={product} 
              onViewDetail={(id) => console.log("View detail:", id)}
            />
          ))}
        </div>
      ) : (
        <p className="text-gray-500">Nhà hàng hiện chưa có món ăn nào.</p>
      )}
    </div>
  );
}
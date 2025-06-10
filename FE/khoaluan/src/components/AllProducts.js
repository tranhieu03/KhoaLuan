import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowUpDown, Star, MapPin } from "lucide-react";
import axios from "axios";
import ProductCard from "../components/ProductCard";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import API_BASE_URL from "../config";
import Footer from "./Footer";

const ProductListingPage = () => {
  const navigate = useNavigate();
  
  // State for products data
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pagination state
  const [pagination, setPagination] = useState({
    totalItems: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0
  });

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [foodCategoryId, setFoodCategoryId] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortAscending, setSortAscending] = useState(true);
  
  // Location states
  const [useLocation, setUseLocation] = useState(false);
  const [userLocation, setUserLocation] = useState({ latitude: null, longitude: null });
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);
  
  // Food categories data
  const [foodCategories, setFoodCategories] = useState([]);

  // Fetch food categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}Customer/food-categories`);
        setFoodCategories(response.data);
      } catch (err) {
        console.error("Failed to fetch categories:", err);
      }
    };

    fetchCategories();
  }, []);

  // Get user location
  const getUserLocation = async () => {
    if (!navigator.geolocation) {
      setLocationError("Trình duyệt của bạn không hỗ trợ định vị");
      return;
    }

    setLocationLoading(true);
    setLocationError(null);

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        });
      });

      const { latitude, longitude } = position.coords;
      setUserLocation({ latitude, longitude });
      console.log("User location obtained:", latitude, longitude);
      return { latitude, longitude };
      
    } catch (err) {
      console.error("Error getting location:", err);
      setLocationError("Không thể lấy vị trí của bạn. Vui lòng cho phép truy cập vị trí.");
      setUseLocation(false);
      return null;
    } finally {
      setLocationLoading(false);
    }
  };

  // Toggle location use
  useEffect(() => {
    if (useLocation) {
      getUserLocation();
    } else {
      setUserLocation({ latitude: null, longitude: null });
    }
  }, [useLocation]);

  // Fetch products when filters or pagination change
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        
        // Build query parameters
        const params = {
          page: pagination.page,
          pageSize: pagination.pageSize,
          searchTerm: searchTerm || undefined,
          foodCategoryId: foodCategoryId || undefined,
          minPrice: minPrice || undefined,
          maxPrice: maxPrice || undefined,
          sortBy,
          sortAscending
        };

        // Add location parameters if available
        if (userLocation.latitude && userLocation.longitude) {
          params.latitude = userLocation.latitude;
          params.longitude = userLocation.longitude;
        }

        // Gọi API để lấy danh sách sản phẩm
        const response = await axios.get(`${API_BASE_URL}Customer/all-products`, {
          params,
          withCredentials: true
        });

        setProducts(response.data.items);
        setPagination({
          totalItems: response.data.totalItems,
          page: response.data.page,
          pageSize: response.data.pageSize,
          totalPages: response.data.totalPages
        });
        setLoading(false);
      } catch (err) {
        setError("Không thể tải danh sách sản phẩm. Vui lòng thử lại sau.");
        setLoading(false);
        console.error("API error:", err);
      }
    };

    fetchProducts();
  }, [pagination.page, searchTerm, foodCategoryId, minPrice, maxPrice, sortBy, sortAscending, userLocation]);

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination({ ...pagination, page: newPage });
    }
  };

  // Handle search submit
  const handleSearch = (e) => {
    e.preventDefault();
    setPagination({ ...pagination, page: 1 });
  };

  // Handle sort change
  const handleSortChange = (newSortBy) => {
    if (sortBy === newSortBy) {
      setSortAscending(sortAscending);
    } else {
      setSortBy(newSortBy);
      setSortAscending(true);
    }
  };

  // Handle location toggle
  const handleLocationToggle = async (e) => {
    const useLocationValue = e.target.checked;
    setUseLocation(useLocationValue);
    
    if (useLocationValue) {
      // If toggling to use location and sorting by distance, just set the toggle
      // The useEffect will handle getting the location
      if (sortBy === 'distance') {
        setPagination({ ...pagination, page: 1 });
      }
    } else if (sortBy === 'distance') {
      // If turning off location but sorting by distance, change sort to name
      setSortBy('name');
    }
  };

  // Handle view product detail
  const handleViewDetail = (productId) => {
    navigate(`/product/${productId}`);
  };

  // Format price to VND
  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  // Format distance
  const formatDistance = (distance) => {
    if (distance === null || distance === undefined) return 'Không xác định';
    return `${distance.toFixed(1)} km`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Danh sách món ăn</h1>
      
      {/* Filter Section */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <form onSubmit={handleSearch} className="mb-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tìm kiếm món ăn..."
                  className="w-full p-2 border rounded-md pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>
            <button 
              type="submit" 
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Tìm kiếm
            </button>
          </div>
        </form>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục</label>
            <select
              className="w-full p-2 border rounded-md"
              value={foodCategoryId}
              onChange={(e) => setFoodCategoryId(e.target.value)}
            >
              <option value="">Tất cả danh mục</option>
              {foodCategories.map(category => (
                <option key={category.foodCategoryId} value={category.foodCategoryId}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Min Price Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Giá tối thiểu</label>
            <input
              type="number"
              className="w-full p-2 border rounded-md"
              placeholder="Giá tối thiểu"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              min="0"
            />
          </div>
          
          {/* Max Price Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Giá tối đa</label>
            <input
              type="number"
              className="w-full p-2 border rounded-md"
              placeholder="Giá tối đa"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              min="0"
            />
          </div>
        </div>
        
        {/* Location Filter */}
        <div className="mt-4 mb-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="useLocation"
              checked={useLocation}
              onChange={handleLocationToggle}
              className="w-4 h-4 text-blue-600"
            />
            <label htmlFor="useLocation" className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <MapPin className="h-4 w-4" /> Sử dụng vị trí hiện tại
            </label>
            
            {locationLoading && <span className="text-xs text-gray-500 ml-2">Đang tải vị trí...</span>}
            {locationError && <span className="text-xs text-red-500 ml-2">{locationError}</span>}
            {userLocation.latitude && userLocation.longitude && (
              <span className="text-xs text-green-500 ml-2">Vị trí đã được cập nhật</span>
            )}
          </div>
        </div>
        
        {/* Sort Options */}
        <div className="flex flex-wrap gap-2">
          <button
            className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${
              sortBy === 'name' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100'
            }`}
            onClick={() => handleSortChange('name')}
          >
            Tên {sortBy === 'name' && <ArrowUpDown className="h-3 w-3" />}
          </button>
          <button
            className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${
              sortBy === 'price' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100'
            }`}
            onClick={() => handleSortChange('price')}
          >
            Giá {sortBy === 'price' && <ArrowUpDown className="h-3 w-3" />}
          </button>
          <button
            className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${
              sortBy === 'rating' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100'
            }`}
            onClick={() => handleSortChange('rating')}
          >
            Đánh giá {sortBy === 'rating' && <ArrowUpDown className="h-3 w-3" />}
          </button>
          <button
            className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${
              sortBy === 'newest' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100'
            }`}
            onClick={() => handleSortChange('newest')}
          >
            Mới nhất {sortBy === 'newest' && <ArrowUpDown className="h-3 w-3" />}
          </button>
          <button
            className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${
              sortBy === 'distance' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100'
            }`}
            onClick={() => {
              if (!useLocation) {
                // If location not enabled, prompt user
                const wantLocation = window.confirm('Để sắp xếp theo khoảng cách, bạn cần cho phép truy cập vị trí. Bạn có muốn tiếp tục?');
                if (wantLocation) {
                  setUseLocation(true);
                  handleSortChange('distance');
                }
              } else {
                handleSortChange('distance');
              }
            }}
          >
            Khoảng cách {sortBy === 'distance' && <ArrowUpDown className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && <ErrorMessage message={error} />}

      {/* Loading State */}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard 
                key={product.productId} 
                product={product} 
                onViewDetail={handleViewDetail}
                showDistance={sortBy === 'distance' && useLocation}
              />
            ))}
          </div>

          {/* No Products Found */}
          {products.length === 0 && !loading && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">Không tìm thấy sản phẩm nào phù hợp</p>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center mt-8">
              <nav className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 rounded-md border disabled:opacity-50 hover:bg-gray-50 transition-colors"
                >
                  Trước
                </button>
                
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-1 rounded-md ${
                      pagination.page === pageNum
                        ? "bg-blue-600 text-white"
                        : "border hover:bg-gray-50"
                    } transition-colors`}
                  >
                    {pageNum}
                  </button>
                ))}
                
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-3 py-1 rounded-md border disabled:opacity-50 hover:bg-gray-50 transition-colors"
                >
                  Sau
                </button>
              </nav>
              
            </div>
            
          )}
        </>
      )}
    </div>
    
  );
};

export default ProductListingPage;
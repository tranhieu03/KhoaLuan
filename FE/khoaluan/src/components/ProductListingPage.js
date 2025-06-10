import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowUp, ArrowDown, Star, Filter, MapPin, X } from "lucide-react";
import axios from "axios";
import ProductCard from "../components/ProductCard";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import "../index.css";
import Header from './Header'
import API_BASE_URL from "../config";

const ProductListingPage = () => {
  const navigate = useNavigate();
  
  // State management
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  
  // Pagination state
  const [pagination, setPagination] = useState({
    totalItems: 0,
    page: 1,
    pageSize: 12,
    totalPages: 0
  });

  // Filter states
  const [filters, setFilters] = useState({
    searchTerm: "",
    foodCategoryId: "",
    minPrice: "",
    maxPrice: "",
    sortBy: "name",
    sortAscending: true
  });
  
  const [foodCategories, setFoodCategories] = useState([]);

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting geolocation:", error);
        }
      );
    }
  }, []);

  // Fetch food categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/Product/food-categories`);
        setFoodCategories(response.data);
      } catch (err) {
        console.error("Failed to fetch categories:", err);
      }
    };
  
    fetchCategories();
  }, []);

  // Fetch products with debounce
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        
        const params = {
          page: pagination.page,
          pageSize: pagination.pageSize,
          searchTerm: filters.searchTerm || undefined,
          foodCategoryId: filters.foodCategoryId || undefined,
          minPrice: filters.minPrice || undefined,
          maxPrice: filters.maxPrice || undefined,
          sortBy: filters.sortBy,
          sortAscending: filters.sortAscending
        };

        // Add location parameters if available
        if (userLocation && filters.sortBy === "distance") {
          params.latitude = userLocation.latitude;
          params.longitude = userLocation.longitude;
        }

        const response = await axios.get(`${API_BASE_URL}/Customer/all-products`, {
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

    const timer = setTimeout(() => {
      fetchProducts();
    }, 300);

    return () => clearTimeout(timer);
  }, [pagination.page, filters, userLocation]);

  // Handler functions
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSortChange = (newSortBy) => {
    // If clicking the same sort option, just toggle direction
    if (filters.sortBy === newSortBy) {
      setFilters(prev => ({
        ...prev,
        sortAscending: !prev.sortAscending
      }));
    } else {
      // If changing sort criteria, set default direction based on type
      let defaultAscending = true;
      
      // For price, rating, and distance, descending is often the more useful default
      if (["price", "rating", "distance"].includes(newSortBy)) {
        defaultAscending = false;
      }
      
      setFilters(prev => ({
        ...prev,
        sortBy: newSortBy,
        sortAscending: defaultAscending
      }));
    }
  };

  const resetFilters = () => {
    setFilters({
      searchTerm: "",
      foodCategoryId: "",
      minPrice: "",
      maxPrice: "",
      sortBy: "name",
      sortAscending: true
    });
  };

  const handleViewDetail = (productId) => navigate(`/product/${productId}`);
  const handleViewRestaurant = (restaurantId) => navigate(`/restaurant/${restaurantId}`);

  // Active filter count
  const activeFilterCount = [
    filters.searchTerm,
    filters.foodCategoryId,
    filters.minPrice,
    filters.maxPrice
  ].filter(Boolean).length;

  // Helper to get sort option display name
  const getSortOptionName = (sortKey) => {
    switch (sortKey) {
      case 'name': return 'Tên';
      case 'price': return 'Giá';
      case 'rating': return 'Đánh giá';
      case 'newest': return 'Mới nhất';
      case 'distance': return 'Khoảng cách';
      default: return sortKey;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <Header />
      
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold text-gray-900">Khám phá món ngon</h1>
          
          {/* Mobile filter button */}
          <button
            onClick={() => setShowMobileFilters(true)}
            className="md:hidden flex items-center gap-2 px-4 py-2 bg-white border rounded-lg shadow-sm"
          >
            <Filter size={18} />
            <span>Bộ lọc</span>
            {activeFilterCount > 0 && (
              <span className="bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Main Content */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Desktop Filters - Left Sidebar */}
          <div className="hidden md:block w-64 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-md p-4 sticky top-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold text-lg">Bộ lọc</h2>
                {activeFilterCount > 0 && (
                  <button 
                    onClick={resetFilters}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <X size={14} /> Xóa bộ lọc
                  </button>
                )}
              </div>
              
              {/* Search */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Tìm kiếm</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Tên món ăn..."
                    className="w-full p-2 pl-9 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={filters.searchTerm}
                    onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                  />
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>
              </div>
              
              {/* Category Filter */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục</label>
                <select
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={filters.foodCategoryId}
                  onChange={(e) => handleFilterChange('foodCategoryId', e.target.value)}
                >
                  <option value="">Tất cả danh mục</option>
                  {foodCategories.map(category => (
                    <option key={category.foodCategoryId} value={category.foodCategoryId}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Price Range */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Khoảng giá</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Từ"
                    value={filters.minPrice}
                    onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                    min="0"
                  />
                  <input
                    type="number"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Đến"
                    value={filters.maxPrice}
                    onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                    min="0"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Filters Modal */}
          {showMobileFilters && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" onClick={() => setShowMobileFilters(false)}>
                  <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>
                
                <div className="inline-block align-bottom bg-white rounded-t-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Bộ lọc</h3>
                      <button onClick={() => setShowMobileFilters(false)} className="text-gray-400 hover:text-gray-500">
                        <X size={24} />
                      </button>
                    </div>
                    
                    {/* Mobile filter content */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tìm kiếm</label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Tên món ăn..."
                            className="w-full p-2 pl-9 border border-gray-300 rounded-lg"
                            value={filters.searchTerm}
                            onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                          />
                          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục</label>
                        <select
                          className="w-full p-2 border border-gray-300 rounded-lg"
                          value={filters.foodCategoryId}
                          onChange={(e) => handleFilterChange('foodCategoryId', e.target.value)}
                        >
                          <option value="">Tất cả danh mục</option>
                          {foodCategories.map(category => (
                            <option key={category.foodCategoryId} value={category.foodCategoryId}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Khoảng giá</label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            className="w-full p-2 border border-gray-300 rounded-lg"
                            placeholder="Từ"
                            value={filters.minPrice}
                            onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                            min="0"
                          />
                          <input
                            type="number"
                            className="w-full p-2 border border-gray-300 rounded-lg"
                            placeholder="Đến"
                            value={filters.maxPrice}
                            onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                            min="0"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button
                      type="button"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                      onClick={() => setShowMobileFilters(false)}
                    >
                      Áp dụng
                    </button>
                    <button
                      type="button"
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                      onClick={resetFilters}
                    >
                      Xóa bộ lọc
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Product Listing */}
          <div className="flex-1">
            {/* Sort Options */}
            <div className="bg-white rounded-xl shadow-md p-4 mb-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-500 mr-2">Sắp xếp:</span>
                {['name', 'price', 'rating', 'newest', 'distance'].map((sortKey) => (
                  <button
                    key={sortKey}
                    onClick={() => handleSortChange(sortKey)}
                    className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 transition-colors ${
                      filters.sortBy === sortKey
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                    disabled={sortKey === 'distance' && !userLocation}
                  >
                    {getSortOptionName(sortKey)}
                    {filters.sortBy === sortKey && (
                      filters.sortAscending ? 
                      <ArrowUp className="h-3 w-3" /> : 
                      <ArrowDown className="h-3 w-3" />
                    )}
                    {sortKey === 'distance' && <MapPin className="h-3 w-3 ml-1" />}
                  </button>
                ))}
              </div>
              
              {/* Sort direction labels */}
              {filters.sortBy && (
                <div className="mt-2 text-xs text-gray-500">
                  {filters.sortBy === 'name' && (
                    <span>{filters.sortAscending ? "A → Z" : "Z → A"}</span>
                  )}
                  {filters.sortBy === 'price' && (
                    <span>{filters.sortAscending ? "Giá thấp → cao" : "Giá cao → thấp"}</span>
                  )}
                  {filters.sortBy === 'rating' && (
                    <span>{filters.sortAscending ? "Đánh giá thấp → cao" : "Đánh giá cao → thấp"}</span>
                  )}
                  {filters.sortBy === 'newest' && (
                    <span>{filters.sortAscending ? "Cũ nhất → mới nhất" : "Mới nhất → cũ nhất"}</span>
                  )}
                  {filters.sortBy === 'distance' && (
                    <span>{filters.sortAscending ? "Xa nhất → gần nhất" : "Gần nhất → xa nhất"}</span>
                  )}
                </div>
              )}
            </div>

            {/* Location Permission */}
            {filters.sortBy === 'distance' && !userLocation && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <MapPin className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      Để sắp xếp theo vị trí, vui lòng cấp quyền truy cập vị trí của bạn.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && <ErrorMessage message={error} />}

            {/* Loading State */}
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <LoadingSpinner />
              </div>
            ) : (
              <>
                {/* Products Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {products.map((product) => (
                    <ProductCard 
                      key={product.productId} 
                      product={product} 
                      onViewDetail={handleViewDetail}
                      onViewRestaurant={handleViewRestaurant}
                    />
                  ))}
                </div>

                {/* No Products Found */}
                {products.length === 0 && !loading && (
                  <div className="bg-white rounded-xl shadow-md p-8 text-center">
                    <div className="mx-auto max-w-md">
                      <Search className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-lg font-medium text-gray-900">Không tìm thấy món ăn</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Hãy thử điều chỉnh bộ lọc hoặc tìm kiếm với từ khóa khác
                      </p>
                      <div className="mt-6">
                        <button
                          onClick={resetFilters}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
                        >
                          Xóa bộ lọc
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="mt-8 flex justify-center">
                    <nav className="inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                          pagination.page === 1 ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <span className="sr-only">Trước</span>
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                      
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        let pageNum;
                        if (pagination.totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (pagination.page <= 3) {
                          pageNum = i + 1;
                        } else if (pagination.page >= pagination.totalPages - 2) {
                          pageNum = pagination.totalPages - 4 + i;
                        } else {
                          pageNum = pagination.page - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              pagination.page === pageNum
                                ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                                : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      
                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.totalPages}
                        className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                          pagination.page === pagination.totalPages ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <span className="sr-only">Sau</span>
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </nav>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductListingPage;
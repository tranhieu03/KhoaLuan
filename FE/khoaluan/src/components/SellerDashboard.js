import React, { useState, useEffect } from "react";
import axios from "axios";
import { PlusCircle, Edit, Trash2, Image as ImageIcon, Loader2, RotateCw, Eye, EyeOff } from "lucide-react";
import RestaurantHeader from "./RestaurantHeader";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import API_BASE_URL from "../config";

const API_ORDERS2 = API_BASE_URL || "https://localhost:44308/api";
const SellerDashboard = () => {
  const [products, setProducts] = useState([]);
  const [InactiveProducts, setInactiveProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("active");
  const [previewImage, setPreviewImage] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [categories, setCategories] = useState([]);
  const [hasRestaurant, setHasRestaurant] = useState(null);
  const [isCheckingRestaurant, setIsCheckingRestaurant] = useState(true);
  const navigate = useNavigate();

  // Product form states
  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    price: "",
    imageUrl: "",
    stockQuantity: "",
    foodCategoryId: "",
    imageFile: null
  });

  // Kiểm tra user đã có nhà hàng chưa
  const checkUserRestaurant = async () => {
    setIsCheckingRestaurant(true);
    try {
      const res = await axios.get(`${API_ORDERS2}/Restaurant/has-restaurant`, { 
        withCredentials: true 
      });
      
      if (!res.data.hasRestaurant) {
        navigate("/create/restaurant");
        return false;
      }
      
      setHasRestaurant(true);
      return true;
    } catch (error) {
      console.error("Error checking restaurant:", error);
      toast.error("Lỗi khi kiểm tra thông tin nhà hàng");
      if (error.response?.status === 401) {
        navigate("/");
      }
      return false;
    } finally {
      setIsCheckingRestaurant(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_ORDERS2}/Product/food-categories`);
      setCategories(res.data);
    } catch (error) {
      toast.error("Lỗi khi tải danh mục sản phẩm");
    }
  };

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const activeRes = await axios.get(`${API_ORDERS2}/Product/listsanphamcuahang`, { withCredentials: true });
      const InactiveRes = await axios.get(`${API_ORDERS2}/Product/listsanphamdaxoa`, { withCredentials: true });
      
      setProducts(activeRes.data);
      setInactiveProducts(InactiveRes.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi tải sản phẩm");
      if (error.response?.status === 401) {
        navigate("/");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      const hasRestaurantResult = await checkUserRestaurant();
      if (hasRestaurantResult) {
        fetchProducts();
        fetchCategories();
      }
    };
    
    initializeData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProductForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      // Tạo URL xem trước ảnh
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setPreviewImage(null);
    setProductForm(prev => ({ ...prev, imageFile: null, imageUrl: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!productForm.name || !productForm.price || !productForm.stockQuantity || !productForm.foodCategoryId) {
      toast.error("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }
  
    if (!selectedImage) {
      toast.error("Vui lòng chọn ảnh sản phẩm");
      return;
    }
  
    setIsLoading(true);
  
    const formData = new FormData();
    formData.append("Name", productForm.name);
    formData.append("Description", productForm.description);
    formData.append("Price", productForm.price);
    formData.append("StockQuantity", productForm.stockQuantity);
    formData.append("FoodCategoryId", productForm.foodCategoryId);
    formData.append("ImageFile", selectedImage);
  
    try {
      await axios.post(`${API_ORDERS2}/Product/create`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true
      });
      
      toast.success("Thêm sản phẩm thành công");
      resetForm();
      fetchProducts();
    } catch (error) {
      console.error("Error details:", error);
      toast.error(error.response?.data?.message || "Lỗi khi thêm sản phẩm");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (productId, action) => {
    if (!window.confirm(`Bạn chắc chắn muốn ${action === "delete" ? "xóa" : "khôi phục"} sản phẩm này?`)) return;

    setIsLoading(true);
    try {
      const endpoint = action === "delete" ? "delete" : "restore";
      await axios.put(`${API_ORDERS2}/Product/${endpoint}/${productId}`, {}, { withCredentials: true });
      
      toast.success(`Sản phẩm đã được ${action === "delete" ? "xóa" : "khôi phục"} thành công`);
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.message || `Lỗi khi ${action === "delete" ? "xóa" : "khôi phục"} sản phẩm`);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setProductForm({
      name: "",
      description: "",
      price: "",
      imageUrl: "",
      stockQuantity: "",
      foodCategoryId: "",
      imageFile: null
    });
    setIsFormOpen(false);
    setSelectedImage(null);
    setPreviewImage(null);
  };

  const displayedProducts = activeTab === "active" ? products : InactiveProducts;

  // Hiển thị loading nếu đang kiểm tra trạng thái nhà hàng
  if (isCheckingRestaurant) {
    return (
      <div className="min-h-screen bg-gray-50">
        
        <div className="flex justify-center items-center h-[calc(100vh-80px)]">
          <Loader2 className="animate-spin text-indigo-600" size={48} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      {/* Header tràn full width */}
      <div className="w-full">
        <RestaurantHeader />
      
    <div className="min-h-screen bg-gray-50">
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Quản lý sản phẩm</h1>
          <div className="flex gap-4">
            <button
              onClick={() => {
                resetForm();
                setIsFormOpen(true);
              }}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <PlusCircle size={18} />
              Thêm sản phẩm
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b mb-6">
          <button
            className={`px-4 py-2 font-medium ${activeTab === "active" ? "text-indigo-600 border-b-2 border-indigo-600" : "text-gray-500"}`}
            onClick={() => setActiveTab("active")}
          >
            Sản phẩm đang bán ({products.length})
          </button>
          <button
            className={`px-4 py-2 font-medium ${activeTab === "Inactive" ? "text-indigo-600 border-b-2 border-indigo-600" : "text-gray-500"}`}
            onClick={() => setActiveTab("Inactive")}
          >
            Sản phẩm đã xóa ({InactiveProducts.length})
          </button>
        </div>

        {/* Product Form Modal */}
        {isFormOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
              <h2 className="text-xl font-semibold mb-4">Thêm sản phẩm mới</h2>
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tên sản phẩm *</label>
                    <input
                      type="text"
                      name="name"
                      value={productForm.name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Giá (VNĐ) *</label>
                    <input
                      type="number"
                      name="price"
                      value={productForm.price}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                      min="0"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                  <textarea
                    name="description"
                    value={productForm.description}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows="3"
                  ></textarea>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng tồn kho *</label>
                    <input
                      type="number"
                      name="stockQuantity"
                      value={productForm.stockQuantity}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                      min="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục *</label>
                    <select
                      name="foodCategoryId"
                      value={productForm.foodCategoryId}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    >
                      <option value="">Chọn danh mục</option>
                      {categories.map((category) => (
                        <option key={category.foodCategoryId} value={category.foodCategoryId}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>               
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hình ảnh sản phẩm *</label>
                  <div className="flex items-center gap-4">
                    <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                      {previewImage ? (
                        <>
                          <img src={previewImage} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                          <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                        </>
                      ) : (
                        <>
                          <div className="flex flex-col items-center justify-center p-2 text-gray-500">
                            <ImageIcon size={24} />
                            <span className="text-xs mt-1">Chọn ảnh</span>
                          </div>
                          <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" required />
                        </>
                      )}
                    </label>
                    {previewImage && (
                      <button
                        type="button"
                        onClick={removeImage}
                        className="text-red-500 hover:text-red-700"
                      >
                        Xóa ảnh
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-70"
                  >
                    {isLoading ? <Loader2 className="animate-spin" size={18} /> : <PlusCircle size={18} />}
                    Thêm sản phẩm
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Products List */}
        {isLoading && !displayedProducts.length ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
          </div>
        ) : displayedProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedProducts.map((product) => (
              <div key={product.productId} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow flex flex-col h-full">
                {/* Image Container */}
                <div className="relative h-48 bg-gray-100 group">
                  {product.imageUrl ? (
                    <>
                      <img 
                        src={
                          product.imageUrl.startsWith('http') 
                            ? product.imageUrl 
                            : `${API_ORDERS2}/${product.imageUrl}`
                        }
                        alt={product.name}
                        className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-90"
                        onError={(e) => {
                          e.target.src = "https://via.placeholder.com/300x200?text=No+Image";
                        }}
                        loading="lazy"
                      />
                      {/* Image Zoom Button */}
                      <button
                        onClick={() => {
                          const fullImageUrl = product.imageUrl.startsWith('http') 
                            ? product.imageUrl 
                            : `${API_ORDERS2}/${product.imageUrl}`;
                          window.open(fullImageUrl, '_blank', 'noopener,noreferrer');
                        }}
                        className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
                        title="Xem ảnh lớn"
                      >
                        <ImageIcon size={16} />
                      </button>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-4">
                      <ImageIcon size={48} className="mb-2" />
                      <span className="text-sm text-center">Không có hình ảnh</span>
                    </div>
                  )}
                  
                  {/* Inactive Badge */}
                  {activeTab === "Inactive" && (
                    <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                      <span className="bg-red-500 text-white px-3 py-1 rounded-md text-sm font-medium">
                        Đã xóa
                      </span>
                    </div>
                  )}
                  
                  {/* Stock Status Badge */}
                  <div className={`absolute top-2 left-2 px-2 py-1 rounded-md text-xs font-medium ${
                    product.stockQuantity > 0 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {product.stockQuantity > 0 
                      ? `${product.stockQuantity} sản phẩm` 
                      : 'Hết hàng'}
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-4 flex flex-col flex-grow">
                  <h3 className="font-semibold text-lg mb-1 line-clamp-1" title={product.name}>
                    {product.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2" title={product.description}>
                    {product.description || 'Không có mô tả'}
                  </p>
                  
                  <div className="mt-auto">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-bold text-indigo-600 text-lg">
                        {Number(product.price).toLocaleString()}₫
                      </span>
                      {product.foodCategoryId && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                          {product.categoryName || `Danh mục ${product.foodCategoryId}`}
                        </span>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-2">
                      {activeTab === "active" ? (
                        <>
                          <button
                            onClick={() => navigate(`/restaurant/products/edit/${product.productId}`)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                            title="Chỉnh sửa sản phẩm"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(product.productId, "delete")}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                            title="Xóa sản phẩm"
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleUpdateStatus(product.productId, "restore")}
                          className="flex items-center gap-1 px-3 py-2 bg-green-100 text-green-800 rounded-md hover:bg-green-200 transition-colors w-full justify-center"
                          title="Khôi phục sản phẩm"
                        >
                          <RotateCw size={16} />
                          <span>Khôi phục</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="text-gray-400 mb-4">
              {activeTab === "active" ? (
                <EyeOff size={48} className="mx-auto" />
              ) : (
                <Eye size={48} className="mx-auto" />
              )}
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-1">
              {activeTab === "active" ? "Chưa có sản phẩm nào" : "Không có sản phẩm đã xóa"}
            </h3>
            <p className="text-gray-500">
              {activeTab === "active" 
                ? "Hãy thêm sản phẩm mới để bắt đầu bán hàng" 
                : "Các sản phẩm đã xóa sẽ xuất hiện tại đây"}
            </p>
            {activeTab === "active" && (
              <button
                onClick={() => setIsFormOpen(true)}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Thêm sản phẩm mới
              </button>
            )}
          </div>
        )}
      </div>
    </div>
    </div>
    </div>
  );
};

export default SellerDashboard;
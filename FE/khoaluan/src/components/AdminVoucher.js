import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AdminHeader from './AdminHeader';
import API_BASE_URL from "../config";
import { 
  Ticket, 
  Plus, 
  Pencil, 
  Trash2, 
  Search, 
  Filter, 
  Calendar, 
  X, 
  Check, 
  AlertCircle, 
  ChevronDown, 
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import format from 'date-fns/format';

const API_URL = `${API_BASE_URL}/Admin`;

const VoucherManagement = () => {
  // State variables
  const [vouchers, setVouchers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentVoucher, setCurrentVoucher] = useState(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Form state
  const [formData, setFormData] = useState({
    code: '',
    voucherType: 'ShippingFee',
    discountAmount: 0,
    minimumOrderAmount: 0,
    maximumDiscountAmount: 0,
    usageLimit: 1,
    expirationDate: '',
    status: 'Active',
    applyMode: 'Individual',
    voucherCategoryId: null,
    restaurantId: null,
    productId: null,
    userId: null,
    conditions: [],
    updateConditions: true
  });
  // Confirmation modal state
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [voucherToDelete, setVoucherToDelete] = useState(null);
    
  // Notification state
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  // Fetch vouchers and categories on component mount
  useEffect(() => {
    fetchVouchers();
    fetchCategories();
  }, []);

  // Fetch vouchers with filters applied
  const fetchVouchers = async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/vouchers`;
      
      // Add filters if present
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (categoryFilter) params.append('categoryName', categoryFilter);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include', // Important for sending cookies with the request
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setVouchers(data.vouchers);
      } else {
        setError(data.message || 'Không thể lấy danh sách voucher');
      }
    } catch (err) {
      setError('Lỗi kết nối đến server. Vui lòng thử lại sau.');
      console.error('Error fetching vouchers:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/categories`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCategories(data.categories);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  // Get voucher details
  const getVoucherDetails = async (id) => {
    try {
      const response = await fetch(`${API_URL}/voucher/${id}`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCurrentVoucher(data.voucher);
        
        // Update form data for editing
        setFormData({
          code: data.voucher.code,
          voucherType: data.voucher.voucherType,
          discountAmount: data.voucher.discountAmount,
          minimumOrderAmount: data.voucher.minimumOrderAmount,
          maximumDiscountAmount: data.voucher.maximumDiscountAmount,
          usageLimit: data.voucher.usageLimit,
          expirationDate: formatDateForInput(data.voucher.expirationDate),
          status: data.voucher.status,
          applyMode: data.voucher.applyMode,
          voucherCategoryId: data.voucher.voucherCategory?.voucherCategoryId || '',
          restaurantId: data.voucher.restaurant?.restaurantId || null,
          productId: data.voucher.product?.productId || null,
          userId: data.voucher.user?.userId || null,
          conditions: data.voucher.conditions || [],
          updateConditions: true
        });
        
        setIsEditing(true);
        setShowModal(true);
      } else {
        showNotification(data.message || 'Không thể lấy thông tin voucher', 'error');
      }
    } catch (err) {
      showNotification('Lỗi kết nối đến server', 'error');
      console.error('Error fetching voucher details:', err);
    }
  };

  // Create new voucher
  const createVoucher = async () => {
    try {
      // Lọc bỏ các condition không hợp lệ
      const validConditions = formData.conditions.filter(condition => 
        condition.conditionType && condition.field && condition.operator && condition.value
      );

      const response = await fetch(`${API_URL}/voucher-create`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          conditions: validConditions,
          // Chuyển đổi 0 thành null cho các ID
          restaurantId: formData.restaurantId || null,
          productId: formData.productId || null,
          userId: formData.userId || null
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        showNotification('Tạo voucher thành công', 'success');
        setShowModal(false);
        fetchVouchers();
      } else {
        showNotification(data.message || 'Không thể tạo voucher', 'error');
      }
    } catch (err) {
      showNotification('Lỗi kết nối đến server', 'error');
      console.error('Error creating voucher:', err);
    }
  };

  // Update voucher
  const updateVoucher = async () => {
    try {
      const response = await fetch(`${API_URL}/voucher-update${currentVoucher.voucherId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        showNotification('Cập nhật voucher thành công', 'success');
        setShowModal(false);
        fetchVouchers(); // Refresh the list
      } else {
        showNotification(data.message || 'Không thể cập nhật voucher', 'error');
      }
    } catch (err) {
      showNotification('Lỗi kết nối đến server', 'error');
      console.error('Error updating voucher:', err);
    }
  };

  // Delete voucher
  const deleteVoucher = async (id) => {
    try {
      const response = await fetch(`${API_URL}/voucher-delete/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (data.success) {
        showNotification('Xóa voucher thành công', 'success');
        fetchVouchers(); // Refresh the list
      } else {
        showNotification(data.message || 'Không thể xóa voucher', 'error');
      }
    } catch (err) {
      showNotification('Lỗi kết nối đến server', 'error');
      console.error('Error deleting voucher:', err);
    } finally {
      setShowConfirmation(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Xử lý đặc biệt cho các trường số
    const numericFields = [
      'discountAmount', 'minimumOrderAmount', 'maximumDiscountAmount', 
      'usageLimit', 'voucherCategoryId', 'restaurantId', 'productId', 'userId'
    ];
    
    setFormData(prev => ({
      ...prev,
      [name]: numericFields.includes(name) 
        ? (value === '' ? null : Number(value))
        : value
    }));
  };

  // Handle condition changes
  const handleConditionChange = (index, field, value) => {
    const updatedConditions = [...formData.conditions];
    updatedConditions[index] = { ...updatedConditions[index], [field]: value };
    setFormData({ ...formData, conditions: updatedConditions });
  };

  // Add new condition
  const addCondition = () => {
    setFormData({
      ...formData,
      conditions: [
        ...formData.conditions,
        { conditionType: 'User', field: '', operator: '=', value: '' }
      ]
    });
  };

  // Remove condition
  const removeCondition = (index) => {
    const updatedConditions = [...formData.conditions];
    updatedConditions.splice(index, 1);
    setFormData({ ...formData, conditions: updatedConditions });
  };

  // Reset form to create new voucher
  const openCreateForm = () => {
    setFormData({
      code: '',
      voucherType: 'SHippingFee',
      discountAmount: 0,
      minimumOrderAmount: null,
      maximumDiscountAmount: null,
      usageLimit: 1,
      expirationDate: '',
      status: 'Active',
      applyMode: 'Individual',
      voucherCategoryId: '',
      restaurantId: null,
      productId: null,
      userId: null,
      conditions: [],
      updateConditions: true
    });
    setCurrentVoucher(null);
    setIsEditing(false);
    setShowModal(true);
  };

  // Apply filters
  const applyFilters = () => {
    fetchVouchers();
  };

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setCategoryFilter('');
    fetchVouchers();
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (isEditing) {
      updateVoucher();
    } else {
      createVoucher();
    }
  };

  // Show notification
  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 3000);
  };

  // Format date for display
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return format(date, 'dd/MM/yyyy');
    } catch (error) {
      return dateString;
    }
  };

  // Format date for input field
  const formatDateForInput = (dateString) => {
    try {
      const date = new Date(dateString);
      return format(date, 'yyyy-MM-dd');
    } catch (error) {
      return '';
    }
  };

  // Filter vouchers by search term
  const filteredVouchers = vouchers.filter(voucher => 
    voucher.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentVouchers = filteredVouchers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredVouchers.length / itemsPerPage);

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="bg-white">
      {/* Header tràn full width */}
      <div className="w-full">
        <AdminHeader />
      </div>
    <div className="container mx-auto px-4 py-6">
        
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 md:mb-0">
          <Ticket className="inline-block mr-2 h-6 w-6" />
          Quản lý voucher
        </h1>
        <button
          onClick={openCreateForm}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Thêm voucher mới
        </button>
      </div>
      
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tìm kiếm theo mã
            </label>
            <div className="relative">
              <input
                type="text"
                id="search"
                className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                placeholder="Nhập mã voucher"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
          </div>
          
          <div className="flex-1">
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Trạng thái
            </label>
            <select
              id="status"
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Tất cả</option>
              <option value="Active">Đang hoạt động</option>
              <option value="Inactive">Không hoạt động</option>
              <option value="Expired">Hết hạn</option>
            </select>
          </div>
          
          <div className="flex-1">
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Loại voucher
            </label>
            <select
              id="category"
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">Tất cả</option>
              {categories.map(category => (
                <option key={category.voucherCategoryId} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex-shrink-0 flex items-end">
            <button
              onClick={applyFilters}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors mr-2"
            >
              <Filter className="h-4 w-4 inline mr-1" />
              Lọc
            </button>
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              <X className="h-4 w-4 inline mr-1" />
              Xóa lọc
            </button>
          </div>
        </div>
      </div>
      
      {/* Notification */}
      {notification.show && (
        <div className={`mb-4 p-4 rounded-md ${notification.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
          <div className="flex items-center">
            {notification.type === 'success' ? (
              <Check className="h-5 w-5 mr-2" />
            ) : (
              <AlertCircle className="h-5 w-5 mr-2" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}
      
      {/* Vouchers Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600 dark:text-gray-300">Đang tải...</span>
          </div>
        ) : error ? (
          <div className="p-4 text-center text-red-600">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>{error}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Mã
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Loại
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Giảm giá
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Ngày hết hạn
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Chế độ áp dụng
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Hành động
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {currentVouchers.length > 0 ? (
                    currentVouchers.map((voucher) => (
                      <tr key={voucher.voucherId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {voucher.code}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {voucher.voucherType === 'Percentage' ? 'Phần trăm' : 'Số tiền cố định'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {voucher.voucherType === 'Percentage' 
                            ? `${voucher.discountAmount}%` 
                            : `${voucher.discountAmount.toLocaleString()}đ`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {formatDate(voucher.expirationDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            voucher.status === 'Active' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
                              : voucher.status === 'Inactive' 
                                ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' 
                                : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                          }`}>
                            {voucher.status === 'Active' 
                              ? 'Đang hoạt động' 
                              : voucher.status === 'Inactive' 
                                ? 'Không hoạt động' 
                                : 'Hết hạn'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {voucher.applyMode === 'Global' ? 'Toàn cầu' : 
                           voucher.applyMode === 'RestaurantSpecific' ? 'Nhà hàng cụ thể' : 
                           voucher.applyMode === 'ProductSpecific' ? 'Sản phẩm cụ thể' : 
                           'Người dùng cụ thể'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => getVoucherDetails(voucher.voucherId)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                          >
                            <Pencil className="h-4 w-4 inline" /> Sửa
                          </button>
                          <button
                            onClick={() => {
                              setVoucherToDelete(voucher.voucherId);
                              setShowConfirmation(true);
                            }}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4 inline" /> Xóa
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                        Không có voucher nào được tìm thấy
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {filteredVouchers.length > itemsPerPage && (
              <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => paginate(currentPage > 1 ? currentPage - 1 : 1)}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md ${
                      currentPage === 1
                        ? 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700'
                        : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    Trước
                  </button>
                  <button
                    onClick={() => paginate(currentPage < totalPages ? currentPage + 1 : totalPages)}
                    disabled={currentPage === totalPages}
                    className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md ${
                      currentPage === totalPages
                        ? 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700'
                        : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    Sau
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Hiển thị <span className="font-medium">{indexOfFirstItem + 1}</span> đến{' '}
                      <span className="font-medium">
                        {indexOfLastItem > filteredVouchers.length ? filteredVouchers.length : indexOfLastItem}
                      </span>{' '}
                      trong <span className="font-medium">{filteredVouchers.length}</span> kết quả
                    </p>
                  </div>
                  <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                      <button
                        onClick={() => paginate(currentPage > 1 ? currentPage - 1 : 1)}
                        disabled={currentPage === 1}
                        className={`relative inline-flex items-center rounded-l-md px-2 py-2 ${
                          currentPage === 1
                            ? 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700'
                            : 'text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                        } focus:z-20`}
                      >
                        <span className="sr-only">Trước</span>
                        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                      </button>
                      
                      {/* Page numbers */}
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                        <button
                          key={number}
                          onClick={() => paginate(number)}
                          className={`relative inline-flex items-center px-4 py-2 ${
                            currentPage === number
                              ? 'z-10 bg-blue-50 dark:bg-blue-900 border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-300'
                              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                          } focus:z-20`}
                        >
                          {number}
                        </button>
                      ))}
                      
                      <button
                        onClick={() => paginate(currentPage < totalPages ? currentPage + 1 : totalPages)}
                        disabled={currentPage === totalPages}
                        className={`relative inline-flex items-center rounded-r-md px-2 py-2 ${
                          currentPage === totalPages
                            ? 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700'
                            : 'text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                        } focus:z-20`}
                      >
                        <span className="sr-only">Sau</span>
                        <ChevronRight className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      
      {/* Create/Edit Modal */}
      {showModal && (
  <div className="fixed inset-0 overflow-y-auto z-50">
    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div className="fixed inset-0 transition-opacity" aria-hidden="true">
        <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
      </div>
      <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
      <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
        <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
            {isEditing ? 'Chỉnh sửa Voucher' : 'Tạo Voucher Mới'}
          </h3>
          
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Code */}
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Mã Voucher <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="code"
                  name="code"
                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                  value={formData.code}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              {/* Voucher Type */}
              <div>
                <label htmlFor="voucherType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Loại Voucher <span className="text-red-500">*</span>
                </label>
                <select
                  id="voucherType"
                  name="voucherType"
                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                  value={formData.voucherType}
                  onChange={handleInputChange}
                  required
                >
                  <option value="Percentage">Phần trăm</option>
                  <option value="FixedAmount">Số tiền cố định</option>
                  <option value="ShippingFee">Phí vận chuyển</option>
                </select>
              </div>
              
              {/* Discount Amount */}
              <div>
                <label htmlFor="discountAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {formData.voucherType === 'Percentage' ? 'Phần trăm giảm' : 'Số tiền giảm'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="discountAmount"
                  name="discountAmount"
                  min="0"
                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                  value={formData.discountAmount}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              {/* Minimum Order Amount */}
              <div>
                <label htmlFor="minimumOrderAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Đơn hàng tối thiểu
                </label>
                <input
                  type="number"
                  id="minimumOrderAmount"
                  name="minimumOrderAmount"
                  min="0"
                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                  value={formData.minimumOrderAmount || ''}
                  onChange={handleInputChange}
                />
              </div>
              
              {/* Maximum Discount Amount (for percentage) */}
              {formData.voucherType === 'Percentage' && (
                <div>
                  <label htmlFor="maximumDiscountAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Giảm tối đa
                  </label>
                  <input
                    type="number"
                    id="maximumDiscountAmount"
                    name="maximumDiscountAmount"
                    min="0"
                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                    value={formData.maximumDiscountAmount || ''}
                    onChange={handleInputChange}
                  />
                </div>
              )}
              
              {/* Usage Limit */}
              <div>
                <label htmlFor="usageLimit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Giới hạn sử dụng <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="usageLimit"
                  name="usageLimit"
                  min="1"
                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                  value={formData.usageLimit}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              {/* Expiration Date */}
              <div>
                <label htmlFor="expirationDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ngày hết hạn <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    id="expirationDate"
                    name="expirationDate"
                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                    value={formData.expirationDate}
                    onChange={handleInputChange}
                    required
                    min={formatDateForInput(new Date())}
                  />
                  <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>
              </div>
              
              {/* Status */}
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Trạng thái <span className="text-red-500">*</span>
                </label>
                <select
                  id="status"
                  name="status"
                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                  value={formData.status}
                  onChange={handleInputChange}
                  required
                >
                  <option value="Active">Hoạt động</option>
                  <option value="Inactive">Không hoạt động</option>
                </select>
              </div>
              
              {/* Apply Mode */}
              <div>
                <label htmlFor="applyMode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Chế độ áp dụng <span className="text-red-500">*</span>
                </label>
                <select
                  id="applyMode"
                  name="applyMode"
                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                  value={formData.applyMode}
                  onChange={handleInputChange}
                  required
                >
                  <option value="Global">Toàn cầu</option>
                  <option value="Individual">Cá nhân</option>
                  <option value="RestaurantSpecific">Nhà hàng cụ thể</option>
                  <option value="ProductSpecific">Sản phẩm cụ thể</option>
                  <option value="UserSpecific">Người dùng cụ thể</option>
                </select>
              </div>
              
              {/* Voucher Category */}
              <div>
                <label htmlFor="voucherCategoryId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Danh mục voucher
                </label>
                <select
                  id="voucherCategoryId"
                  name="voucherCategoryId"
                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                  value={formData.voucherCategoryId || ''}
                  onChange={handleInputChange}
                >
                  <option value="">Chọn danh mục</option>
                  {categories.map(category => (
                    <option key={category.voucherCategoryId} value={category.voucherCategoryId}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="restaurantId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  ID Nhà hàng
                </label>
                <input
                  type="number"
                  id="restaurantId"
                  name="restaurantId"
                  min="0"
                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                  value={formData.restaurantId || ''}
                  onChange={handleInputChange}
                  placeholder="Để trống nếu không áp dụng"
                />
              </div>
              
              <div>
                <label htmlFor="productId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  ID Sản phẩm
                </label>
                <input
                  type="number"
                  id="productId"
                  name="productId"
                  min="0"
                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                  value={formData.productId || ''}
                  onChange={handleInputChange}
                  placeholder="Để trống nếu không áp dụng"
                />
              </div>
              
              <div>
                <label htmlFor="userId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  ID Người dùng
                </label>
                <input
                  type="number"
                  id="userId"
                  name="userId"
                  min="0"
                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                  value={formData.userId || ''}
                  onChange={handleInputChange}
                  placeholder="Để trống nếu không áp dụng"
                />
              </div>
            </div>
            {/* Conditions Section */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Điều kiện áp dụng
                </h4>
                <button
                  type="button"
                  onClick={addCondition}
                  className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                >
                  <Plus className="h-4 w-4 mr-1" /> Thêm điều kiện
                </button>
              </div>
              
              {formData.conditions.length > 0 ? (
                <div className="space-y-3">
                  {formData.conditions.map((condition, index) => (
                    <div key={index} className="flex flex-col md:flex-row gap-2 items-start md:items-end">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Loại điều kiện</label>
                        <select
                          className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                          value={condition.conditionType}
                          onChange={(e) => handleConditionChange(index, 'conditionType', e.target.value)}
                        >
                          <option value="User">Người dùng</option>
                          <option value="Order">Đơn hàng</option>
                          <option value="Product">Sản phẩm</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Trường</label>
                        <input
                          type="text"
                          className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                          value={condition.field}
                          onChange={(e) => handleConditionChange(index, 'field', e.target.value)}
                          placeholder="Ví dụ: email, totalAmount"
                        />
                      </div>
                      <div className="w-20">
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Toán tử</label>
                        <select
                          className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                          value={condition.operator}
                          onChange={(e) => handleConditionChange(index, 'operator', e.target.value)}
                        >
                          <option value="=">=</option>
                          <option value=">">{'>'}</option>
                          <option value="<">{'<'}</option>
                          <option value=">=">{'>='}</option>
                          <option value="<=">{'<='}</option>
                          <option value="!=">{'!='}</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Giá trị</label>
                        <input
                          type="text"
                          className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                          value={condition.value}
                          onChange={(e) => handleConditionChange(index, 'value', e.target.value)}
                          placeholder="Ví dụ: 100000, user@example.com"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCondition(index)}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
                  Chưa có điều kiện nào được thêm
                </div>
              )}
            </div>
            
            {/* Form Actions */}
            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-lg">
              <button
                type="submit"
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
              >
                {isEditing ? 'Cập nhật' : 'Tạo mới'}
              </button>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-600 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Hủy bỏ
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
)}

{/* Confirmation Modal */}
{showConfirmation && (
  <div className="fixed inset-0 overflow-y-auto z-50">
    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div className="fixed inset-0 transition-opacity" aria-hidden="true">
        <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
      </div>
      <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
      <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
        <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div className="sm:flex sm:items-start">
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 sm:mx-0 sm:h-10 sm:w-10">
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                Xác nhận xóa voucher
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Bạn có chắc chắn muốn xóa voucher này? Hành động này không thể hoàn tác.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-lg">
          <button
            type="button"
            onClick={() => {
              deleteVoucher(voucherToDelete);
              setVoucherToDelete(null);
            }}
            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
          >
            Xóa
          </button>
          <button
            type="button"
            onClick={() => {
              setShowConfirmation(false);
              setVoucherToDelete(null);
            }}
            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-600 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
          >
            Hủy bỏ
          </button>
        </div>
      </div>
    </div>
  </div>
  
)} 
</div>
</div>
)}
export default VoucherManagement;

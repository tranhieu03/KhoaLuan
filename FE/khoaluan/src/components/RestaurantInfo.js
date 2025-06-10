import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapPin, Phone, Store, Edit, Save, X, RefreshCw } from 'lucide-react';
import MapComponent from './MapComponent';
import 'leaflet/dist/leaflet.css';
import RestaurantHeader from './RestaurantHeader';
import API_BASE_URL from "../config";

const RestaurantInfo = () => {
  const [restaurant, setRestaurant] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [position, setPosition] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [newRestaurantImage, setNewRestaurantImage] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phoneNumber: '',
  });

  // Fetch restaurant data
  const fetchRestaurantData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE_URL}//Restaurant/my-restaurant`);
      setRestaurant(response.data);
      
      // Initialize position from restaurant data
      if (response.data.latitude && response.data.longitude) {
        setPosition({
          lat: response.data.latitude,
          lon: response.data.longitude
        });
      }

      // Initialize form data
      setFormData({
        name: response.data.name || '',
        address: response.data.address || '',
        phoneNumber: response.data.phoneNumber || '',
      });

      setLoading(false);
    } catch (err) {
      setLoading(false);
      if (err.response?.status === 404) {
        setError("Bạn chưa có nhà hàng đăng ký.");
      } else if (err.response?.status === 401) {
        setError("Bạn không có quyền truy cập thông tin này.");
      } else {
        setError("Có lỗi xảy ra khi tải thông tin nhà hàng.");
      }
      console.error("Error fetching restaurant:", err);
    }
  };

  // Load restaurant data on component mount
  useEffect(() => {
    fetchRestaurantData();
  }, []);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle restaurant image change
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewRestaurantImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Toggle edit mode
  const toggleEditMode = () => {
    if (isEditing) {
      // Cancel editing - reset form to original values
      setFormData({
        name: restaurant.name || '',
        address: restaurant.address || '',
        phoneNumber: restaurant.phoneNumber || '',
      });
      setPosition({
        lat: restaurant.latitude,
        lon: restaurant.longitude
      });
      setImagePreview(null);
      setNewRestaurantImage(null);
      setMessage({ text: '', type: '' });
    }
    setIsEditing(!isEditing);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      const updateFormData = new FormData();
      updateFormData.append('name', formData.name);
      updateFormData.append('address', formData.address);
      updateFormData.append('phoneNumber', formData.phoneNumber);
      
      if (newRestaurantImage) {
        updateFormData.append('restaurantImage', newRestaurantImage);
      }

      const response = await axios.put(
        `${API_BASE_URL}//Restaurant/update`,
        updateFormData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setMessage({ text: 'Cập nhật thông tin nhà hàng thành công!', type: 'success' });
      setIsEditing(false);
      fetchRestaurantData(); // Refresh data
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật thông tin nhà hàng';
      setMessage({ text: errorMessage, type: 'error' });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Custom message component
  const MessageAlert = ({ message }) => {
    if (!message.text) return null;

    let bgColor = 'bg-gray-100';
    if (message.type === 'success') bgColor = 'bg-green-100 border-green-500 text-green-700';
    if (message.type === 'error') bgColor = 'bg-red-100 border-red-500 text-red-700';
    if (message.type === 'warning') bgColor = 'bg-yellow-100 border-yellow-500 text-yellow-700';

    return (
      <div className={`border-l-4 p-4 mb-4 ${bgColor}`} role="alert">
        <p>{message.text}</p>
      </div>
    );
  };

  // Prepare map locations
  const mapLocations = position ? [{ lat: position.lat, lon: position.lon }] : [];

  // Loading state
  if (loading && !restaurant) {
    return (
      <div className="max-w-6xl mx-auto p-4 text-center">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
        <p className="mt-4">Đang tải thông tin nhà hàng...</p>
      </div>
    );
  }

  // Error state
  if (error && !restaurant) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
          <p className="font-bold">Lỗi</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <RestaurantHeader/>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Quản Lý Nhà Hàng</h1>
        <button
          onClick={toggleEditMode}
          className={`flex items-center px-4 py-2 rounded-lg ${
            isEditing 
              ? "bg-gray-500 hover:bg-gray-600 text-white" 
              : "bg-blue-500 hover:bg-blue-600 text-white"
          }`}
        >
          {isEditing ? (
            <>
              <X size={18} className="mr-1" /> Hủy
            </>
          ) : (
            <>
              <Edit size={18} className="mr-1" /> Chỉnh Sửa
            </>
          )}
        </button>
      </div>

      {message.text && <MessageAlert message={message} />}

      {restaurant && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            {isEditing ? (
              <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Tên Nhà Hàng*
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Địa Chỉ*
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Tọa độ nhà hàng sẽ được xác định tự động dựa vào địa chỉ
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Số Điện Thoại*
                  </label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Hình Ảnh Nhà Hàng
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <div className="mt-2 flex items-center">
                    {imagePreview ? (
                      <img 
                        src={imagePreview} 
                        alt="Xem trước" 
                        className="h-32 object-cover rounded"
                      />
                    ) : restaurant.restaurantImage ? (
                      <div className="relative">
                        <img 
                          src={`https://localhost:44308${restaurant.restaurantImage}`} 
                          alt={restaurant.name} 
                          className="h-32 object-cover rounded"
                        />
                        <p className="text-xs text-gray-500 mt-1">Hình ảnh hiện tại</p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Chưa có hình ảnh</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="submit"
                    className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-6 rounded focus:outline-none focus:shadow-outline flex items-center justify-center w-full"
                    disabled={loading}
                  >
                    {loading ? (
                      <RefreshCw size={18} className="mr-2 animate-spin" />
                    ) : (
                      <Save size={18} className="mr-2" />
                    )}
                    {loading ? 'Đang Cập Nhật...' : 'Lưu Thay Đổi'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-start mb-6">
                  {restaurant.restaurantImage ? (
                    <img 
                      src={`https://localhost:44308${restaurant.restaurantImage}`} 
                      alt={restaurant.name} 
                      className="h-32 w-32 object-cover rounded-lg mr-4"
                    />
                  ) : (
                    <div className="h-32 w-32 bg-gray-200 rounded-lg mr-4 flex items-center justify-center">
                      <Store size={48} className="text-gray-400" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-bold">{restaurant.name}</h2>
                    <p className="text-gray-600">{restaurant.status === "Active" ? "Đang hoạt động" : restaurant.status === "Pending" ? "Đang chờ duyệt" : "Bị từ chối"}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-start mb-2">
                    <MapPin size={18} className="text-gray-500 mr-2 mt-1" />
                    <p>{restaurant.address || "Chưa có địa chỉ"}</p>
                  </div>
                  <div className="flex items-start">
                    <Phone size={18} className="text-gray-500 mr-2 mt-1" />
                    <p>{restaurant.phoneNumber || "Chưa có số điện thoại"}</p>
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <h3 className="text-lg font-semibold mb-2">Thông tin chủ nhà hàng</h3>
                  <p><span className="font-medium">Tên:</span> {restaurant.sellerName}</p>
                  <p><span className="font-medium">Email:</span> {restaurant.sellerEmail}</p>
                  <p><span className="font-medium">Điện thoại:</span> {restaurant.sellerPhone}</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white p-4 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold mb-4">Vị Trí Nhà Hàng</h2>
            {position ? (
              <p className="text-sm text-gray-600 mb-2">
                Vĩ độ: {position.lat.toFixed(6)}, Kinh độ: {position.lon.toFixed(6)}
              </p>
            ) : (
              <p className="text-sm text-gray-600 mb-2">
                Chưa có vị trí
              </p>
            )}
            <div className="h-96 rounded-lg overflow-hidden border border-gray-300">
              <MapComponent 
                locations={mapLocations} 
                center={position ? [position.lat, position.lon] : [10.8231, 106.6297]}
                interactive={false}
              />
            </div>
            {isEditing && (
              <p className="text-xs text-gray-500 mt-2">
                Vị trí nhà hàng sẽ được cập nhật tự động dựa trên địa chỉ sau khi lưu thay đổi
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RestaurantInfo;
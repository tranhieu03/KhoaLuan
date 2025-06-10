import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import MapComponent from './MapComponent'; // Import MapComponent
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import API_BASE_URL from "../config";

// Sửa lỗi biểu tượng marker mặc định của Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const CreateRestaurant = () => {
  const [restaurant, setRestaurant] = useState({
    name: '',
    address: '',
    phoneNumber: '',
  });
  const [position, setPosition] = useState(null);
  const [frontIdImage, setFrontIdImage] = useState(null);
  const [backIdImage, setBackIdImage] = useState(null);
  const [businessLicenseImage, setBusinessLicenseImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState({
    frontId: null,
    backId: null,
    businessLicense: null,
  });
  const [message, setMessage] = useState({ text: '', type: '' });

  // Hàm xử lý thay đổi trường input
  const handleChange = (e) => {
    const { name, value } = e.target;
    setRestaurant((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Hàm xử lý thay đổi file ảnh
  const handleFileChange = (e, setImage, previewKey) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview((prev) => ({
          ...prev,
          [previewKey]: reader.result,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Hàm xử lý tìm vị trí từ địa chỉ (geocoding)
  const handleFindLocation = async () => {
    if (!restaurant.address) {
      setMessage({ text: 'Vui lòng nhập địa chỉ trước khi tìm vị trí', type: 'error' });
      return;
    }

    try {
      setLoading(true);
      
      // Cách 1: Sử dụng API thông qua backend của bạn (ưu tiên)
      try {
        const response = await axios.get(`https://localhost:44308/api/Goong/get-coordinates?address=${encodeURIComponent(restaurant.address)}`);
        if (response.data) {
          setPosition({ lat: response.data.latitude, lon: response.data.longitude });
          setMessage({ text: 'Đã tìm thấy vị trí', type: 'success' });
          setLoading(false);
          return;
        }
      } catch (error) {
        console.log("Backend geocoding không khả dụng, sử dụng phương án dự phòng");
      }

      // Cách 2: Sử dụng Nominatim
      const nominatimResponse = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(restaurant.address)}`, 
        {
          withCredentials: true,
          headers: {
            'Accept': 'application/json'
          }
        }
      );

      if (nominatimResponse.data && nominatimResponse.data.length > 0) {
        const { lat, lon } = nominatimResponse.data[0];
        setPosition({ lat: parseFloat(lat), lon: parseFloat(lon) });
        setMessage({ text: 'Đã tìm thấy vị trí', type: 'success' });
      } else {
        setMessage({ text: 'Không tìm thấy vị trí từ địa chỉ đã nhập', type: 'warning' });
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      setMessage({ 
        text: 'Có lỗi xảy ra khi tìm vị trí. Vui lòng click trực tiếp trên bản đồ để chọn vị trí nhà hàng.', 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Hàm xử lý khi click vào bản đồ
  const handleMapClick = (e) => {
    setPosition({ lat: e.latlng.lat, lon: e.latlng.lng });
  };

  // Hàm xử lý gửi form
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!position) {
      setMessage({ text: 'Vui lòng chọn vị trí nhà hàng trên bản đồ', type: 'error' });
      return;
    }

    if (!frontIdImage || !backIdImage || !businessLicenseImage) {
      setMessage({ text: 'Vui lòng upload đầy đủ các hình ảnh yêu cầu', type: 'error' });
      return;
    }

    const formData = new FormData();
    formData.append('name', restaurant.name);
    formData.append('address', restaurant.address);
    formData.append('phoneNumber', restaurant.phoneNumber);
    formData.append('latitude', position.lat);
    formData.append('longitude', position.lon);
    formData.append('frontIdCardImage', frontIdImage);
    formData.append('backIdCardImage', backIdImage);
    formData.append('businessLicenseImage', businessLicenseImage);

    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE_URL}//Restaurant/create`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setMessage({ text: 'Đăng ký nhà hàng thành công! Vui lòng đợi phê duyệt.', type: 'success' });
      // Reset form sau khi đăng ký thành công
      setRestaurant({ name: '', address: '', phoneNumber: '' });
      setPosition(null);
      setFrontIdImage(null);
      setBackIdImage(null);
      setBusinessLicenseImage(null);
      setImagePreview({ frontId: null, backId: null, businessLicense: null });
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Có lỗi xảy ra khi đăng ký nhà hàng';
      setMessage({ text: errorMessage, type: 'error' });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Component thông báo tùy chỉnh
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

  // Chuẩn bị dữ liệu vị trí cho MapComponent
  const mapLocations = position ? [{ lat: position.lat, lon: position.lon }] : [];

  return (
    <div className="max-w-6xl mx-auto p-4">
      {message.text && <MessageAlert message={message} />}
      <h1 className="text-2xl font-bold mb-6">Đăng Ký Nhà Hàng</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Tên Nhà Hàng*
              </label>
              <input
                type="text"
                name="name"
                value={restaurant.name}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Địa Chỉ*
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="address"
                  value={restaurant.address}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
                <button
                  type="button"
                  onClick={handleFindLocation}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  disabled={loading}
                >
                  {loading ? 'Đang tìm...' : 'Tìm'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Hoặc bạn có thể click trực tiếp trên bản đồ để chọn vị trí
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Số Điện Thoại*
              </label>
              <input
                type="tel"
                name="phoneNumber"
                value={restaurant.phoneNumber}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                CMND/CCCD Mặt Trước*
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, setFrontIdImage, 'frontId')}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                required
              />
              {imagePreview.frontId && (
                <img src={imagePreview.frontId} alt="Front ID Preview" className="mt-2 h-32 object-contain" />
              )}
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                CMND/CCCD Mặt Sau*
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, setBackIdImage, 'backId')}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                required
              />
              {imagePreview.backId && (
                <img src={imagePreview.backId} alt="Back ID Preview" className="mt-2 h-32 object-contain" />
              )}
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Giấy Phép Kinh Doanh*
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, setBusinessLicenseImage, 'businessLicense')}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                required
              />
              {imagePreview.businessLicense && (
                <img src={imagePreview.businessLicense} alt="Business License Preview" className="mt-2 h-32 object-contain" />
              )}
            </div>

            <div className="flex items-center justify-between">
              <button
                type="submit"
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-6 rounded focus:outline-none focus:shadow-outline w-full"
                disabled={loading}
              >
                {loading ? 'Đang Xử Lý...' : 'Đăng Ký Nhà Hàng'}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-4">Vị Trí Nhà Hàng</h2>
          <p className="text-sm text-gray-600 mb-2">
            {position
              ? `Vĩ độ: ${position.lat.toFixed(6)}, Kinh độ: ${position.lon.toFixed(6)}`
              : 'Click vào bản đồ để chọn vị trí'}
          </p>
          <div className="h-96 rounded-lg overflow-hidden border border-gray-300">
            <MapComponent 
              locations={mapLocations} 
              onMapClick={handleMapClick} 
              center={position ? [position.lat, position.lon] : [10.8231, 106.6297]}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Bạn có thể zoom và di chuyển bản đồ để tìm vị trí chính xác hơn
          </p>
        </div>
      </div>
    </div>
  );
};

export default CreateRestaurant;
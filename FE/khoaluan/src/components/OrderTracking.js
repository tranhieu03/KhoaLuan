import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { MapPin, Truck, Clock, Map, Package, Store, Home, Info, X, RefreshCw } from 'lucide-react';
import LeafletMap from './LeafletMap';
import API_BASE_URL from "../config";

const OrderTracking = ({ orderId, deliveryAddress }) => {
  const [trackingData, setTrackingData] = useState({
    orderInfo: null,
    currentShipperLocation: null,
    fullTrackingHistory: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showMap, setShowMap] = useState(false);
  
  const fetchTrackingData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_BASE_URL}/Order/delivery-tracking/${orderId}`,
        { 
          withCredentials: true,
          timeout: 10000
        }
      );
      
      if (response.data) {
        setTrackingData({
          orderInfo: {
            orderId: response.data.orderId,
            status: response.data.status,
            restaurantLocation: response.data.restaurantLocation,
            customerLocation: response.data.customerLocation
          },
          currentShipperLocation: response.data.currentShipperLocation,
          fullTrackingHistory: response.data.fullTrackingHistory || []
        });
      }
      setError('');
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu:', err);
      setError(err.response?.data?.message || 'Không thể tải dữ liệu theo dõi đơn hàng');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchTrackingData();
    const interval = setInterval(fetchTrackingData, 30000);
    return () => clearInterval(interval);
  }, [fetchTrackingData]);

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return isNaN(date) ? "N/A" : new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  const getTimeElapsed = (dateString) => {
    if (!dateString) return 'N/A';
    const lastUpdate = new Date(dateString);
    const now = new Date();
    const diffMs = now - lastUpdate;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs} giờ trước`;
    
    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays} ngày trước`;
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'Pending': return 'Đơn hàng đang chờ xác nhận';
      case 'ReadyForDelivery': return 'Đơn hàng sẵn sàng giao';
      case 'InDelivery': return 'Đang giao hàng';
      case 'Delivered': return 'Đã giao hàng';
      case 'Cancelled': return 'Đã hủy';
      default: return status;
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'ReadyForDelivery': return 'bg-blue-100 text-blue-800';
      case 'InDelivery': return 'bg-indigo-100 text-indigo-800';
      case 'Delivered': return 'bg-green-100 text-green-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const toggleMap = () => {
    setShowMap(prev => !prev);
  };

  if (loading) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50 mt-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-2">Theo dõi đơn hàng</h2>
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border rounded-lg bg-red-50 mt-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-2">Theo dõi đơn hàng</h2>
        <p className="text-red-600">{error}</p>
        <button 
          onClick={fetchTrackingData}
          className="mt-2 px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center text-sm"
        >
          <RefreshCw className="w-4 h-4 mr-1" /> Thử lại
        </button>
      </div>
    );
  }

  if (!trackingData.orderInfo) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50 mt-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-2">Theo dõi đơn hàng</h2>
        <p>Chưa có dữ liệu theo dõi cho đơn hàng này</p>
      </div>
    );
  }

  const { orderInfo, currentShipperLocation, fullTrackingHistory } = trackingData;

  return (
    <div className="p-4 border rounded-lg bg-gray-50 mt-6 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Theo dõi đơn hàng #{orderInfo.orderId}</h2>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(orderInfo.status)}`}>
          {getStatusText(orderInfo.status)}
        </span>
      </div>
      
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        {/* Vị trí nhà hàng */}
        <div className="bg-white p-3 rounded-lg shadow-sm">
          <div className="flex items-center text-gray-700 mb-2">
            <Store className="w-5 h-5 text-blue-500 mr-2" />
            <p className="font-medium">Vị trí nhà hàng</p>
          </div>
          <p className="text-sm text-gray-600 mb-1">{orderInfo.restaurantLocation?.name || 'N/A'}</p>
          <p className="text-sm text-gray-600 mb-1">{orderInfo.restaurantLocation?.address || 'N/A'}</p>
          <p className="text-xs text-gray-500">
            <MapPin className="inline w-3 h-3 mr-1 text-red-500" />
            {orderInfo.restaurantLocation?.lattitude || 'N/A'}, {orderInfo.restaurantLocation?.longtitude || 'N/A'}
          </p>
        </div>
        
        {/* Vị trí giao hàng */}
        <div className="bg-white p-3 rounded-lg shadow-sm">
          <div className="flex items-center text-gray-700 mb-2">
            <Home className="w-5 h-5 text-green-500 mr-2" />
            <p className="font-medium">Địa chỉ giao hàng</p>
          </div>
          <p className="text-sm text-gray-600 mb-1">{orderInfo.customerLocation?.address || deliveryAddress || 'N/A'}</p>
          {orderInfo.customerLocation?.latitude && (
            <p className="text-xs text-gray-500">
              <MapPin className="inline w-3 h-3 mr-1 text-red-500" />
              {orderInfo.customerLocation.latitude}, {orderInfo.customerLocation.longitude}
            </p>
          )}
        </div>
      </div>
      
      {/* Vị trí hiện tại của tài xế */}
      {currentShipperLocation && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <Truck className="w-5 h-5 text-indigo-500 mr-2" />
              <p className="font-medium">Vị trí hiện tại của tài xế</p>
            </div>
            <span className="text-sm text-gray-500 flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              {getTimeElapsed(currentShipperLocation.trackingTime)}
            </span>
          </div>
          
          <div className="bg-white p-3 rounded-lg shadow-sm mb-3">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center">
                <Package className="w-5 h-5 text-blue-500 mr-2" />
                <p className="font-medium">
                  {currentShipperLocation.trackingType === 'Start' ? 'Đã bắt đầu giao hàng' : 
                   currentShipperLocation.trackingType === 'Delivered' ? 'Đã giao hàng thành công' : 
                   'Đang trên đường giao hàng'}
                </p>
              </div>
              <button 
                onClick={toggleMap}
                className="flex items-center text-blue-600 hover:text-blue-800 text-sm px-2 py-1 border border-blue-300 rounded-md"
              >
                {showMap ? <X className="w-4 h-4 mr-1" /> : <Map className="w-4 h-4 mr-1" />}
                {showMap ? 'Ẩn bản đồ' : 'Xem bản đồ'}
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-2">
              <MapPin className="inline w-4 h-4 mr-1 text-red-500" />
              Tọa độ: {parseFloat(currentShipperLocation.latitude).toFixed(6)}, {parseFloat(currentShipperLocation.longitude).toFixed(6)}
            </p>
            
            {showMap && (
  <div className="mt-3 h-64 rounded-lg overflow-hidden">
    <LeafletMap 
      driverLocation={{
        lat: parseFloat(currentShipperLocation.latitude),
        lng: parseFloat(currentShipperLocation.longitude)
      }}
      restaurantLocation={orderInfo.restaurantLocation ? {
        lat: parseFloat(orderInfo.restaurantLocation.lattitude),
        lng: parseFloat(orderInfo.restaurantLocation.longtitude),
        name: orderInfo.restaurantLocation.name
      } : null}
      destination={{
        lat: parseFloat(orderInfo.customerLocation?.latitude || 0),
        lng: parseFloat(orderInfo.customerLocation?.longitude || 0),
        address: orderInfo.customerLocation?.address || deliveryAddress
      }}
    />
  </div>
)}
          </div>
        </div>
      )}
      
      {/* Lịch sử di chuyển */}
      {fullTrackingHistory && fullTrackingHistory.length > 0 && (
        <div>
          <div className="flex items-center mb-2">
            <Info className="w-5 h-5 text-gray-500 mr-2" />
            <p className="font-medium">Lịch sử di chuyển</p>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2 bg-white p-3 rounded-lg shadow-sm">
            {fullTrackingHistory
              .sort((a, b) => new Date(b.trackingTime) - new Date(a.trackingTime))
              .map((point, index) => (
                <div key={`${point.trackingId || index}`} className="flex items-start relative pl-4">
                  <div className="absolute left-0 top-4 bottom-0 w-0.5 bg-gray-200"></div>
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mt-1 -ml-4">
                    <MapPin className="w-3 h-3 text-blue-500" />
                  </div>
                  <div className="ml-3 flex-1">
                    <div className="bg-gray-50 p-3 rounded-lg shadow-sm">
                      <p className="font-medium">
                        {point.trackingType === 'Start' ? 'Bắt đầu giao hàng' : 
                         point.trackingType === 'Delivered' ? 'Giao hàng thành công' : 
                         'Cập nhật vị trí'}
                      </p>
                      <p className="text-sm text-gray-600 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatTime(point.trackingTime)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {parseFloat(point.latitude).toFixed(6)}, {parseFloat(point.longitude).toFixed(6)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderTracking;
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import OrderChat from './OrderChat';
import API_BASE_URL from "../config";
import { 
  ChevronLeft, 
  Clock, 
  MapPin, 
  CheckCircle, 
  Truck, 
  CreditCard, 
  Package,
  User,
  Phone,
  Navigation,
  AlertCircle,
  MessageCircle // Added MessageCircle icon for chat tab
} from 'lucide-react';
import axios from 'axios';
import OrderTracking from './OrderTracking';
import OrderStatusStepper from './OrderStatusStepper';
import RestaurantCard from './RestaurantCard';
import Header from './Header';

const OrderDetailsPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_BASE_URL}/Order/order-details/${orderId}`,
        { withCredentials: true }
      );
      
      if (response.data) {
        setOrder(response.data);
      }
    } catch (err) {
      setError("Không thể lấy thông tin đơn hàng");
      console.error("Error fetching order details:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return isNaN(date) ? "N/A" : new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getStatusColor = (status) => {
    switch(status.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'delivering': 
      case 'indelivery': return 'bg-blue-100 text-blue-800';
      case 'preparing': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Check if chat is available (only for orders in delivery)
  const isChatAvailable = () => {
    if (!order) return false;
    return order.status.toLowerCase() === 'indelivery' || order.status.toLowerCase() === 'delivering';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md p-6 bg-white rounded-lg shadow-md text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Lỗi khi tải đơn hàng</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-white">
        {/* Header tràn full width */}
        <div className="w-full">
          <Header />
        </div>
        <div className="bg-white shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 rounded-full hover:bg-gray-100 mr-2"
            >
              <ChevronLeft className="w-6 h-6 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-800">Đơn hàng #{order.orderId}</h1>
            <span className={`ml-auto px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
              {order.status}
            </span>
          </div>
        </div>
      </div>

      {/* Progress Stepper */}
      <div className="max-w-4xl mx-auto px-4 mt-6">
        <OrderStatusStepper 
          currentStatus={order.status} 
          orderDate={order.orderDate} 
          estimatedDelivery={order.estimatedDeliveryTime}
        />
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 mt-6">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            className={`px-4 py-2 font-medium text-sm ${activeTab === 'details' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('details')}
          >
            Chi tiết
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm ${activeTab === 'tracking' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('tracking')}
          >
            Theo dõi
          </button>
          {isChatAvailable() && (
            <button
              className={`px-4 py-2 font-medium text-sm flex items-center ${activeTab === 'chat' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('chat')}
            >
              <MessageCircle className="w-4 h-4 mr-1" />
              Chat
            </button>
          )}
        </div>

        {/* Tab Content */}
        {activeTab === 'details' ? (
          <div className="space-y-6">
            {/* Restaurant Info */}
            <RestaurantCard 
              name={order.restaurantName} 
              address={order.restaurantAddress}
              image={order.restaurantImage}
              rating={order.restaurantRating}
            />

            {/* Order Items */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-800 flex items-center">
                  <Package className="w-5 h-5 mr-2 text-blue-500" />
                  Chi tiết món ăn
                </h2>
              </div>
              <div className="divide-y divide-gray-200">
                {order.orderDetails.map((item, index) => (
                  <div key={index} className="p-4 flex">
                    <div className="flex-shrink-0 w-24 h-24">
                      {item.productImage ? (
  <img 
    src={item.productImage.startsWith('http') ? item.productImage : `https://localhost:44308/${item.productImage}`} 
    alt={item.productName}
    className="w-full h-full object-cover rounded-md"
    onError={(e) => {
      e.target.src = '/images/default-product.png'; // Fallback image if loading fails
      e.target.onerror = null;
    }}
  />
) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-md">
                          <Package className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="ml-4 flex-1">
                      <h3 className="font-medium text-gray-900">{item.productName}</h3>
                      <p className="text-sm text-gray-500">Số lượng: {item.quantity}</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-gray-700">{formatCurrency(item.price)}</span>
                        <span className="font-medium">{formatCurrency(item.totalPrice)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Info */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-800 flex items-center">
                  <Truck className="w-5 h-5 mr-2 text-blue-500" />
                  Thông tin giao hàng
                </h2>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex items-start">
                  <MapPin className="w-5 h-5 mr-3 text-red-500 mt-0.5" />
                  <div>
                    <h3 className="font-medium">Địa chỉ nhận hàng</h3>
                    <p className="text-gray-600">{order.deliveryAddress}</p>
                    <p className="text-sm text-gray-500 mt-1">Khoảng cách: {order.distanceKm} km</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <User className="w-5 h-5 mr-3 text-blue-500 mt-0.5" />
                  <div>
                    <h3 className="font-medium">Người giao hàng</h3>
                    <p className="text-gray-600">{order.deliveryPersonName || 'Chưa phân công'}</p>
                    {order.deliveryPersonPhone && (
                      <div className="flex items-center mt-1">
                        <Phone className="w-4 h-4 mr-1 text-gray-500" />
                        <span className="text-sm text-gray-500">{order.deliveryPersonPhone}</span>
                      </div>
                    )}
                    <h3 className="font-medium mt-3">Người nhận</h3>
                    <p className="text-gray-600">{order.customerName}</p>
                    {order.customerPhone && (
                      <div className="flex items-center mt-1">
                        <Phone className="w-4 h-4 mr-1 text-gray-500" />
                        <span className="text-sm text-gray-500">{order.customerPhone}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Clock className="w-5 h-5 mr-3 text-yellow-500 mt-0.5" />
                  <div>
                    <h3 className="font-medium">Thời gian giao hàng dự kiến</h3>
                    <p className="text-gray-600">{formatDate(order.estimatedDeliveryTime)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-800 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2 text-blue-500" />
                  Thanh toán
                </h2>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tổng tiền món ăn</span>
                  <span>{formatCurrency(order.productTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Phí vận chuyển</span>
                  <span>{formatCurrency(order.shippingFee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Giảm giá</span>
                  <span className="text-green-600">-{formatCurrency(order.discountAmount)}</span>
                </div>
                <div className="pt-3 mt-3 border-t border-gray-200 flex justify-between">
                  <span className="font-semibold">Tổng thanh toán</span>
                  <span className="font-bold text-lg text-blue-600">{formatCurrency(order.totalAmount)}</span>
                </div>
                <div className="pt-3 mt-3 border-t border-gray-200">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phương thức</span>
                    <span>{order.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-gray-600">Trạng thái</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${order.paymentStatus === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {order.paymentStatus}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'tracking' ? (
          <div className="bg-white rounded-lg shadow-sm p-4">
            <OrderTracking 
              orderId={order.orderId} 
              deliveryAddress={order.deliveryAddress}
            />
          </div>
        ) : activeTab === 'chat' && (
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="mb-4">
              <h2 className="font-semibold text-gray-800 flex items-center mb-2">
                <MessageCircle className="w-5 h-5 mr-2 text-blue-500" />
                Liên hệ với người giao hàng
              </h2>
              <p className="text-sm text-gray-600">
                Bạn có thể liên hệ với người giao hàng để cập nhật thông tin về đơn hàng của bạn.
              </p>
            </div>
            <OrderChat orderId={order.orderId} />
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {(order.status === 'InDelivery' || order.status === 'Delivering') && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-3 px-4 shadow-lg">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <div className="flex items-center">
              <Truck className="w-5 h-5 mr-2 text-blue-500" />
              <span className="font-medium">Tài xế đang trên đường</span>
            </div>
            <div className="flex gap-2">
              {isChatAvailable() && activeTab !== 'chat' && (
                <button 
                  onClick={() => setActiveTab('chat')}
                  className="px-4 py-2 bg-white border border-blue-500 text-blue-600 rounded-md hover:bg-blue-50 transition flex items-center"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Chat
                </button>
              )}
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition flex items-center">
                <Navigation className="w-4 h-4 mr-2" />
                Liên hệ tài xế
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetailsPage;
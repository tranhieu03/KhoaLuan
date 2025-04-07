import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, ShoppingCart, Truck, CreditCard, ChevronLeft } from 'lucide-react';
import axios from 'axios';
import Header from './Header';

const OrderDetailsPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `https://localhost:44308/api/Order/order-details/${orderId}`,
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

  if (loading) {
    return <div className="text-center text-lg font-semibold">Đang tải...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500 font-semibold">{error}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg border border-gray-200">
       <Header />
      <button onClick={() => navigate(-1)} className="flex items-center text-blue-500 hover:underline mb-4">
        <ChevronLeft className="w-5 h-5 mr-1" /> Quay lại
      </button>
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Chi tiết đơn hàng #{order.orderId}</h1>
      <div className="space-y-2 text-gray-700">
        <p><strong>Nhà hàng:</strong> {order.restaurantName}</p>
        <p><strong>Trạng thái:</strong> <span className="font-semibold text-blue-600">{order.status}</span></p>
        <p><strong>Ngày đặt hàng:</strong> {formatDate(order.orderDate)}</p>
        <p><strong>Địa chỉ giao hàng:</strong> {order.deliveryAddress}</p>
        <p><strong>Khoảng cách:</strong> {order.distanceKm} km</p>
        <p><strong>Tổng tiền sản phẩm:</strong> {formatCurrency(order.productTotal)}</p>
        <p><strong>Phí vận chuyển:</strong> {formatCurrency(order.shippingFee)}</p>
        <p><strong>Giảm giá:</strong> {formatCurrency(order.discountAmount)}</p>
        <p className="text-lg font-bold text-green-600"><strong>Tổng thanh toán:</strong> {formatCurrency(order.totalAmount)}</p>
        <p><strong>Phương thức thanh toán:</strong> {order.paymentMethod}</p>
        <p><strong>Trạng thái thanh toán:</strong> {order.paymentStatus}</p>
      </div>
      <h2 className="text-xl font-semibold mt-6 text-gray-800">Chi tiết món ăn</h2>
      <div className="grid gap-4 mt-4">
        {order.orderDetails.map((item) => (
          <div key={item.productId} className="flex items-center p-4 border rounded-lg shadow-sm">
            <img src={item.productImage} alt={item.productName} className="w-24 h-24 object-cover rounded-lg" />
            <div className="ml-4">
              <p className="font-semibold text-gray-900">{item.productName}</p>
              <p>Số lượng: <strong>{item.quantity}</strong></p>
              <p>Giá: {formatCurrency(item.price)}</p>
              <p className="font-semibold">Thành tiền: {formatCurrency(item.totalPrice)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderDetailsPage;
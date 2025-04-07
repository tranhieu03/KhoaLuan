import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, ShoppingCart, Tag, Truck, CreditCard } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';
import Header from './Header';

const OrderPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [selectedVoucher, setSelectedVoucher] = useState('');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize state from navigation data
  useEffect(() => {
    if (location.state) {
      const { selectedCartItems, address: cartAddress, paymentMethod: cartPaymentMethod, voucherCode } = location.state;
      
      if (selectedCartItems) setSelectedItems(selectedCartItems);
      if (cartAddress) setAddress(cartAddress);
      if (cartPaymentMethod) setPaymentMethod(cartPaymentMethod);
      if (voucherCode) setSelectedVoucher(voucherCode);
      
      fetchCartDetails(selectedCartItems);
    } else {
      // If accessed directly without data, redirect back to cart
      navigate('/cart');
    }
    
    fetchVouchers();
  }, [location]);

  // Fetch selected cart items details
  const fetchCartDetails = async (itemIds) => {
    if (!itemIds || itemIds.length === 0) return;
    
    setLoading(true);
    try {
      const response = await axios.get(
        "https://localhost:44308/api/Cart/Cart_items",
        { withCredentials: true }
      );
      
      if (response.data && response.data.items) {
        const items = response.data.items.filter(item => 
          itemIds.includes(item.cartItemId)
        );
        setCartItems(items);
      }
      setLoading(false);
    } catch (err) {
      setError("Không thể lấy thông tin giỏ hàng");
      setLoading(false);
    }
  };

  // Fetch valid vouchers
  const fetchVouchers = async () => {
    try {
      const response = await axios.get(
        "https://localhost:44308/api/Order/valid-vouchers",
        { withCredentials: true }
      );
      setVouchers(response.data || []);
    } catch (err) {
      console.error('Error fetching vouchers:', err);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { 
      style: 'currency', 
      currency: 'VND' 
    }).format(amount);
  };

  // Calculate subtotal of selected items
  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => total + item.totalPrice, 0);
  };

  // Create order
  const handleCreateOrder = async () => {
    if (selectedItems.length === 0) {
      toast.error('Vui lòng chọn ít nhất một món ăn');
      return;
    }

    if (!address) {
      toast.error('Vui lòng nhập địa chỉ giao hàng');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(
        "https://localhost:44308/api/Order/create-order",
        {
          selectedCartItems: selectedItems,
          voucherCode: selectedVoucher,
          paymentMethod: paymentMethod,
          address: address
        },
        { withCredentials: true }
      );

      toast.success('Đặt hàng thành công!');
      
      // If payment is VNPay and there's a payment URL
      if (paymentMethod === 'VNPay' && response.data.paymentUrl) {
        window.location.href = response.data.paymentUrl;
        return;
      }
      
      // Redirect to order details page with the orderId
      if (response.data.orders && response.data.orders.length > 0) {
        // Lưu ý: 'orders' viết thường, không phải 'Orders'
        const orderId = response.data.orders[0].orderId; // Kiểm tra xem trường có phải là orderId hay id
        navigate(`/order-details/${orderId}`);
      } else {
        toast.error('Không thể xác định ID đơn hàng từ phản hồi');
        console.error('Unexpected response structure:', response.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Đặt hàng thất bại');
      toast.error(err.response?.data?.message || 'Đặt hàng thất bại');
    } finally {
      setLoading(false);
    }
  };

  if (loading && cartItems.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <Header/>
      <h1 className="text-2xl font-bold mb-6 flex items-center">
        <ShoppingCart className="w-6 h-6 mr-2" />
        Xác nhận đơn hàng
      </h1>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
          {error}
        </div>
      )}
      
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Món ăn đã chọn</h2>
        {cartItems.length > 0 ? (
          <div className="border rounded-lg divide-y">
            {cartItems.map(item => (
              <div key={item.cartItemId} className="p-4 flex items-center">
                <div className="flex-shrink-0 mr-4">
                  <img 
                    src={item.imageUrl || "/placeholder-food.jpg"} 
                    alt={item.name} 
                    className="w-16 h-16 object-cover rounded"
                  />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm text-gray-500">
                    {formatCurrency(item.price)}
                  </div>
                </div>
                <div className="text-gray-700">
                  x{item.quantity}
                </div>
                <div className="ml-6 font-semibold">
                  {formatCurrency(item.totalPrice)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500 italic">Không có món ăn nào được chọn</div>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Truck className="w-5 h-5 mr-2" />
            Địa chỉ giao hàng
          </h2>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Nhập địa chỉ giao hàng của bạn"
            className="w-full p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
            rows="3"
          />
        </div>
        
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Tag className="w-5 h-5 mr-2" />
            Mã giảm giá
          </h2>
          <select
            value={selectedVoucher}
            onChange={(e) => setSelectedVoucher(e.target.value)}
            className="w-full p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Chọn mã giảm giá (nếu có)</option>
            {vouchers.map(voucher => (
              <option key={voucher.code} value={voucher.code}>
                {voucher.code} - {voucher.voucherType === 'Fixed' 
                  ? formatCurrency(voucher.discountAmount) 
                  : `${voucher.discountAmount}%`} giảm giá
              </option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <CreditCard className="w-5 h-5 mr-2" />
          Phương thức thanh toán
        </h2>
        <div className="space-y-3">
          <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="paymentMethod"
              value="COD"
              checked={paymentMethod === 'COD'}
              onChange={() => setPaymentMethod('COD')}
              className="w-5 h-5 accent-blue-600 mr-4"
            />
            <div>
              <div className="font-medium">Thanh toán khi nhận hàng (COD)</div>
              <div className="text-sm text-gray-500">Thanh toán bằng tiền mặt khi nhận hàng</div>
            </div>
          </label>
          
          <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="paymentMethod"
              value="VNPay"
              checked={paymentMethod === 'VNPay'}
              onChange={() => setPaymentMethod('VNPay')}
              className="w-5 h-5 accent-blue-600 mr-4"
            />
            <div>
              <div className="font-medium">VNPay</div>
              <div className="text-sm text-gray-500">Thanh toán qua VNPay</div>
            </div>
          </label>
        </div>
      </div>
      
      <div className="border-t pt-6">
        <div className="flex justify-between mb-2">
          <span>Tạm tính:</span>
          <span>{formatCurrency(calculateSubtotal())}</span>
        </div>
        <div className="flex justify-between mb-4">
          <span>Phí vận chuyển:</span>
          <span className="text-gray-500">Sẽ được tính khi đặt hàng</span>
        </div>
        <div className="flex justify-between font-bold text-lg mb-6">
          <span>Tổng tiền hàng:</span>
          <span>{formatCurrency(calculateSubtotal())}</span>
        </div>
        
        <button 
          onClick={handleCreateOrder}
          disabled={loading || cartItems.length === 0}
          className={`w-full py-3 rounded-lg font-medium text-white 
            ${loading || cartItems.length === 0 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 transition-colors'}`}
        >
          {loading ? 'Đang xử lý...' : 'Đặt hàng ngay'}
        </button>
      </div>
    </div>
  );
};

export default OrderPage;
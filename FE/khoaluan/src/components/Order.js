import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, ShoppingCart, Tag, Truck, CreditCard, MapPin, RefreshCw } from 'lucide-react';
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
  const [coordinates, setCoordinates] = useState({ latitude: null, longitude: null });
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [loading, setLoading] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const [error, setError] = useState('');
  const [usingCurrentLocation, setUsingCurrentLocation] = useState(false);

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
    fetchDefaultAddress();
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

  // Fetch user's default address
  const fetchDefaultAddress = async () => {
    setAddressLoading(true);
    try {
      const response = await axios.get(
        "https://localhost:44308/api/Order/get-default-address",
        { withCredentials: true }
      );
      
      if (response.data.success) {
        if (response.data.requireAddress) {
          // User needs to provide address
          toast.info(response.data.message);
        } else if (response.data.address) {
          // Set the default address from database
          setAddress(response.data.address);
          setCoordinates({
            latitude: response.data.latitude,
            longitude: response.data.longitude
          });
        }
      }
    } catch (err) {
      console.error('Error fetching default address:', err);
    } finally {
      setAddressLoading(false);
    }
  };

  // Get current location
  const getCurrentLocation = () => {
    setAddressLoading(true);
    setUsingCurrentLocation(true);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setCoordinates({ latitude, longitude });
          
          try {
            // Send coordinates to get address
            const response = await axios.post(
              "https://localhost:44308/api/Order/get-user-location",
              { latitude, longitude },
              { withCredentials: true }
            );
            
            if (response.data.success) {
              setAddress(response.data.address);
              toast.success("Đã lấy vị trí hiện tại thành công");
            } else {
              setUsingCurrentLocation(false);
              toast.error(response.data.message);
            }
          } catch (err) {
            console.error('Error getting address from coordinates:', err);
            toast.error("Không thể lấy địa chỉ từ vị trí hiện tại");
            setUsingCurrentLocation(false);
          } finally {
            setAddressLoading(false);
          }
        },
        (error) => {
          console.error('Error getting current location:', error);
          toast.error("Không thể truy cập vị trí hiện tại. Vui lòng nhập địa chỉ thủ công.");
          setAddressLoading(false);
          setUsingCurrentLocation(false);
        }
      );
    } else {
      toast.error("Trình duyệt của bạn không hỗ trợ định vị.");
      setAddressLoading(false);
      setUsingCurrentLocation(false);
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

    if (!address && !usingCurrentLocation) {
      toast.error('Vui lòng nhập địa chỉ giao hàng hoặc sử dụng vị trí hiện tại');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Prepare order request
      const orderRequest = {
        selectedCartItems: selectedItems,
        voucherCode: selectedVoucher,
        paymentMethod: paymentMethod,
        address: address
      };
      
      // Add coordinates if using current location
      if (coordinates.latitude && coordinates.longitude) {
        orderRequest.latitude = coordinates.latitude;
        orderRequest.longitude = coordinates.longitude;
      }

      const response = await axios.post(
        "https://localhost:44308/api/Order/create-order",
        orderRequest,
        { withCredentials: true }
      );

      toast.success('Đặt hàng thành công!');
      
      // If payment is VNPay and there's a payment URL
      if (paymentMethod === 'VNPay' && response.data.paymentUrl) {
        window.location.href = response.data.paymentUrl;
        return;
      }
      
      // Redirect to order details page with the orderId
      if (response.data.orderId) {
        navigate(`/order-details/${response.data.orderId}`);
      } else {
        toast.error('Không thể xác định ID đơn hàng từ phản hồi');
        console.error('Unexpected response structure:', response.data);
      }
    } catch (err) {
      // Handle specific error cases
      if (err.response?.data?.requireAddress) {
        toast.error('Vui lòng cung cấp địa chỉ giao hàng hoặc cho phép truy cập vị trí hiện tại');
      } else {
        setError(err.response?.data?.message || 'Đặt hàng thất bại');
        toast.error(err.response?.data?.message || 'Đặt hàng thất bại');
      }
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
      
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <Truck className="w-5 h-5 mr-2" />
          Địa chỉ giao hàng
        </h2>
        
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <button 
              onClick={getCurrentLocation}
              disabled={addressLoading}
              className={`px-4 py-2 rounded-lg flex items-center ${addressLoading ? 'bg-gray-300' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
            >
              {addressLoading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <MapPin className="w-4 h-4 mr-2" />
              )}
              {usingCurrentLocation ? 'Đang sử dụng vị trí hiện tại' : 'Sử dụng vị trí hiện tại'}
            </button>
            
            {usingCurrentLocation && coordinates.latitude && (
              <span className="text-sm text-green-600 flex items-center">
                <CheckCircle className="w-4 h-4 mr-1" /> Đã lấy tọa độ thành công
              </span>
            )}
          </div>
          
          <textarea
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              // If user starts typing, we're no longer using current location
              if (usingCurrentLocation) setUsingCurrentLocation(false);
            }}
            placeholder="Nhập địa chỉ giao hàng của bạn"
            className="w-full p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
            rows="3"
          />
          
          <p className="text-sm text-gray-500 mt-2">
            {usingCurrentLocation ? 
              'Sử dụng vị trí hiện tại để giao hàng chính xác hơn' : 
              'Vui lòng nhập địa chỉ đầy đủ bao gồm số nhà, đường, phường/xã, quận/huyện, thành phố'
            }
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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
        
        <div>
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
import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Trash2, ShoppingCart, Check, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Header from "./Header";
import API_BASE_URL from "../config";

function Cart() {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [voucherCode, setVoucherCode] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchCartItems();
  }, []);

  const fetchCartItems = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_BASE_URL}/Cart/Cart_items`,
        { withCredentials: true }
      );
      
      setCartItems(response.data.items || []);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || "Không thể lấy danh sách giỏ hàng.");
      setLoading(false);
      toast.error("Lỗi khi tải giỏ hàng");
    }
  };
  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return "/placeholder-food.jpg";
    
    // Check if the image URL is a full web URL
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      return imageUrl;
    }
    
    // For local uploads, prepend the base URL and ensure correct path
    // Remove any leading slashes to avoid double slashes in URL
    const cleanedPath = imageUrl.replace(/^\/+/, '');
    return `https://localhost:44308/${cleanedPath}`;
  };
  const toggleSelectItem = (cartItemId) => {
    setSelectedItems(prev =>
      prev.includes(cartItemId)
        ? prev.filter(id => id !== cartItemId)
        : [...prev, cartItemId]
    );
  };

  const handleRemoveItem = async (cartItemId) => {
    try {
      await axios.delete(
        `${API_BASE_URL}/Cart/remove/${cartItemId}`,
        { withCredentials: true }
      );
      
      setCartItems(cartItems.filter((item) => item.cartItemId !== cartItemId));
      setSelectedItems(selectedItems.filter(id => id !== cartItemId));
      toast.success("Đã xóa sản phẩm khỏi giỏ hàng");
    } catch (err) {
      toast.error("Lỗi khi xóa sản phẩm");
    }
  };

  const handleUpdateQuantity = async (cartItemId, newQuantity) => {
    if (newQuantity < 1) return;
    
    try {
      await axios.put(
        `${API_BASE_URL}/Cart/update/${cartItemId}`,
        { Quantity: newQuantity },
        { withCredentials: true }
      );
      
      const updatedItems = cartItems.map(item => 
        item.cartItemId === cartItemId 
          ? { 
              ...item, 
              quantity: newQuantity, 
              totalPrice: item.price * newQuantity 
            }
          : item
      );
      
      setCartItems(updatedItems);
      toast.success("Đã cập nhật số lượng");
    } catch (err) {
      toast.error("Cập nhật số lượng thất bại");
    }
  };

  const handleProceedToOrder = () => {
    if (selectedItems.length === 0) {
      toast.error("Vui lòng chọn ít nhất một sản phẩm");
      return;
    }

    // Navigate to order page with selected data
    navigate("/order", {
      state: {
        selectedCartItems: selectedItems,
        address: deliveryAddress,
        paymentMethod: paymentMethod,
        voucherCode: voucherCode
      }
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { 
      style: 'currency', 
      currency: 'VND' 
    }).format(amount);
  };

  const calculateSelectedTotal = () => {
    return cartItems
      .filter(item => selectedItems.includes(item.cartItemId))
      .reduce((sum, item) => sum + item.totalPrice, 0);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center p-4">
        <p>{error}</p>
        <button 
          onClick={fetchCartItems}
          className="mt-2 bg-blue-500 text-white px-4 py-2 rounded"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Header/>
      <h1 className="text-2xl font-bold mb-6 flex items-center">
        <ShoppingCart className="mr-2" />
        Giỏ hàng của bạn
      </h1>

      {cartItems.length > 0 ? (
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="divide-y divide-gray-200">
            {cartItems.map((item) => (
              <div key={item.cartItemId} className="py-4 flex flex-col md:flex-row">
                <div className="flex items-start">
                  <button
                    onClick={() => toggleSelectItem(item.cartItemId)}
                    className={`mr-3 mt-1 w-5 h-5 flex items-center justify-center border rounded ${
                      selectedItems.includes(item.cartItemId) 
                        ? 'bg-blue-500 border-blue-500 text-white' 
                        : 'border-gray-300'
                    }`}
                  >
                    {selectedItems.includes(item.cartItemId) && <Check size={14} />}
                  </button>
                  
                  <div className="flex-shrink-0 mb-4 md:mb-0 md:mr-4">
                  <img 
  src={getImageUrl(item.imageUrl)} 
  alt={item.name} 
  className="w-24 h-24 object-cover rounded"
  onError={(e) => {
    e.target.src = "/placeholder-food.jpg";
  }}
/>
                  </div>
                </div>
                
                <div className="flex-grow">
                  <div className="flex justify-between">
                    <h3 className="text-lg font-semibold">{item.name}</h3>
                    <button 
                      onClick={() => handleRemoveItem(item.cartItemId)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  
                  <div className="mt-2 flex items-center">
                    <span className="text-orange-500 font-medium">
                      {formatCurrency(item.price)}
                    </span>
                  </div>
                  
                  <div className="mt-3 flex items-center">
                    <button 
                      onClick={() => handleUpdateQuantity(item.cartItemId, item.quantity - 1)}
                      className="bg-gray-200 px-3 py-1 rounded-l"
                      disabled={item.quantity <= 1}
                    >
                      -
                    </button>
                    <span className="px-4 py-1 bg-gray-100">{item.quantity}</span>
                    <button 
                      onClick={() => handleUpdateQuantity(item.cartItemId, item.quantity + 1)}
                      className="bg-gray-200 px-3 py-1 rounded-r"
                    >
                      +
                    </button>
                    
                    <span className="ml-auto font-bold">
                      {formatCurrency(item.totalPrice)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <MapPin className="mr-2 text-gray-500" size={18} />
                <span className="font-medium">Địa chỉ giao hàng:</span>
              </div>
              <input
                type="text"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Nhập địa chỉ giao hàng"
                className="w-full p-2 border rounded"
              />
            </div>

            <div className="mb-4">
              <label className="block font-medium mb-2">Phương thức thanh toán:</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="COD">Thanh toán khi nhận hàng</option>
                <option value="VNPay">Thanh toán qua VNPay</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block font-medium mb-2">Mã giảm giá (nếu có):</label>
              <input
                type="text"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value)}
                placeholder="Nhập mã giảm giá"
                className="w-full p-2 border rounded"
              />
            </div>

            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-semibold">Tổng tiền hàng:</span>
              <span className="text-xl font-bold text-orange-600">
                {formatCurrency(calculateSelectedTotal())}
              </span>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={handleProceedToOrder}
                disabled={selectedItems.length === 0}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  selectedItems.length === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                Tiếp tục đặt hàng
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <ShoppingCart size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 text-lg">Giỏ hàng của bạn đang trống</p>
          <button
            onClick={() => window.history.back()}
            className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Tiếp tục mua sắm
          </button>
        </div>
      )}
    </div>
  );
}

export default Cart;
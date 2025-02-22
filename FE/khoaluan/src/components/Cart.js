import React, { useState, useEffect } from "react";
import { getCartItems, removeFromCart, createOrder } from "../services/cartService";
import * as signalR from "@microsoft/signalr";

function Cart() {
  const [cartItems, setCartItems] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cod"); // Mặc định là Thanh toán khi nhận hàng
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCartItems();
  }, []);

  const fetchCartItems = async () => {
    try {
      const data = await getCartItems();
      setCartItems(data.items || []);
      setTotalAmount(data.totalAmount || 0);
    } catch (err) {
      setError(err.response?.data?.message || "Không thể lấy danh sách giỏ hàng.");
    }
  };

  const handleCreateOrder = async () => {
    try {
      const response = await createOrder({ paymentMethod });

      if (paymentMethod === "vnpay" && response.paymentUrl) {
        // Nếu chọn VNPAY, chuyển hướng đến trang thanh toán
        window.location.href = response.paymentUrl;
        return;
      }

      // Kết nối SignalR
      const connection = new signalR.HubConnectionBuilder()
        .withUrl("https://localhost:5000/notificationHub")
        .configureLogging(signalR.LogLevel.Information)
        .build();

      await connection.start();
      console.log("Đã kết nối SignalR.");

      connection.on("ReceiveNotification", (message) => {
        alert(`Thông báo mới: ${message}`);
      });

      // Gửi thông báo đến nhà hàng
      response.orders.forEach((order) => {
        connection.invoke(
          "SendNotification",
          `Restaurant_${order.restaurantId}`,
          `Đơn hàng mới #${order.orderId}, tổng tiền: ${order.totalAmount}₫`
        );
      });

      // Xóa giỏ hàng sau khi đặt hàng thành công
      setCartItems([]);
      setTotalAmount(0);
    } catch (err) {
      console.error("Lỗi khi đặt hàng:", err);
      setError(err.response?.data?.message || "Không thể đặt hàng.");
    }
  };

  const handleRemoveItem = async (cartItemId) => {
    try {
      await removeFromCart(cartItemId);
      setCartItems(cartItems.filter((item) => item.cartItemId !== cartItemId));
      const removedItem = cartItems.find((item) => item.cartItemId === cartItemId);
      if (removedItem) {
        setTotalAmount((prevTotal) => prevTotal - removedItem.totalPrice);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Không thể xóa sản phẩm.");
    }
  };

  if (error) {
    return <div className="text-red-500">Lỗi: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Giỏ Hàng Của Bạn</h1>

      {cartItems.length > 0 ? (
        <div>
          {cartItems.map((item) => (
            <div key={item.cartItemId} className="border p-4 mb-2 rounded-lg shadow-md">
              <h3 className="font-semibold">{item.name}</h3>
              <p>{item.description}</p>
              <p>Giá: {item.price.toFixed(2)}₫</p>
              <p>Số lượng: {item.quantity}</p>
              <p>Tổng cộng: {item.totalPrice.toFixed(2)}₫</p>
              <img src={item.imageUrl} alt={item.name} className="w-24 h-24 object-cover" />
              <button
                onClick={() => handleRemoveItem(item.cartItemId)}
                className="bg-red-500 text-white px-3 py-1 rounded mt-2"
              >
                Xóa
              </button>
            </div>
          ))}

          <h2 className="text-xl font-bold mt-4">Tổng Tiền: {totalAmount.toFixed(2)}₫</h2>

          {/* Chọn phương thức thanh toán */}
          <div className="mt-4">
            <label className="mr-2">Phương thức thanh toán:</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="border p-2 rounded"
            >
              <option value="cod">Thanh toán khi nhận hàng</option>
              <option value="vnpay">Thanh toán qua VNPAY</option>
            </select>
          </div>

          <button
            onClick={handleCreateOrder}
            className="bg-green-500 text-white px-4 py-2 rounded mt-4"
          >
            Đặt Hàng
          </button>
        </div>
      ) : (
        <p className="text-gray-600">Giỏ hàng của bạn đang trống.</p>
      )}
    </div>
  );
}

export default Cart;

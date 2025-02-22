import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "https://localhost:44308/api/Seller";

function SellerOrders() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API_URL}/seller-orders`, { withCredentials: true });
      if (response.data.success) {
        setOrders(response.data.orders);
      } else {
        setError(response.data.message || "Không thể lấy danh sách đơn hàng.");
      }
    } catch (error) {
      setError(error.response?.data?.message || "Lỗi khi tải đơn hàng.");
    }
  };

  const confirmOrder = async (orderId) => {
    try {
      const response = await axios.post(
        `https://localhost:44308/api/Order/confirm-order/${orderId}`,
        {},
        { withCredentials: true }
      );
      alert(response.data.message || "Đơn hàng đã được xác nhận!");

      // Cập nhật danh sách đơn hàng sau khi xác nhận
      fetchOrders();
    } catch (error) {
      alert(error.response?.data?.message || "Lỗi khi xác nhận đơn hàng.");
    }
  };

  return (
    <div className="container">
      <h1>Danh Sách Đơn Hàng</h1>

      {error && <p className="error">{error}</p>}

      {orders.length > 0 ? (
        <ul className="order-list">
          {orders.map((order) => (
            <li key={order.orderId} className="order-item">
              <h2>Đơn hàng #{order.orderId}</h2>
              <p><strong>Khách hàng:</strong> {order.customerName} - {order.customerPhone}</p>
              <p><strong>Địa chỉ:</strong> {order.address || "Chưa có"}</p>
              <p><strong>Ngày đặt:</strong> {new Date(order.orderDate).toLocaleString()}</p>
              <p><strong>Trạng thái thanh toán:</strong> {order.paymentStatus || "Chưa thanh toán"}</p>
              <p><strong>Tổng tiền:</strong> {order.totalAmount.toLocaleString()}₫</p>

              <h3>Sản phẩm:</h3>
              <ul>
                {order.items.map((item, index) => (
                  <li key={index}>
                    {item.productName} - {item.quantity} x {item.price.toLocaleString()}₫
                  </li>
                ))}
              </ul>

              {/* Nút Xác nhận đơn hàng */}
              {order.status === "Pending" && (
                <button className="confirm-button" onClick={() => confirmOrder(order.orderId)}>
                  Xác nhận đơn hàng
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>Không có đơn hàng nào.</p>
      )}
    </div>
  );
}

export default SellerOrders;

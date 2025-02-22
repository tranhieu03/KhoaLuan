import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "https://localhost:44308/api/Delivery";
const API_URL2 = "https://localhost:44308/api/Order";
const API_NOTIFICATION = "https://localhost:44308/api/Notification";

function DeliveryOrders() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    fetchAvailableOrders();
    fetchNotifications();
  }, []);

  const fetchAvailableOrders = async () => {
    try {
      const response = await axios.get(`${API_URL}/available-orders`, { withCredentials: true });
      if (response.data.success) {
        setOrders(response.data.orders);
      } else {
        setError(response.data.message || "Không thể lấy danh sách đơn hàng.");
      }
    } catch (error) {
      setError(error.response?.data?.message || "Lỗi khi tải danh sách đơn hàng.");
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API_NOTIFICATION}/get-notifications`, {
        withCredentials: true,
      });

      if (response.status === 200) {
        setNotifications(response.data);
        setUnreadCount(response.data.filter((n) => !n.isRead).length);
      }
    } catch (error) {
      console.error("Lỗi khi lấy thông báo:", error);
    }
  };

  const markNotificationsAsRead = async () => {
    try {
      await axios.post(`${API_NOTIFICATION}/mark-as-read`, {}, { withCredentials: true });
      setUnreadCount(0);
      setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      console.error("Lỗi khi cập nhật trạng thái thông báo:", error);
    }
  };

  const acceptDelivery = async (orderId) => {
    try {
      const response = await axios.post(
        `${API_URL2}/accept-delivery/${orderId}`,
        {},
        { withCredentials: true }
      );
      alert(response.data.message || "Bạn đã nhận đơn hàng thành công!");

      fetchAvailableOrders();
    } catch (error) {
      alert(error.response?.data?.message || "Lỗi khi nhận đơn hàng.");
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1>Danh Sách Đơn Hàng Chờ Giao</h1>

        {/* Nút Thông Báo */}
        <div className="notification-container">
          <button
            className="notification-button"
            onClick={() => {
              setShowNotifications(!showNotifications);
              if (unreadCount > 0) markNotificationsAsRead();
            }}
          >
            🔔 Thông báo {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
          </button>

          {showNotifications && (
            <div className="notification-dropdown">
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <div key={notification.id} className={`notification-item ${notification.isRead ? "" : "unread"}`}>
                    {notification.message}
                  </div>
                ))
              ) : (
                <p>Không có thông báo nào</p>
              )}
            </div>
          )}
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      {orders.length > 0 ? (
        <ul className="order-list">
          {orders.map((order) => (
            <li key={order.orderId} className="order-item">
              <h2>Đơn hàng #{order.orderId}</h2>
              <p><strong>Nhà hàng:</strong> {order.restaurantName} ({order.restaurantAddress})</p>
              <p><strong>Khách hàng:</strong> {order.customerName} - {order.customerPhone}</p>
              <p><strong>Địa chỉ giao:</strong> {order.address || "Chưa có"}</p>
              <p><strong>Ngày đặt:</strong> {new Date(order.orderDate).toLocaleString()}</p>
              <p><strong>Tổng tiền:</strong> {order.totalAmount.toLocaleString()}₫</p>

              <h3>Sản phẩm:</h3>
              <ul>
                {order.items.map((item, index) => (
                  <li key={index}>
                    {item.name} - {item.quantity} x {item.price.toLocaleString()}₫
                  </li>
                ))}
              </ul>

              <button className="accept-button" onClick={() => acceptDelivery(order.orderId)}>
                Nhận đơn hàng
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>Không có đơn hàng nào cần giao.</p>
      )}
    </div>
  );
}

export default DeliveryOrders;

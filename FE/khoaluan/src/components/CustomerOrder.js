import React, { useEffect, useState } from "react";
import axios from "axios";

const API_ORDERS = "https://localhost:44308/api/Customer";
const API_NOTIFICATION = "https://localhost:44308/api/Notification";

function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    fetchOrders();
    fetchNotifications();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API_ORDERS}/my-orders`, { withCredentials: true });
      if (response.status === 200) {
        setOrders(response.data.orders);
      }
    } catch (error) {
      console.error("Lỗi khi lấy đơn hàng:", error);
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

  const filteredOrders = orders.filter((order) =>
    statusFilter === "All" ? true : order.status === statusFilter
  );

  return (
    <div className="container">
      <div className="header">
        <h1>Danh Sách Đơn Hàng Của Bạn</h1>

        {/* Bộ lọc trạng thái đơn hàng */}
        <select onChange={(e) => setStatusFilter(e.target.value)} value={statusFilter}>
          <option value="All">Tất cả</option>
          <option value="Pending">Đang xử lý</option>
          <option value="Completed">Hoàn thành</option>
          <option value="Cancelled">Đã hủy</option>
        </select>

        {/* Nút thông báo */}
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

      {/* Danh sách đơn hàng */}
      {filteredOrders.length > 0 ? (
        <ul className="order-list">
          {filteredOrders.map((order) => (
            <li key={order.orderId} className="order-item">
              <h2>Đơn hàng #{order.orderId}</h2>
              <p><strong>Ngày đặt:</strong> {new Date(order.orderDate).toLocaleString()}</p>
              <p><strong>Trạng thái:</strong> {order.status}</p>
              <p><strong>Tổng tiền:</strong> {order.totalAmount.toLocaleString()}₫</p>
              <p><strong>Địa chỉ:</strong> {order.address}</p>
              <p><strong>Phương thức thanh toán:</strong> {order.paymentMethod}</p>

              <h3>Sản phẩm:</h3>
              <ul>
                {order.Items.map((item, index) => (
                  <li key={index}>
                    {item.ProductName} - {item.Quantity} x {item.Price.toLocaleString()}₫
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      ) : (
        <p>Không có đơn hàng nào.</p>
      )}
    </div>
  );
}

export default MyOrders;

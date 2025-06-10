import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import * as signalR from '@microsoft/signalr';
import API_BASE_URL from "../config";

// Cấu hình mặc định cho Axios để gửi credentials
axios.defaults.withCredentials = true;

const DeliveryPersonDashboard = () => {
  const [availableOrders, setAvailableOrders] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available');
  const [hubConnection, setHubConnection] = useState(null);

  // Initialize SignalR connection
  useEffect(() => {
    const createHubConnection = async () => {
      try {
        const connection = new signalR.HubConnectionBuilder()
          .withUrl("https://localhost:44308/notificationHub", {
            withCredentials: true,
            skipNegotiation: false,
            transport: signalR.HttpTransportType.WebSockets
          })
          .configureLogging(signalR.LogLevel.Information)
          .withAutomaticReconnect()
          .build();

        connection.on("ReceiveNotification", (message) => {
          toast.info(message);
          fetchAvailableOrders();
          fetchMyOrders();
        });

        await connection.start();
        console.log("SignalR Connected");

        const userId = sessionStorage.getItem("userId");
        if (userId) {
          await connection.invoke("JoinGroup", "DeliveryPersons")
            .catch(err => console.error("Error joining group:", err));
        }

        setHubConnection(connection);
      } catch (err) {
        console.error("SignalR Connection Error: ", err);
        setTimeout(createHubConnection, 5000);
      }
    };

    createHubConnection();

    return () => {
      if (hubConnection) {
        hubConnection.stop();
      }
    };
  }, []);

  // Fetch available orders
  const fetchAvailableOrders = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/Delivery/available-orders`);
      if (response.data.success) {
        setAvailableOrders(response.data.orders);
      }
    } catch (error) {
      toast.error('Failed to fetch available orders');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch my orders
  const fetchMyOrders = async () => {
    try {
      setLoading(true);
      const userId = sessionStorage.getItem("userId");
      const response = await axios.get(`${API_BASE_URL}/Delivery/my-orders`, {
        headers: {
          'X-User-Id': userId // Gửi userId trong header nếu backend yêu cầu
        }
      });
      if (response.data.success) {
        setMyOrders(response.data.orders);
      }
    } catch (error) {
      toast.error('Failed to fetch your orders');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchAvailableOrders();
    fetchMyOrders();
  }, []);

  // Accept delivery
  const handleAcceptDelivery = async (orderId) => {
    try {
      const userId = sessionStorage.getItem("userId");
      const response = await axios.post(`${API_BASE_URL}/Order/accept-delivery/${orderId}`, null, {
        headers: {
          'X-User-Id': userId
        }
      });
      if (response.data.message) {
        toast.success(response.data.message);
        fetchAvailableOrders();
        fetchMyOrders();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to accept order');
      console.error(error);
    }
  };

  // Confirm delivery
  const handleConfirmDelivery = async (orderId) => {
    try {
      const userId = sessionStorage.getItem("userId");
      const response = await axios.post(
        `${API_BASE_URL}/Order/confirm-delivery/${orderId}`, // Loại bỏ dấu // thừa
        null,
        {
          headers: {
            'X-User-Id': userId
          }
        }
      );
      if (response.data.message) {
        toast.success(response.data.message);
        fetchMyOrders();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to confirm delivery');
      console.error(error);
    }
  };
  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  // Format currency for display
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Render order card (giữ nguyên)
  const renderOrderCard = (order, isMyOrder = false) => {
    return (
      <div key={order.orderId} className="bg-white rounded-lg shadow-md p-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">Order #{order.orderId}</h3>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            order.status === 'ReadyForDelivery' ? 'bg-yellow-100 text-yellow-800' :
            order.status === 'InDelivery' ? 'bg-blue-100 text-blue-800' :
            'bg-green-100 text-green-800'
          }`}>
            {order.status}
          </span>
        </div>
        {/* Giữ nguyên phần còn lại của renderOrderCard */}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Delivery Dashboard</h1>
      {/* Giữ nguyên phần giao diện */}
    </div>
  );
};

export default DeliveryPersonDashboard;
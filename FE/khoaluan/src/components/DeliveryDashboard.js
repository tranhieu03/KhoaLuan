import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import * as signalR from '@microsoft/signalr';


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
            skipNegotiation: false, // Important for ASP.NET Core SignalR
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
  
        // Join the delivery person group
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
      const response = await axios.get('https://localhost:44308/api/Delivery/available-orders');
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
      const response = await axios.get('https://localhost:44308/api/Delivery/my-orders');
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
      const response = await axios.post(`https://localhost:44308/api/Order/accept-delivery/${orderId}`);
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
      const response = await axios.post(`https://localhost:44308/api/Order/confirm-delivery/${orderId}`);
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

  // Render order card
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
        
        <div className="mb-3">
          <p className="font-medium">Restaurant</p>
          <p>{order.restaurantName}</p>
          <p className="text-gray-600 text-sm">{order.restaurantAddress}</p>
        </div>
        
        <div className="mb-3">
          <p className="font-medium">Customer</p>
          <p>{order.customerName} - {order.customerPhone}</p>
          <p className="text-gray-600 text-sm">{order.address}</p>
        </div>
        
        <div className="mb-3">
          <p className="font-medium">Items</p>
          <ul className="pl-5 list-disc">
            {order.items.map((item, index) => (
              <li key={index}>
                {item.name} x {item.quantity} ({formatCurrency(item.price)})
              </li>
            ))}
          </ul>
        </div>
        
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
          <div>
            <p><span className="font-medium">Total:</span> {formatCurrency(order.totalAmount)}</p>
            <p><span className="font-medium">Date:</span> {formatDate(order.orderDate)}</p>
            <p><span className="font-medium">Payment:</span> {order.paymentStatus}</p>
          </div>
          
          {!isMyOrder && (
            <button
              onClick={() => handleAcceptDelivery(order.orderId)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              Accept Order
            </button>
          )}
          
          {isMyOrder && order.status === 'InDelivery' && (
            <button
              onClick={() => handleConfirmDelivery(order.orderId)}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
            >
              Confirm Delivery
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Delivery Dashboard</h1>
      
      {/* Tabs */}
      <div className="flex border-b mb-6">
        <button
          className={`py-2 px-4 mr-2 ${activeTab === 'available' ? 'border-b-2 border-blue-500 font-medium text-blue-500' : 'text-gray-500'}`}
          onClick={() => setActiveTab('available')}
        >
          Available Orders
        </button>
        <button
          className={`py-2 px-4 ${activeTab === 'my-orders' ? 'border-b-2 border-blue-500 font-medium text-blue-500' : 'text-gray-500'}`}
          onClick={() => setActiveTab('my-orders')}
        >
          My Orders
        </button>
      </div>
      
      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div>
          {activeTab === 'available' && (
            <>
              <h2 className="text-xl font-semibold mb-4">Available Orders</h2>
              {availableOrders.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No available orders at the moment</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableOrders.map(order => renderOrderCard(order))}
                </div>
              )}
              <button 
                onClick={fetchAvailableOrders}
                className="mt-4 bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded flex items-center justify-center w-full md:w-auto"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </>
          )}
          
          {activeTab === 'my-orders' && (
            <>
              <h2 className="text-xl font-semibold mb-4">My Orders</h2>
              {myOrders.length === 0 ? (
                <p className="text-gray-500 text-center py-8">You haven't accepted any orders yet</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                  {myOrders.map(order => renderOrderCard(order, true))}
                </div>
              )}
              <button 
                onClick={fetchMyOrders}
                className="mt-4 bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded flex items-center justify-center w-full md:w-auto"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default DeliveryPersonDashboard;
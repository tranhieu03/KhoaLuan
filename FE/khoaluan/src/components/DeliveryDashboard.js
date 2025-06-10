import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import * as signalR from '@microsoft/signalr';
import DeliveryHeader from './DeliveryHeader';
import { MapPin, CheckCircle, AlertCircle } from 'lucide-react';
import DeliveryChat from './DeliveryChat';
import API_BASE_URL from "../config";

const DeliveryPersonDashboard = () => {
  const [availableOrders, setAvailableOrders] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available');
  const [orderStatusFilter, setOrderStatusFilter] = useState('All');
  const [hubConnection, setHubConnection] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [locationTracking, setLocationTracking] = useState(false);
  const [trackingInterval, setTrackingInterval] = useState(null);

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
      
      // Clear location tracking interval when component unmounts
      if (trackingInterval) {
        clearInterval(trackingInterval);
      }
    };
  }, []);

  // Get and setup location tracking
  useEffect(() => {
    // Request location permission immediately on component mount
    getCurrentLocation();
  }, []);

  // Function to get current location
  const getCurrentLocation = () => {
    setLocationError('');
    
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        let errorMessage = 'Unknown error occurred';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'User denied the request for Geolocation';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'The request to get user location timed out';
            break;
        }
        setLocationError(errorMessage);
        toast.error(`Location error: ${errorMessage}`);
      },
      { enableHighAccuracy: true }
    );
  };

  // Start location tracking for a specific order
  const startLocationTracking = (orderId) => {
    // Clear any existing interval
    if (trackingInterval) {
      clearInterval(trackingInterval);
    }
    
    setLocationTracking(true);
    
    // Set up interval to update location every 30 seconds
    const intervalId = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          
          setCurrentLocation(location);
          
          // Send location update to the server
          updateDeliveryLocation(orderId, location);
        },
        (error) => {
          console.error('Error getting location for tracking:', error);
        },
        { enableHighAccuracy: true }
      );
    }, 30000); // 30 seconds interval
    
    setTrackingInterval(intervalId);
    
    // Also get and send location immediately
    getCurrentLocation();
  };

  // Stop location tracking
  const stopLocationTracking = () => {
    if (trackingInterval) {
      clearInterval(trackingInterval);
      setTrackingInterval(null);
    }
    setLocationTracking(false);
  };

  // Update delivery location
  const updateDeliveryLocation = async (orderId, location) => {
    try {
      await axios.post(`${API_BASE_URL}/Order/update-delivery-location`, {
        orderId: orderId,
        latitude: location.latitude,
        longitude: location.longitude
      });
      console.log('Location updated successfully');
    } catch (error) {
      console.error('Failed to update location:', error);
    }
  };

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
      const response = await axios.get(`${API_BASE_URL}/Delivery/my-orders`);
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

  // Accept delivery with location
  const handleAcceptDelivery = async (orderId) => {
    if (!currentLocation) {
      getCurrentLocation();
      toast.warning('Getting your current location...');
      setTimeout(() => handleAcceptDelivery(orderId), 1000);
      return;
    }
    
    if (locationError) {
      toast.error('Cannot accept order without location access. Please enable location services.');
      return;
    }
    
    try {
      const response = await axios.post(`${API_BASE_URL}/Order/accept-delivery/${orderId}`, {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude
      });
      
      if (response.data.message) {
        toast.success(response.data.message);
        fetchAvailableOrders();
        fetchMyOrders();
        
        // Start location tracking for this order
        startLocationTracking(orderId);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to accept order');
      console.error(error);
    }
  };

  // Confirm delivery with location
  const handleConfirmDelivery = async (orderId) => {
    if (!currentLocation) {
      getCurrentLocation();
      toast.warning('Getting your current location...');
      setTimeout(() => handleConfirmDelivery(orderId), 1000);
      return;
    }
    
    if (locationError) {
      toast.error('Cannot confirm delivery without location access. Please enable location services.');
      return;
    }
    
    try {
      const response = await axios.post(`${API_BASE_URL}/Order/confirm-delivery/${orderId}`, {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude
      });
      
      if (response.data.message) {
        toast.success(response.data.message);
        fetchMyOrders();
        
        // Stop location tracking when delivery is confirmed
        stopLocationTracking();
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

  // Filter orders by status
  const filterOrdersByStatus = (orders, status) => {
    if (status === 'All') return orders;
    return orders.filter(order => order.status === status);
  };

  // Get status options based on active tab
  const getStatusOptions = () => {
    if (activeTab === 'available') {
      return ['All', 'ReadyForDelivery'];
    }
    return ['All', 'InDelivery', 'Delivered', 'Completed'];
  };

  // Render location status indicator
  const renderLocationStatus = () => {
    if (locationError) {
      return (
        <div className="flex items-center bg-red-100 text-red-800 px-3 py-2 rounded mb-4">
          <AlertCircle className="w-5 h-5 mr-2" />
          <div>
            <p className="font-medium">Location Error</p>
            <p className="text-sm">{locationError}</p>
            <button 
              onClick={getCurrentLocation}
              className="text-sm underline mt-1"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    
    if (currentLocation) {
      return (
        <div className="flex items-center bg-green-100 text-green-800 px-3 py-2 rounded mb-4">
          <MapPin className="w-5 h-5 mr-2" />
          <div>
            <p className="font-medium">Location Available</p>
            <p className="text-sm">
              Lat: {currentLocation.latitude.toFixed(6)}, 
              Lng: {currentLocation.longitude.toFixed(6)}
            </p>
            {locationTracking && (
              <p className="text-sm font-medium">Tracking active</p>
            )}
          </div>
        </div>
      );
    }
    
    return (
      <div className="flex items-center bg-yellow-100 text-yellow-800 px-3 py-2 rounded mb-4">
        <MapPin className="w-5 h-5 mr-2" />
        <div>
          <p className="font-medium">Getting your location...</p>
          <p className="text-sm">Please make sure location services are enabled</p>
        </div>
      </div>
    );
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
            order.status === 'Delivered' ? 'bg-purple-100 text-purple-800' :
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
              disabled={!!locationError}
              className={`px-4 py-2 rounded text-white ${locationError ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'}`}
            >
              Accept Order
            </button>
          )}
          
          {isMyOrder && order.status === 'InDelivery' && (
            
            <button
              onClick={() => handleConfirmDelivery(order.orderId)}
              disabled={!!locationError}
              className={`px-4 py-2 rounded text-white ${locationError ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'}`}
            >
              Confirm Delivery
            </button>
            
          )}
          
        </div>
        
        {isMyOrder && order.status === 'InDelivery' && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-sm font-medium mb-2">Location Tracking</p>
            <div className="flex space-x-2">
              <button
                onClick={() => startLocationTracking(order.orderId)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                disabled={locationTracking}
              >
                Start Tracking
              </button>
              <button
                onClick={stopLocationTracking}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                disabled={!locationTracking}
              >
                Stop Tracking
              </button>
              <button
                onClick={getCurrentLocation}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded text-sm"
              >
                Update Location
              </button>
            </div>
          </div>
        )}
        <DeliveryChat myOrders={myOrders} />
      </div>
      
    );
  };

  return (
    <div className="container mx-auto p-4">
      <DeliveryHeader />
      <h1 className="text-2xl font-bold mb-6">Delivery Dashboard</h1>
      
      {/* Location Status */}
      {renderLocationStatus()}
      
      {/* Tabs */}
      <div className="flex border-b mb-6">
        <button
          className={`py-2 px-4 mr-2 ${activeTab === 'available' ? 'border-b-2 border-blue-500 font-medium text-blue-500' : 'text-gray-500'}`}
          onClick={() => {
            setActiveTab('available');
            setOrderStatusFilter('All');
          }}
        >
          Đơn hàng chờ giao
        </button>
        <button
          className={`py-2 px-4 ${activeTab === 'my-orders' ? 'border-b-2 border-blue-500 font-medium text-blue-500' : 'text-gray-500'}`}
          onClick={() => {
            setActiveTab('my-orders');
            setOrderStatusFilter('All');
          }}
        >
          Đơn hàng của tôi
        </button>
      </div>
      
      {/* Status Filter */}
      <div className="mb-6">
        <label htmlFor="statusFilter" className="mr-2 font-medium">Filter by Status:</label>
        <select
          id="statusFilter"
          value={orderStatusFilter}
          onChange={(e) => setOrderStatusFilter(e.target.value)}
          className="border rounded px-3 py-1"
        >
          {getStatusOptions().map(status => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
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
              <h2 className="text-xl font-semibold mb-4">Available Orders ({filterOrdersByStatus(availableOrders, orderStatusFilter).length})</h2>
              {filterOrdersByStatus(availableOrders, orderStatusFilter).length === 0 ? (
                <p className="text-gray-500 text-center py-8">No orders match the selected filter</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filterOrdersByStatus(availableOrders, orderStatusFilter).map(order => renderOrderCard(order))}
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
              <h2 className="text-xl font-semibold mb-4">My Orders ({filterOrdersByStatus(myOrders, orderStatusFilter).length})</h2>
              {filterOrdersByStatus(myOrders, orderStatusFilter).length === 0 ? (
                <p className="text-gray-500 text-center py-8">No orders match the selected filter</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                  {filterOrdersByStatus(myOrders, orderStatusFilter).map(order => renderOrderCard(order, true))}
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
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { MessageCircle, Send, X, ChevronDown } from 'lucide-react';
import { toast } from 'react-toastify';
import API_BASE_URL from "../config";

const DeliveryChat = ({ myOrders }) => {
  const [showChat, setShowChat] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [userInfo, setUserInfo] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [receiverId, setReceiverId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hubConnection, setHubConnection] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const messagesEndRef = useRef(null);

  // Filter only orders that are in progress
  const activeOrders = myOrders?.filter(order => 
    ['InDelivery'].includes(order.status)
  ) || [];

  // Initialize SignalR connection
  useEffect(() => {
    if (!showChat) return;

    const createHubConnection = async () => {
      try {
        const connection = new HubConnectionBuilder()
          .withUrl("https://localhost:44308/chatHub")
          .configureLogging(LogLevel.Information)
          .build();

        connection.on("ReceiveMessage", (message) => {
          if (message.orderId === selectedOrderId) {
            setMessages(prevMessages => [...prevMessages, message]);
          }
        });

        connection.on("MessageRead", (messageId) => {
          setMessages(prevMessages => 
            prevMessages.map(msg => 
              msg.messageId === messageId ? { ...msg, isRead: true } : msg
            )
          );
        });

        await connection.start();
        console.log("SignalR connection established successfully");
        setHubConnection(connection);
      } catch (err) {
        console.error("Error establishing SignalR connection: ", err);
        setError("Không thể kết nối đến dịch vụ chat. Vui lòng làm mới trang.");
      }
    };

    createHubConnection();

    return () => {
      if (hubConnection) {
        hubConnection.stop();
      }
    };
  }, [showChat, selectedOrderId]);
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/Auth/status`, {
          withCredentials: true
        });
        
        if (response.data.userId) {
         
          setUserInfo(response.data);
        }
      } catch (error) {
        console.error("Lỗi khi kiểm tra trạng thái đăng nhập:", error);
      }
    };

    checkLoginStatus();
  }, []);
  // Set default order when opening chat
  useEffect(() => {
    if (showChat && activeOrders.length > 0 && !selectedOrderId) {
      setSelectedOrderId(activeOrders[0].orderId);
    }
  }, [showChat, activeOrders, selectedOrderId]);

  // Fetch chat participants when order is selected
  useEffect(() => {
    if (!showChat || !selectedOrderId) return;

    const fetchParticipants = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/Chat/participants/${selectedOrderId}`);
        setParticipants(response.data);

        // Default to the customer as receiver
        const customer = response.data.find(p => p.role === "Customer");
        if (customer) {
          setReceiverId(customer.userId);
        } else {
          // If no customer, try seller
          const seller = response.data.find(p => p.role === "Seller");
          if (seller) {
            setReceiverId(seller.userId);
          }
        }
      } catch (err) {
        console.error("Error fetching participants: ", err);
        setError("Không thể tải thông tin người tham gia. Vui lòng thử lại sau.");
      }
    };

    fetchParticipants();
  }, [showChat, selectedOrderId]);

  // Fetch chat history when order is selected
  useEffect(() => {
    if (!showChat || !selectedOrderId) return;

    const fetchChatHistory = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE_URL}/Chat/history/${selectedOrderId}`);
        setMessages(response.data);
        setLoading(false);
        
        // Mark messages as read
        await axios.post(`${API_BASE_URL}/Chat/mark-read/${selectedOrderId}`);
      } catch (err) {
        console.error("Error fetching chat history: ", err);
        setError("Không thể tải lịch sử chat. Vui lòng thử lại sau.");
        setLoading(false);
      }
    };

    fetchChatHistory();
  }, [showChat, selectedOrderId]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedOrderId) return;

    try {
      await axios.post(`${API_BASE_URL}/Chat/send`, {
        orderId: selectedOrderId,
        content: newMessage,
        receiverId: receiverId
      });
      
      setNewMessage('');
    } catch (err) {
      console.error("Error sending message: ", err);
      toast.error("Không thể gửi tin nhắn. Vui lòng thử lại.");
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Toggle chat visibility
  const toggleChat = () => {
    setShowChat(!showChat);
  };

  // Change selected order
  const handleOrderChange = (e) => {
    const newOrderId = parseInt(e.target.value);
    setSelectedOrderId(newOrderId);
    setMessages([]);
    setParticipants([]);
    setLoading(true);
  };

  // Find the current order details
  const currentOrder = activeOrders.find(order => order.orderId === selectedOrderId);

  if (!showChat) {
    return (
      <button 
        onClick={toggleChat}
        className="fixed bottom-6 right-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-3 shadow-lg flex items-center"
        disabled={activeOrders.length === 0}
      >
        <MessageCircle className="w-6 h-6" />
        <span className="ml-2 font-medium">Chat đơn hàng</span>
        {activeOrders.length > 0 && (
          <span className="ml-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {activeOrders.length}
          </span>
        )}
      </button>
    );
  }

  if (activeOrders.length === 0) {
    return (
      <div className="fixed bottom-6 right-6 z-10 w-80 md:w-96 bg-white rounded-lg shadow-xl flex flex-col h-96 border">
        <div className="bg-blue-500 text-white p-3 rounded-t-lg flex justify-between items-center">
          <h2 className="font-semibold">Chat đơn hàng</h2>
          <button onClick={toggleChat} className="text-white hover:bg-blue-600 rounded-full p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">Không có đơn hàng đang giao</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-10 w-80 md:w-96 bg-white rounded-lg shadow-xl flex flex-col h-96 border">
      {/* Chat header */}
      <div className="bg-blue-500 text-white p-3 rounded-t-lg flex justify-between items-center">
        <div className="flex-1">
          <h2 className="font-semibold mb-1">Chat đơn hàng</h2>
          
          {/* Order selector */}
          <div className="relative">
            <select
              value={selectedOrderId || ''}
              onChange={handleOrderChange}
              className="bg-blue-600 text-white text-sm rounded p-1 w-full appearance-none cursor-pointer pr-8"
            >
              {activeOrders.map(order => (
                <option key={order.orderId} value={order.orderId}>
                  #{order.orderId} - {order.restaurantName} ({order.status})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-1 top-1 w-4 h-4 pointer-events-none" />
          </div>
        </div>
        <button onClick={toggleChat} className="text-white hover:bg-blue-600 rounded-full p-1 ml-2">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Customer info */}
      {currentOrder && (
        <div className="bg-blue-50 p-2 text-sm border-b">
          <p><strong>Khách hàng:</strong> {currentOrder.customerName}</p>
          <p><strong>Địa chỉ:</strong> {currentOrder.address}</p>
        </div>
      )}

      {/* Message area */}
      <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="text-center text-red-500 py-4">{error}</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            Chưa có tin nhắn nào. Hãy bắt đầu cuộc hội thoại!
          </div>
        ) : (
          messages.map((message) => {
            // Get current user ID from session storage
            const currentUserId = userInfo.userId;
            const isSentByMe = message.senderId === currentUserId;
            
            return (
              <div 
                key={message.messageId} 
                className={`my-2 ${isSentByMe ? 'text-right' : 'text-left'}`}
              >
                <div className={`inline-block rounded-lg px-4 py-2 max-w-xs break-words
                  ${isSentByMe 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200'
                  }
                  ${message.isPrivate ? 'border-l-4 border-purple-500' : ''}
                `}>
                  {!isSentByMe && (
                    <div className="text-xs font-semibold mb-1">
                      {message.senderName} 
                      {message.senderRole === "Customer" ? " (Khách hàng)" : 
                       message.senderRole === "Seller" ? " (Nhà hàng)" : ""}
                      {message.isPrivate ? ' (Riêng tư)' : ''}
                    </div>
                  )}
                  <div>{message.content}</div>
                  <div className="text-xs mt-1 opacity-75">
                    {formatTime(message.sentAt)}
                    {isSentByMe && (
                      <span className="ml-1">
                        {message.isRead ? '✓✓' : '✓'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <div className="border-t p-3 bg-white rounded-b-lg">
        <form onSubmit={handleSendMessage} className="flex flex-col">
          <div className="mb-2">
            <label className="text-sm font-medium text-gray-700">Gửi đến:</label>
            <select 
              className="ml-2 border rounded p-1 text-sm"
              value={receiverId || ''}
              onChange={(e) => setReceiverId(parseInt(e.target.value))}
              disabled={participants.length === 0}
            >
              {participants
                .filter(p => p.role !== "DeliveryPerson")
                .map(p => (
                  <option key={p.userId} value={p.userId}>
                    {p.role === "Seller" 
                      ? `${p.restaurantName} (Nhà hàng)` 
                      : `${p.fullName} (Khách hàng)`}
                  </option>
                ))
              }
            </select>
          </div>
          <div className="flex">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Nhập tin nhắn của bạn..."
              className="flex-1 border rounded-l p-2"
              disabled={!selectedOrderId}
            />
            <button 
              type="submit" 
              className="bg-blue-500 text-white p-2 rounded-r hover:bg-blue-600 flex items-center justify-center"
              disabled={!newMessage.trim() || !selectedOrderId}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeliveryChat;
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';

const OrderChat = ({ orderId }) => {
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [userInfo, setUserInfo] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [receiverId, setReceiverId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hubConnection, setHubConnection] = useState(null);
  const messagesEndRef = useRef(null);

  // Initialize SignalR connection
  useEffect(() => {
    const createHubConnection = async () => {
      try {
        const connection = new HubConnectionBuilder()
          .withUrl("https://localhost:44308/chatHub")
          .configureLogging(LogLevel.Information)
          .build();

        connection.on("ReceiveMessage", (message) => {
          setMessages(prevMessages => [...prevMessages, message]);
        });

        connection.on("MessageRead", (messageId) => {
          setMessages(prevMessages => 
            prevMessages.map(msg => 
              msg.messageId === messageId ? { ...msg, isRead: true } : msg
            )
          );
        });

        await connection.start();
        // Connect to the hub without calling JoinGroup
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
  }, [orderId]);
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const response = await axios.get("https://localhost:44308/api/Auth/status", {
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
  // Fetch chat participants
  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        const response = await axios.get(`https://localhost:44308/api/Chat/participants/${orderId}`);
        setParticipants(response.data);

        // Default to the first non-customer participant for messaging
        const nonCustomers = response.data.filter(p => p.role !== "Customer");
        if (nonCustomers.length > 0) {
          setReceiverId(nonCustomers[0].userId);
        }
      } catch (err) {
        console.error("Error fetching participants: ", err);
        setError("Không thể tải thông tin người tham gia. Vui lòng thử lại sau.");
      }
    };

    fetchParticipants();
  }, [orderId]);

  // Fetch chat history
  useEffect(() => {
    const fetchChatHistory = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`https://localhost:44308/api/Chat/history/${orderId}`);
        setMessages(response.data);
        setLoading(false);
        
        // Mark messages as read
        await axios.post(`https://localhost:44308/api/Chat/mark-read/${orderId}`);
      } catch (err) {
        console.error("Error fetching chat history: ", err);
        setError("Không thể tải lịch sử chat. Vui lòng thử lại sau.");
        setLoading(false);
      }
    };

    fetchChatHistory();
  }, [orderId]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await axios.post('https://localhost:44308/api/Chat/send', {
        orderId,
        content: newMessage,
        receiverId: receiverId
      });
      
      setNewMessage('');
    } catch (err) {
      console.error("Error sending message: ", err);
      setError("Không thể gửi tin nhắn. Vui lòng thử lại.");
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return <div className="p-4 text-center">Đang tải tin nhắn...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">{error}</div>;
  }

  return (
    <div className="flex flex-col h-96 border rounded shadow">
      {/* Chat header */}
      <div className="bg-gray-100 p-3 border-b">
        <h2 className="font-semibold">Chat đơn hàng #{orderId}</h2>
        <div className="text-sm text-gray-600">
          {participants.filter(p => p.role !== "Customer").map((p, index) => (
            <span key={p.userId}>
              {p.role === "Seller" ? `${p.restaurantName}` : `${p.fullName} (Người giao hàng)`}
              {index < participants.filter(p => p.role !== "Customer").length - 1 ? ', ' : ''}
            </span>
          ))}
        </div>
      </div>

      {/* Message area */}
      <div className="flex-1 p-4 overflow-y-auto">
        {messages.length === 0 ? (
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
                <div className={`inline-block rounded-lg px-4 py-2 max-w-xs md:max-w-md break-words
                  ${isSentByMe 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200'
                  }
                  ${message.isPrivate ? 'border-l-4 border-purple-500' : ''}
                `}>
                  {!isSentByMe && (
                    <div className="text-xs font-semibold mb-1">
                      {message.senderName} 
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
      <div className="border-t p-3">
        <form onSubmit={handleSendMessage} className="flex flex-col">
          <div className="mb-2">
            <label className="text-sm font-medium text-gray-700">Gửi đến:</label>
            <select 
              className="ml-2 border rounded p-1 text-sm"
              value={receiverId || ''}
              onChange={(e) => setReceiverId(parseInt(e.target.value))}
            >
              {participants
                .filter(p => p.role !== "Customer")
                .map(p => (
                  <option key={p.userId} value={p.userId}>
                    {p.role === "Seller" 
                      ? `${p.restaurantName} (Nhà hàng)` 
                      : `${p.fullName} (Người giao hàng)`}
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
            />
            <button 
              type="submit" 
              className="bg-blue-500 text-white px-4 rounded-r hover:bg-blue-600"
              disabled={!newMessage.trim()}
            >
              Gửi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrderChat;
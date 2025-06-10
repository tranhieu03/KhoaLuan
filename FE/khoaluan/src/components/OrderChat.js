import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import API_BASE_URL from "../config";

const OrderChat = ({ orderId }) => {
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [userInfo, setUserInfo] = useState(null);
  const [newMessage, setNewMessage] = useState('');
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
        // Không gọi JoinGroup vì phương thức này không tồn tại
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

  // Fetch chat participants - Chỉ lấy người giao hàng, bỏ nhà hàng
  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/Chat/participants/${orderId}`);
        // Lọc bỏ người bán (nhà hàng), chỉ giữ người giao hàng
        const deliveryParticipants = response.data.filter(p => p.role === "DeliveryPerson");
        setParticipants(deliveryParticipants);
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
        const response = await axios.get(`${API_BASE_URL}/Chat/history/${orderId}`);
        setMessages(response.data);
        setLoading(false);
        
        // Mark messages as read
        await axios.post(`${API_BASE_URL}/Chat/mark-read/${orderId}`);
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
      // Lấy ID của người giao hàng từ danh sách participants
      const deliveryPerson = participants[0];
      
      if (!deliveryPerson) {
        setError("Không tìm thấy người giao hàng để gửi tin nhắn.");
        return;
      }

      // Tạo object tin nhắn tạm thời để hiển thị ngay lập tức
      const tempMessage = {
        messageId: `temp-${Date.now()}`,
        orderId: orderId,
        senderId: userInfo.userId,
        senderName: userInfo.fullName,
        receiverId: deliveryPerson.userId,
        content: newMessage,
        sentAt: new Date().toISOString(),
        isRead: false,
        isPrivate: false
      };

      // Thêm tin nhắn tạm thời vào state ngay lập tức
      setMessages(prevMessages => [...prevMessages, tempMessage]);
      
      // Gửi tin nhắn tới API
      await axios.post(`${API_BASE_URL}/Chat/send`, {
        orderId,
        content: newMessage,
        receiverId: deliveryPerson.userId
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
          {participants.length > 0 
            ? `${participants[0].fullName} (Người giao hàng)`
            : "Đang chờ người giao hàng..."}
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
            const currentUserId = userInfo?.userId;
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
        <form onSubmit={handleSendMessage} className="flex">
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
            disabled={!newMessage.trim() || participants.length === 0}
          >
            Gửi
          </button>
        </form>
      </div>
    </div>
  );
};

export default OrderChat;
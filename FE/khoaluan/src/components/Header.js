import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Bell, User, LogOut, ChevronDown, Sun, Moon } from "lucide-react";
import axios from "axios";
import API_BASE_URL from "../config";

const Header = () => {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const notificationRef = useRef(null);
  const userDropdownRef = useRef(null);

  // Kiểm tra theme khi component mount
  useEffect(() => {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(darkModeMediaQuery.matches);
    
    darkModeMediaQuery.addEventListener('change', (e) => {
      setIsDarkMode(e.matches);
    });
  }, []);

  // Kiểm tra trạng thái đăng nhập
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/Auth/status`, {
          withCredentials: true
        });
        
        if (response.data.userId) {
          setIsLoggedIn(true);
          setUserInfo(response.data);
          fetchNotifications();
        }
      } catch (error) {
        console.error("Lỗi khi kiểm tra trạng thái đăng nhập:", error);
      }
    };

    checkLoginStatus();
  }, []);

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setIsUserDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Sửa hàm fetchNotifications để thêm withCredentials
  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/Notification/get-notifications`, {
        withCredentials: true
      });
      setNotifications(response.data);
      setUnreadCount(response.data.filter(notification => !notification.isRead).length);
    } catch (error) {
      console.error("Lỗi khi tải thông báo:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put(`${API_BASE_URL}/Notification/mark-all-read`);
      setNotifications(notifications.map(notif => ({ ...notif, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Lỗi khi đánh dấu đã đọc:", error);
    }
  };

  const handleNotificationsOpen = async () => {
    if (!isNotificationsOpen && unreadCount > 0) {
      try {
        await axios.post(`${API_BASE_URL}/Notification/mark-as-read`);
        fetchNotifications();
      } catch (error) {
        console.error("Lỗi khi đánh dấu đã đọc:", error);
      }
    }
    setIsNotificationsOpen(!isNotificationsOpen);
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API_BASE_URL}/Auth/logout`, {}, {
        withCredentials: true
      });
      setIsLoggedIn(false);
      setUserInfo(null);
      navigate("/");
    } catch (error) {
      console.error("Lỗi khi đăng xuất:", error);
    }
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark', !isDarkMode);
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('vi-VN', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Lấy link trang quản lý dựa trên role
  const getDashboardLink = () => {
    if (!userInfo || !userInfo.role) return "/profile";
    
    switch (userInfo.role) {
      case "Seller":
        return "/restaurant/dashboard";
      case "DeliveryPerson":
        return "/delivery/dashboard";
      default:
        return "/profile";
    }
  };

  // Lấy tên hiển thị cho trang quản lý dựa trên role
  const getDashboardName = () => {
    if (!userInfo || !userInfo.role) return "Thông tin cá nhân";
    
    switch (userInfo.role) {
      case "seller":
        return "Quản lý bán hàng";
      case "DeliveryPerson":
        return "Quản lý giao hàng";
      default:
        return "Thông tin cá nhân";
    }
  };

  return (
    <header className={`bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-lg sticky top-0 z-50 transition-colors duration-300 ${isDarkMode ? 'dark:from-gray-800 dark:via-gray-700 dark:to-gray-600' : ''}`}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo với animation */}
          <Link to="/all" className="flex items-center space-x-2 group">
            <div className="bg-white p-2 rounded-full group-hover:rotate-12 transition-transform duration-300">
              <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                F
              </div>
            </div>
            <span className="text-xl font-bold text-white group-hover:text-yellow-200 transition-colors duration-300">
              FoodDelight
            </span>
          </Link>

          {/* Navigation */}
          <div className="flex items-center space-x-6">
            {isLoggedIn ? (
              <>
                {/* Thông báo */}
                <div className="relative" ref={notificationRef}>
                  <button 
                    className="relative p-2 rounded-full hover:bg-white/20 transition-colors duration-200"
                    onClick={handleNotificationsOpen}
                  >
                    <Bell className="h-5 w-5 text-white" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                  
                  {/* Dropdown thông báo */}
                  {isNotificationsOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden z-50 border border-gray-200 dark:border-gray-600">
                      <div className="p-3 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700">
                        <h3 className="font-semibold text-gray-800 dark:text-white">Thông báo</h3>
                        <button 
                          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                          onClick={markAllAsRead}
                        >
                          Đánh dấu đã đọc
                        </button>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length > 0 ? (
                          notifications.map((notification) => (
                            <div 
                              key={notification.notificationId} 
                              className={`p-3 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150 ${
                                !notification.isRead ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                              }`}
                            >
                              <div className="font-medium text-gray-800 dark:text-white">{notification.title}</div>
                              <div className="text-sm text-gray-600 dark:text-gray-300">{notification.message}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {formatTime(notification.createdAt)}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                            Không có thông báo
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Giỏ hàng - chỉ hiển thị cho khách hàng thông thường */}
                {(!userInfo?.role || userInfo.role === "Customer") && (
                  <Link 
                    to="/cart" 
                    className="p-2 rounded-full hover:bg-white/20 transition-colors duration-200 relative"
                  >
                    <ShoppingCart className="h-5 w-5 text-white" />
                    <span className="absolute -top-1 -right-1 bg-yellow-400 text-gray-800 text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      3
                    </span>
                  </Link>
                )}
 {(!userInfo?.role || userInfo.role === "seller") && (
                  <Link 
                    to="/cart" 
                    className="p-2 rounded-full hover:bg-white/20 transition-colors duration-200 relative"
                  >
                    <ShoppingCart className="h-5 w-5 text-white" />
                    <span className="absolute -top-1 -right-1 bg-yellow-400 text-gray-800 text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      3
                    </span>
                  </Link>
                )}
                 {(!userInfo?.role || userInfo.role === "DeliveryPerson") && (
                  <Link 
                    to="/cart" 
                    className="p-2 rounded-full hover:bg-white/20 transition-colors duration-200 relative"
                  >
                    <ShoppingCart className="h-5 w-5 text-white" />
                    <span className="absolute -top-1 -right-1 bg-yellow-400 text-gray-800 text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      3
                    </span>
                  </Link>
                )}
                {/* Dark mode toggle */}
                <button
                  onClick={toggleDarkMode}
                  className="p-2 rounded-full hover:bg-white/20 transition-colors duration-200"
                  aria-label="Toggle dark mode"
                >
                  {isDarkMode ? (
                    <Sun className="h-5 w-5 text-yellow-300" />
                  ) : (
                    <Moon className="h-5 w-5 text-white" />
                  )}
                </button>

                {/* User dropdown */}
                <div className="relative" ref={userDropdownRef}>
                  <button 
                    className="flex items-center space-x-1 p-2 rounded-full hover:bg-white/20 transition-colors duration-200"
                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  >
                    {userInfo?.fullName && (
                      <span className="hidden md:inline text-sm font-medium text-white">
                        {userInfo.fullName}
                      </span>
                    )}
                    <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center text-white">
                      <User className="h-4 w-4" />
                    </div>
                    <ChevronDown className={`h-4 w-4 text-white transition-transform duration-200 ${
                      isUserDropdownOpen ? 'rotate-180' : ''
                    }`} />
                  </button>
                  
                  {/* Dropdown menu với các tùy chọn dựa trên role */}
                  {isUserDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-700">
                      <Link 
                        to={getDashboardLink()}
                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
                      >
                        {userInfo?.role === "seller" ? "🏪" : userInfo?.role === "DeliveryPerson" ? "🚚" : "👤"} {getDashboardName()}
                      </Link>
                      
                      {/* Hiển thị link đơn hàng chỉ cho khách hàng thông thường */}
                      {(!userInfo?.role || userInfo.role === "Customer") && (
                        <Link 
                          to="/customer/order" 
                          className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
                        >
                          🛒 Đơn hàng của tôi
                        </Link>
                      )}
                      {(!userInfo?.role || userInfo.role === "seller") && (
                        <Link 
                          to="/restaurant/dashboard" 
                          className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
                        >
                          quản lý bán hàng
                        </Link>
                      )}
                      
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150 flex items-center"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Đăng xuất
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <button
                  onClick={toggleDarkMode}
                  className="p-2 rounded-full hover:bg-white/20 transition-colors duration-200"
                  aria-label="Toggle dark mode"
                >
                  {isDarkMode ? (
                    <Sun className="h-5 w-5 text-yellow-300" />
                  ) : (
                    <Moon className="h-5 w-5 text-white" />
                  )}
                </button>
                <Link 
                  to="/" 
                  className="px-4 py-2 border-2 border-white text-white rounded-lg hover:bg-white/20 transition-colors duration-300 font-medium"
                >
                  Đăng nhập
                </Link>
                <Link 
                  to="/register" 
                  className="px-4 py-2 bg-white text-indigo-600 rounded-lg hover:bg-gray-100 transition-colors duration-300 font-medium shadow-md hover:shadow-lg"
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
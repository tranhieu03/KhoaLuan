import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, User, LogOut, ChevronDown, Sun, Moon, BarChart, PackageCheck } from "lucide-react";
import axios from "axios";

const DeliveryHeader = () => {
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
        const response = await axios.get("https://localhost:44308/api/Auth/status", {
          withCredentials: true
        });
        
        if (response.data.userId && response.data.role === "DeliveryPerson") {
          setIsLoggedIn(true);
          setUserInfo(response.data);
          fetchNotifications();
        } else {
          navigate("/");
        }
      } catch (error) {
        console.error("Lỗi khi kiểm tra trạng thái đăng nhập:", error);
      }
    };

    checkLoginStatus();
  }, [navigate]);

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

  const fetchNotifications = async () => {
    try {
      const response = await axios.get("https://localhost:44308/api/Notification/get-notifications", {
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
      await axios.put("https://localhost:44308/api/Notification/mark-all-read");
      setNotifications(notifications.map(notif => ({ ...notif, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Lỗi khi đánh dấu đã đọc:", error);
    }
  };

  const handleNotificationsOpen = async () => {
    if (!isNotificationsOpen && unreadCount > 0) {
      try {
        await axios.post("https://localhost:44308/api/Notification/mark-as-read");
        fetchNotifications();
      } catch (error) {
        console.error("Lỗi khi đánh dấu đã đọc:", error);
      }
    }
    setIsNotificationsOpen(!isNotificationsOpen);
  };

  const handleLogout = async () => {
    try {
      await axios.post("https://localhost:44308/api/Auth/logout", {}, {
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

  return (
    <header className={`bg-gradient-to-r from-blue-500 to-cyan-500 shadow-lg sticky top-0 z-50 transition-colors duration-300 ${isDarkMode ? 'dark:from-gray-800 dark:to-gray-700' : ''}`}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/delivery/dashboard" className="flex items-center space-x-2 group">
            <div className="bg-white p-2 rounded-full group-hover:rotate-12 transition-transform duration-300">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full flex items-center justify-center text-white font-bold">
                D
              </div>
            </div>
            <span className="text-xl font-bold text-white group-hover:text-blue-200 transition-colors duration-300">
              Delivery Partner
            </span>
          </Link>

          {/* Navigation */}
          <div className="flex items-center space-x-6">
            {isLoggedIn ? (
              <>
                {/* Thống kê */}
                <Link 
                  to="/delivery/stats" 
                  className="p-2 rounded-full hover:bg-white/20 transition-colors duration-200 flex items-center space-x-1"
                >
                  <BarChart className="h-5 w-5 text-white" />
                  <span className="hidden md:inline text-sm font-medium text-white">Thống kê</span>
                </Link>

                {/* Đơn đã giao */}
                <Link 
                  to="/delivery/completed-orders" 
                  className="p-2 rounded-full hover:bg-white/20 transition-colors duration-200 flex items-center space-x-1"
                >
                  <PackageCheck className="h-5 w-5 text-white" />
                  <span className="hidden md:inline text-sm font-medium text-white">Đơn đã giao</span>
                </Link>

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
                  
                  {/* Dropdown menu */}
                  {isUserDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-700">
                      <Link 
                        to="/delivery/profile" 
                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
                      >
                        👤 Thông tin cá nhân
                      </Link>
                      <Link 
                        to="/all" 
                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
                      >
                        Mua hàng
                      </Link>
                      <Link 
                        to="/delivery/stats" 
                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
                      >
                        📊 Thống kê doanh thu
                      </Link>
                      <Link 
                        to="/delivery/completed-orders" 
                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
                      >
                        📦 Đơn đã giao
                      </Link>
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
                  to="/delivery/login" 
                  className="px-4 py-2 border-2 border-white text-white rounded-lg hover:bg-white/20 transition-colors duration-300 font-medium"
                >
                  Đăng nhập
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default DeliveryHeader;
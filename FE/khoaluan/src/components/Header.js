import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Bell, User, LogOut, ChevronDown, Sun, Moon, Package } from "lucide-react";
import axios from "axios";
import API_BASE_URL from "../config";
import { useAuth } from "../contexts/AuthContext";

const Header = () => {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const navigate = useNavigate();
  const notificationRef = useRef(null);
  const userDropdownRef = useRef(null);
  
  const { user, isAuthenticated, logout } = useAuth();

  // Kiem tra theme khi component mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Fetch notifications khi dang nhap
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      if (user?.role === 'customer') {
        fetchCartCount();
      }
    }
  }, [isAuthenticated, user]);

  // Dong dropdown khi click ben ngoai
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
      const response = await axios.get(`${API_BASE_URL}/Notification/get-notifications`, {
        withCredentials: true
      });
      setNotifications(response.data);
      setUnreadCount(response.data.filter(notification => !notification.isRead).length);
    } catch (error) {
      console.error("Loi khi tai thong bao:", error);
    }
  };

  const fetchCartCount = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/Cart/Cart_items`, {
        withCredentials: true
      });
      setCartCount(response.data.items?.length || 0);
    } catch (error) {
      console.error("Loi khi tai so luong gio hang:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put(`${API_BASE_URL}/Notification/mark-all-read`, {}, {
        withCredentials: true
      });
      setNotifications(notifications.map(notif => ({ ...notif, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Loi khi danh dau da doc:", error);
    }
  };

  const handleNotificationsOpen = async () => {
    if (!isNotificationsOpen && unreadCount > 0) {
      try {
        await axios.post(`${API_BASE_URL}/Notification/mark-as-read`, {}, {
          withCredentials: true
        });
        fetchNotifications();
      } catch (error) {
        console.error("Loi khi danh dau da doc:", error);
      }
    }
    setIsNotificationsOpen(!isNotificationsOpen);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    document.documentElement.classList.toggle('dark', newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
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

  // Lay link trang quan ly dua tren role
  const getDashboardLink = () => {
    if (!user?.role) return "/profile";
    
    switch (user.role) {
      case "seller":
        return "/restaurant/dashboard";
      case "deliveryperson":
        return "/delivery/dashboard";
      case "admin":
        return "/admin/dashboard";
      default:
        return "/profile";
    }
  };

  // Lay ten hien thi cho trang quan ly dua tren role
  const getDashboardName = () => {
    if (!user?.role) return "Thong tin ca nhan";
    
    switch (user.role) {
      case "seller":
        return "Quan ly ban hang";
      case "deliveryperson":
        return "Quan ly giao hang";
      case "admin":
        return "Quan tri he thong";
      default:
        return "Thong tin ca nhan";
    }
  };

  // Lay icon cho role
  const getRoleIcon = () => {
    if (!user?.role) return <User className="h-4 w-4 mr-2" />;
    
    switch (user.role) {
      case "seller":
        return <span className="mr-2">🏪</span>;
      case "deliveryperson":
        return <span className="mr-2">🚚</span>;
      case "admin":
        return <span className="mr-2">⚙️</span>;
      default:
        return <User className="h-4 w-4 mr-2" />;
    }
  };

  // Kiem tra xem user co phai la customer khong
  const isCustomer = user?.role === 'customer' || !user?.role;

  return (
    <header className={`bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 shadow-lg sticky top-0 z-50 transition-colors duration-300 ${isDarkMode ? 'dark:from-gray-800 dark:via-gray-700 dark:to-gray-600' : ''}`}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo voi animation */}
          <Link to={isAuthenticated ? (isCustomer ? "/all" : getDashboardLink()) : "/"} className="flex items-center space-x-2 group">
            <div className="bg-white p-2 rounded-full group-hover:rotate-12 transition-transform duration-300 shadow-md">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                F
              </div>
            </div>
            <span className="text-xl font-bold text-white group-hover:text-yellow-200 transition-colors duration-300">
              FoodDelight
            </span>
          </Link>

          {/* Navigation */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                {/* Thong bao */}
                <div className="relative" ref={notificationRef}>
                  <button 
                    className="relative p-2 rounded-full hover:bg-white/20 transition-colors duration-200"
                    onClick={handleNotificationsOpen}
                    aria-label="Thong bao"
                  >
                    <Bell className="h-5 w-5 text-white" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-yellow-400 text-gray-800 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                  
                  {/* Dropdown thong bao */}
                  {isNotificationsOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden z-50 border border-gray-200 dark:border-gray-600">
                      <div className="p-3 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700">
                        <h3 className="font-semibold text-gray-800 dark:text-white">Thong bao</h3>
                        {unreadCount > 0 && (
                          <button 
                            className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300 font-medium"
                            onClick={markAllAsRead}
                          >
                            Danh dau da doc
                          </button>
                        )}
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length > 0 ? (
                          notifications.slice(0, 10).map((notification) => (
                            <div 
                              key={notification.notificationId} 
                              className={`p-3 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150 cursor-pointer ${
                                !notification.isRead ? 'bg-orange-50 dark:bg-orange-900/30' : ''
                              }`}
                            >
                              <div className="font-medium text-gray-800 dark:text-white text-sm">{notification.title}</div>
                              <div className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{notification.message}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {formatTime(notification.createdAt)}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>Khong co thong bao</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Gio hang - chi hien thi cho khach hang */}
                {isCustomer && (
                  <Link 
                    to="/cart" 
                    className="p-2 rounded-full hover:bg-white/20 transition-colors duration-200 relative"
                    aria-label="Gio hang"
                  >
                    <ShoppingCart className="h-5 w-5 text-white" />
                    {cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-yellow-400 text-gray-800 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {cartCount > 9 ? '9+' : cartCount}
                      </span>
                    )}
                  </Link>
                )}

                {/* Dark mode toggle */}
                <button
                  onClick={toggleDarkMode}
                  className="p-2 rounded-full hover:bg-white/20 transition-colors duration-200"
                  aria-label="Chuyen doi che do sang/toi"
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
                    className="flex items-center space-x-2 p-2 rounded-full hover:bg-white/20 transition-colors duration-200"
                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  >
                    {user?.fullName && (
                      <span className="hidden md:inline text-sm font-medium text-white max-w-32 truncate">
                        {user.fullName}
                      </span>
                    )}
                    <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center text-white border-2 border-white/50">
                      <User className="h-4 w-4" />
                    </div>
                    <ChevronDown className={`h-4 w-4 text-white transition-transform duration-200 ${
                      isUserDropdownOpen ? 'rotate-180' : ''
                    }`} />
                  </button>
                  
                  {/* Dropdown menu */}
                  {isUserDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl py-2 z-50 border border-gray-200 dark:border-gray-700">
                      {/* User info header */}
                      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                        <p className="font-medium text-gray-800 dark:text-white truncate">{user?.fullName}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                      </div>
                      
                      <Link 
                        to={getDashboardLink()}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
                        onClick={() => setIsUserDropdownOpen(false)}
                      >
                        {getRoleIcon()} {getDashboardName()}
                      </Link>
                      
                      {/* Hien thi link don hang chi cho khach hang */}
                      {isCustomer && (
                        <Link 
                          to="/customer/order" 
                          className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
                          onClick={() => setIsUserDropdownOpen(false)}
                        >
                          <Package className="h-4 w-4 mr-2" /> Don hang cua toi
                        </Link>
                      )}

                      {/* Hien thi link cho seller */}
                      {user?.role === 'seller' && (
                        <>
                          <Link 
                            to="/seller/order" 
                            className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
                            onClick={() => setIsUserDropdownOpen(false)}
                          >
                            <Package className="h-4 w-4 mr-2" /> Quan ly don hang
                          </Link>
                          <Link 
                            to="/seller/renue" 
                            className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
                            onClick={() => setIsUserDropdownOpen(false)}
                          >
                            <span className="mr-2">📊</span> Bao cao doanh thu
                          </Link>
                        </>
                      )}

                      {/* Hien thi link cho delivery */}
                      {user?.role === 'deliveryperson' && (
                        <>
                          <Link 
                            to="/delivery/order" 
                            className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
                            onClick={() => setIsUserDropdownOpen(false)}
                          >
                            <Package className="h-4 w-4 mr-2" /> Don hang giao
                          </Link>
                          <Link 
                            to="/delivery/renue" 
                            className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
                            onClick={() => setIsUserDropdownOpen(false)}
                          >
                            <span className="mr-2">📊</span> Thu nhap
                          </Link>
                        </>
                      )}
                      
                      <div className="border-t border-gray-200 dark:border-gray-700 mt-1 pt-1">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-150"
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Dang xuat
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <button
                  onClick={toggleDarkMode}
                  className="p-2 rounded-full hover:bg-white/20 transition-colors duration-200"
                  aria-label="Chuyen doi che do sang/toi"
                >
                  {isDarkMode ? (
                    <Sun className="h-5 w-5 text-yellow-300" />
                  ) : (
                    <Moon className="h-5 w-5 text-white" />
                  )}
                </button>
                <Link 
                  to="/" 
                  className="px-4 py-2 border-2 border-white text-white rounded-lg hover:bg-white/20 transition-all duration-300 font-medium"
                >
                  Dang nhap
                </Link>
                <Link 
                  to="/register" 
                  className="px-4 py-2 bg-white text-orange-600 rounded-lg hover:bg-gray-100 transition-all duration-300 font-medium shadow-md hover:shadow-lg"
                >
                  Dang ky
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

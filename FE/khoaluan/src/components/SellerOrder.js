import React, { useEffect, useState } from "react";
import axios from "axios";
import { CheckCircle, Clock, Truck, XCircle, AlertCircle } from "lucide-react";
import RestaurantHeader from "./RestaurantHeader";

import API_BASE_URL from "../config";

// Tạo axios instance với cấu hình sẵn
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json"
  }
});

function SellerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthAndFetchOrders();
  }, []);

  const checkAuthAndFetchOrders = async () => {
    try {
      setLoading(true);
      
      // Kiểm tra đăng nhập trước
      console.log("Kiểm tra trạng thái đăng nhập...");
      const authResponse = await apiClient.get("/Auth/status");
      console.log("Kết quả xác thực:", authResponse.data);
      
      if (authResponse.data && authResponse.data.userId) {
        setIsAuthenticated(true);
        // Nếu đã đăng nhập, tiếp tục tải đơn hàng
        await fetchOrders();
      } else {
        // Không đăng nhập, hiển thị lỗi phù hợp
        setIsAuthenticated(false);
        setError("Bạn chưa đăng nhập. Vui lòng đăng nhập để xem đơn hàng.");
        setLoading(false);
      }
    } catch (error) {
      console.error("Lỗi khi kiểm tra xác thực:", error);
      setIsAuthenticated(false);
      setError("Lỗi xác thực: " + (error.response?.data?.message || error.message));
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      console.log("Đang tải danh sách đơn hàng...");
      const response = await apiClient.get("/Seller/seller-orders");
      console.log("Kết quả từ API đơn hàng:", response.data);
      
      if (response.data.success) {
        setOrders(response.data.orders);
      } else {
        setError(response.data.message || "Không thể lấy danh sách đơn hàng.");
      }
    } catch (error) {
      console.error("Lỗi đầy đủ khi tải đơn hàng:", error);
      console.error("Response từ server:", error.response);
      setError(error.response?.data?.message || "Lỗi khi tải danh sách đơn hàng.");
    } finally {
      setLoading(false);
    }
  };

  const confirmOrder = async (orderId) => {
    try {
      // Tạo FormData nếu có file ảnh
      const formData = new FormData();
      
      // Thêm các trường dữ liệu vào formData
      formData.append("orderId", orderId);
      
      // Gửi request với header phù hợp
      const response = await apiClient.post(
        `/Order/confirm-order/${orderId}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        }
      );
      
      if (response.data.success) {
        setOrders(orders.map(order => 
          order.orderId === orderId ? { ...order, status: "ReadyForDelivery" } : order
        ));
        alert(response.data.message || "Đơn hàng đã được xác nhận thành công!");
      }
    } catch (error) {
      console.error("Lỗi khi xác nhận đơn hàng:", error);
      alert(error.response?.data?.message || "Lỗi khi xác nhận đơn hàng. Vui lòng thử lại!");
    }
  };

  // Thêm hàm xử lý upload ảnh
  const handleImageUpload = async (orderId, file) => {
    try {
      const formData = new FormData();
      formData.append("image", file);
      
      const response = await apiClient.post(
        `/Order/upload-order-image/${orderId}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        }
      );
      
      if (response.data.success) {
        // Cập nhật UI với ảnh mới
        setOrders(orders.map(order => 
          order.orderId === orderId ? { 
            ...order, 
            items: order.items.map(item => ({
              ...item,
              productImage: response.data.imageUrl || item.productImage
            }))
          } : order
        ));
      }
    } catch (error) {
      console.error("Lỗi khi upload ảnh:", error);
      alert("Lỗi khi upload ảnh: " + (error.response?.data?.message || error.message));
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Pending":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="mr-1 h-3 w-3" /> Đang chờ
          </span>
        );
      case "ReadyForDelivery":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Truck className="mr-1 h-3 w-3" /> Sẵn sàng giao
          </span>
        );
      case "Completed":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="mr-1 h-3 w-3" /> Hoàn thành
          </span>
        );
      case "Cancelled":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="mr-1 h-3 w-3" /> Đã hủy
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  const handleRetry = () => {
    setError("");
    setLoading(true);
    checkAuthAndFetchOrders();
  };

  const filteredOrders = orders.filter(order => 
    filter === "all" ? true : order.status.toLowerCase() === filter.toLowerCase()
  );

  const formatDate = (dateString) => {
    const options = { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleString('vi-VN', options);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { 
      style: 'currency', 
      currency: 'VND' 
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg shadow-md mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-red-800">Có lỗi xảy ra</h3>
              <p className="mt-2 text-red-700">{error}</p>
              {!isAuthenticated && (
                <p className="mt-2 text-red-700">
                  Có thể phiên đăng nhập của bạn đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.
                </p>
              )}
              <div className="mt-4">
                <button
                  onClick={handleRetry}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Thử lại
                </button>
                {!isAuthenticated && (
                  <a
                    href="/"
                    className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Đăng nhập
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <RestaurantHeader/>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        
        <h1 className="text-2xl font-bold text-gray-800 mb-4 md:mb-0">Quản Lý Đơn Hàng</h1>
        
        {/* Filter controls */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1 rounded-md text-sm font-medium ${filter === "all" ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setFilter("pending")}
            className={`px-3 py-1 rounded-md text-sm font-medium ${filter === "pending" ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Đang chờ
          </button>
          <button
            onClick={() => setFilter("readyfordelivery")}
            className={`px-3 py-1 rounded-md text-sm font-medium ${filter === "readyfordelivery" ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Sẵn sàng giao
          </button>
          <button
            onClick={() => setFilter("completed")}
            className={`px-3 py-1 rounded-md text-sm font-medium ${filter === "completed" ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Hoàn thành
          </button>
        </div>
      </div>

      {filteredOrders.length > 0 ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <ul className="divide-y divide-gray-200">
            {filteredOrders.map((order) => (
              <li key={order.orderId} className="p-4 hover:bg-gray-50">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          Đơn hàng #{order.orderId}
                        </p>
                        {getStatusBadge(order.status)}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {order.customerName} • {order.customerPhone}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 md:mt-0 text-right">
                    <p className="text-sm text-gray-500">
                      {formatDate(order.orderDate)}
                    </p>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(order.totalAmount)}
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="bg-gray-50 p-3 rounded-md">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Sản phẩm</h3>
                    <ul className="space-y-2">
                      {order.items.map((item, index) => (
                        <li key={index} className="flex justify-between">
                          <span className="text-sm text-gray-700">
                            {item.productName} × {item.quantity}
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {formatCurrency(item.price * item.quantity)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                  <div>
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">Địa chỉ:</span> {order.address}
                    </p>
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">Thanh toán:</span> {order.paymentStatus}
                    </p>
                  </div>
                  
                  {order.status === "Pending" && (
                    <button
                      onClick={() => confirmOrder(order.orderId)}
                      className="mt-3 sm:mt-0 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Xác nhận đơn hàng
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            ></path>
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">Không có đơn hàng nào</h3>
          <p className="mt-1 text-sm text-gray-500">
            {filter === "all" 
              ? "Bạn chưa có đơn hàng nào." 
              : `Không có đơn hàng nào ở trạng thái ${filter === 'pending' ? 'đang chờ' : filter === 'readyfordelivery' ? 'sẵn sàng giao' : 'hoàn thành'}.`}
          </p>
        </div>
      )}
    </div>
  );
}

export default SellerOrders;
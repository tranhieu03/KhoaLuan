import React, { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import axios from "axios";
import Header from "./Header";
import API_BASE_URL from "../config";

const API_ORDERS = `${API_BASE_URL}/Customer`;
const API_ORDERS2 = `${API_BASE_URL}/Order`;

function MyOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [reportReason, setReportReason] = useState("");
  const [reportingOrderId, setReportingOrderId] = useState(null);
  const [cancelOrderId, setCancelOrderId] = useState(null);
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    fetchOrders();
  }, []);

  const viewOrderDetails = (orderId) => {
    navigate(`/order-details/${orderId}`);
  };

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_ORDERS}/my-orders`, { 
        withCredentials: true 
      });
      
      if (response.status === 200) {
        const sortedOrders = (response.data.orders || []).sort((a, b) => b.orderId - a.orderId);
        setOrders(sortedOrders);
      } else if (response.status === 404) {
        setOrders([]);
      }
    } catch (error) {
      console.error("Lỗi khi lấy đơn hàng:", error);
      setError("Không thể tải danh sách đơn hàng. Vui lòng thử lại sau.");
    } finally {
      setIsLoading(false);
    }
  };

  const confirmReceipt = async (orderId) => {
    try {
      setIsLoading(true);
      const response = await axios.post(
        `${API_ORDERS2}/confirm-receipt/${orderId}`, 
        {}, 
        { withCredentials: true }
      );
      
      if (response.status === 200) {
        setNotification({
          type: "success",
          message: response.data.message || "Xác nhận nhận hàng thành công."
        });
        
        setTimeout(() => {
          navigate(`/review-order/${orderId}`);
        }, 2000);
        
        setOrders(orders.map(order => 
          order.orderId === orderId 
            ? { ...order, status: "Completed", paymentStatus: order.paymentMethod === "COD" ? "Paid" : order.paymentStatus } 
            : order
        ));
      }
    } catch (error) {
      console.error("Lỗi khi xác nhận nhận hàng:", error);
      setNotification({
        type: "error",
        message: error.response?.data?.message || "Không thể xác nhận nhận hàng. Vui lòng thử lại sau."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openCancelModal = (orderId) => {
    setCancelOrderId(orderId);
    setCancelReason("");
  };

  const closeCancelModal = () => {
    setCancelOrderId(null);
    setCancelReason("");
  };

  const submitCancelOrder = async () => {
    if (!cancelReason.trim()) {
      setNotification({
        type: "error",
        message: "Vui lòng nhập lý do hủy đơn hàng."
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await axios.post(
        `${API_ORDERS2}/cancel-order/${cancelOrderId}`,
        { reason: cancelReason },
        { withCredentials: true }
      );
      
      if (response.status === 200) {
        setNotification({
          type: "success",
          message: response.data.message || "Đơn hàng đã được hủy thành công."
        });
        
        setOrders(orders.map(order => 
          order.orderId === cancelOrderId 
            ? { ...order, status: "Cancelled" } 
            : order
        ));
        
        closeCancelModal();
      }
    } catch (error) {
      console.error("Lỗi khi hủy đơn hàng:", error);
      setNotification({
        type: "error",
        message: error.response?.data?.message || "Không thể hủy đơn hàng. Vui lòng thử lại sau."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openReportModal = (orderId) => {
    setReportingOrderId(orderId);
    setReportReason("");
  };

  const closeReportModal = () => {
    setReportingOrderId(null);
    setReportReason("");
  };

  const submitReport = async () => {
    if (!reportReason.trim()) {
      setNotification({
        type: "error",
        message: "Vui lòng nhập lý do báo cáo."
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await axios.post(
        `${API_ORDERS2}/report-undelivered/${reportingOrderId}`,
        { reason: reportReason },
        { withCredentials: true }
      );
      
      if (response.status === 200) {
        setNotification({
          type: "success",
          message: response.data.message || "Đã báo cáo chưa nhận được hàng thành công."
        });
        
        setOrders(orders.map(order => 
          order.orderId === reportingOrderId 
            ? { ...order, status: "DeliveryDisputed" } 
            : order
        ));
        
        closeReportModal();
      }
    } catch (error) {
      console.error("Lỗi khi báo cáo đơn hàng:", error);
      setNotification({
        type: "error",
        message: error.response?.data?.message || "Không thể báo cáo đơn hàng. Vui lòng thử lại sau."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const dismissNotification = () => {
    setNotification(null);
  };

  const filteredOrders = orders.filter(order => 
    statusFilter === "All" ? true : order.status === statusFilter
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

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'Cancelled':
        return 'bg-red-100 text-red-800';
      case 'Delivered':
        return 'bg-blue-100 text-blue-800';
      case 'DeliveryDisputed':
        return 'bg-purple-100 text-purple-800';
      case 'Pending':
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'Pending': return 'Đang xử lý';
      case 'InDelivery': return 'Đang Giao';
      case 'Completed': return 'Hoàn thành';
      case 'Cancelled': return 'Đã hủy';
      case 'Delivered': return 'Đã giao';
      case 'DeliveryDisputed': return 'Đang xác minh';
      case 'ReadyForDelivery': return 'Sẵn sàng giao';
      default: return status;
    }
  };

  if (isLoading && orders.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Header/>
      
      {notification && (
        <div className={`mb-6 p-4 rounded-md border ${
          notification.type === "success" ? "bg-green-50 border-green-500 text-green-700" : "bg-red-50 border-red-500 text-red-700"
        }`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              {notification.type === "success" ? (
                <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              {notification.message}
            </div>
            <button onClick={dismissNotification} className="text-gray-500 hover:text-gray-700">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
              </svg>
            </button>
          </div>
        </div>
      )}
      
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-4 md:mb-0">Danh Sách Đơn Hàng Của Bạn</h1>
        
        <div className="relative">
          <select
            onChange={(e) => setStatusFilter(e.target.value)}
            value={statusFilter}
            className="block appearance-none w-full md:w-48 bg-white border border-gray-300 text-gray-700 py-2 px-4 pr-8 rounded leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="All">Tất cả đơn hàng</option>
            <option value="Pending">Đang xử lý</option>
            <option value="ReadyForDelivery">Sẵn sàng giao</option>
            <option value="InDelivery">Đang giao</option>
            <option value="Delivered">Đã giao</option>
            <option value="Completed">Hoàn thành</option>
            <option value="Cancelled">Đã hủy</option>
            <option value="DeliveryDisputed">Đang xác minh</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
            </svg>
          </div>
        </div>
      </div>

      {filteredOrders.length > 0 ? (
        <div className="space-y-6">
          {filteredOrders.map((order) => (
            <div key={order.orderId} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">
                      Đơn hàng #{order.orderId}
                      <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      <span className="font-medium">Nhà hàng:</span> {order.restaurant?.name || 'Không xác định'}
                    </p>
                  </div>
                  <div className="mt-2 md:mt-0 text-right">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Ngày đặt:</span> {formatDate(order.orderDate)}
                    </p>
                    <p className="text-lg font-bold text-blue-600 mt-1">
                      {formatCurrency(order.totalAmount)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => viewOrderDetails(order.orderId)}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Xem chi tiết
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <h3 className="font-medium text-gray-700 mb-1">Thông tin giao hàng</h3>
                    <p className="text-sm text-gray-600">{order.address}</p>
                    {order.deliveryPerson && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Người giao hàng:</span> {order.deliveryPerson.fullName}
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">SĐT:</span> {order.deliveryPerson.phoneNumber}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-700 mb-1">Thông tin thanh toán</h3>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Phương thức:</span> {order.paymentMethod}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Trạng thái:</span> {order.paymentStatus}
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="font-medium text-gray-700 mb-2">Sản phẩm đã đặt</h3>
                  <div className="border-t border-gray-200 pt-4">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex justify-between py-2 border-b border-gray-100 last:border-b-0">
                        <div className="flex items-center">
                          <span className="text-gray-600">{item.productName}</span>
                          <span className="ml-2 text-sm text-gray-500">x{item.quantity}</span>
                        </div>
                        <span className="text-gray-800 font-medium">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action buttons */}
                {order.status === "Delivered" && (
                  <div className="mt-6 flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => confirmReceipt(order.orderId)}
                      className="inline-flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <div className="w-5 h-5 border-t-2 border-b-2 border-white rounded-full animate-spin mr-2"></div>
                      ) : (
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                      )}
                      Xác nhận đã nhận hàng
                    </button>
                    <button
                      onClick={() => openReportModal(order.orderId)}
                      className="inline-flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      disabled={isLoading}
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                      </svg>
                      Báo chưa nhận được hàng
                    </button>
                  </div>
                )}
                
                {/* Cancel button for Pending and ReadyForDelivery orders */}
                {(order.status === "Pending" || order.status === "ReadyForDelivery") && (
                  <div className="mt-6">
                    <button
                      onClick={() => openCancelModal(order.orderId)}
                      className="inline-flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      disabled={isLoading}
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                      Hủy đơn hàng
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
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
            {statusFilter === "All" 
              ? "Bạn chưa có đơn hàng nào." 
              : `Không có đơn hàng nào ở trạng thái ${getStatusText(statusFilter)}.`}
          </p>
        </div>
      )}

      {/* Report Undelivered Modal */}
      {reportingOrderId && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Báo chưa nhận được hàng
                    </h3>
                    <div className="mt-2">
                      <label htmlFor="reportReason" className="block text-sm font-medium text-gray-700 mb-1">
                        Lý do chưa nhận được hàng
                      </label>
                      <textarea
                        id="reportReason"
                        name="reportReason"
                        rows="4"
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value)}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 mt-1 block w-full sm:text-sm border border-gray-300 rounded-md p-2"
                        placeholder="Vui lòng nhập lý do tại sao bạn chưa nhận được hàng..."
                      ></textarea>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={submitReport}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-t-2 border-b-2 border-white rounded-full animate-spin mr-2"></div>
                  ) : null}
                  Gửi báo cáo
                </button>
                <button
                  type="button"
                  onClick={closeReportModal}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  disabled={isLoading}
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Modal */}
      {cancelOrderId && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Hủy đơn hàng
                    </h3>
                    <div className="mt-2">
                      <label htmlFor="cancelReason" className="block text-sm font-medium text-gray-700 mb-1">
                        Lý do hủy đơn hàng
                      </label>
                      <textarea
                        id="cancelReason"
                        name="cancelReason"
                        rows="4"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 mt-1 block w-full sm:text-sm border border-gray-300 rounded-md p-2"
                        placeholder="Vui lòng nhập lý do hủy đơn hàng..."
                      ></textarea>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={submitCancelOrder}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-t-2 border-b-2 border-white rounded-full animate-spin mr-2"></div>
                  ) : null}
                  Xác nhận hủy
                </button>
                <button
                  type="button"
                  onClick={closeCancelModal}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  disabled={isLoading}
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyOrders;
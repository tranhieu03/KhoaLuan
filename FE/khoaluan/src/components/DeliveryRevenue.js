import React, { useState, useEffect } from "react";
import axios from "axios";
import API_BASE_URL from "../config";
import { Calendar, ChevronLeft, ChevronRight, BarChart3, TrendingUp, Calendar as CalendarIcon } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const DeliveryRevenue = () => {
  const [filterType, setFilterType] = useState("day"); // "day", "month", "year"
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [orderStats, setOrderStats] = useState({ totalOrders: 0 });
  const [revenue, setRevenue] = useState(0);
  const [revenueHistory, setRevenueHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Format date for display
  const formatDate = (date, type) => {
    const options = {
      day: { day: '2-digit', month: '2-digit', year: 'numeric' },
      month: { month: 'long', year: 'numeric' },
      year: { year: 'numeric' }
    };
    return new Intl.DateTimeFormat('vi-VN', options[type]).format(date);
  };

  // Function to navigate dates
  const navigateDate = (direction) => {
    const newDate = new Date(selectedDate);
    
    if (filterType === "day") {
      newDate.setDate(newDate.getDate() + direction);
    } else if (filterType === "month") {
      newDate.setMonth(newDate.getMonth() + direction);
    } else if (filterType === "year") {
      newDate.setFullYear(newDate.getFullYear() + direction);
    }
    
    setSelectedDate(newDate);
  };

  // Fetch order statistics
  useEffect(() => {
    const fetchOrderStats = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(
          `${API_BASE_URL}/Reports/delivery/orders?filterType=${filterType}&date=${selectedDate.toISOString()}`,
          { withCredentials: true }
        );
        setOrderStats(response.data);
        
        // Giả lập doanh thu dựa trên số đơn hàng (trong thực tế cần API riêng)
        const avgOrderValue = 45000; // Giá trị trung bình mỗi đơn: 45,000 VND
        const commissionRate = 0.10; // Tỷ lệ hoa hồng: 10%
        const calculatedRevenue = response.data.totalOrders * avgOrderValue * commissionRate;
        setRevenue(calculatedRevenue);
        
        // Fetch revenue history for chart
        await fetchRevenueHistory();
      } catch (error) {
        console.error("Error fetching order statistics:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderStats();
  }, [filterType, selectedDate]);

  // Fetch revenue history for chart (simulated data)
  const fetchRevenueHistory = async () => {
    // Trong thực tế, cần API riêng để lấy lịch sử doanh thu
    // Ở đây chúng ta giả lập dữ liệu

    // Tạo mảng các ngày/tháng/năm để hiển thị trên biểu đồ
    const historyData = [];
    const current = new Date(selectedDate);
    
    if (filterType === "day") {
      // Show hourly data for the selected day
      for (let i = 0; i < 24; i++) {
        const hour = i < 10 ? `0${i}:00` : `${i}:00`;
        const orderCount = Math.floor(Math.random() * 3); // 0-2 orders per hour
        const hourlyRevenue = orderCount * 45000 * 0.1; // Same calculation as above
        
        historyData.push({
          name: hour,
          revenue: hourlyRevenue,
          orders: orderCount
        });
      }
    } else if (filterType === "month") {
      // Show daily data for the selected month
      const daysInMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
      
      for (let i = 1; i <= daysInMonth; i++) {
        const orderCount = Math.floor(Math.random() * 8); // 0-7 orders per day
        const dailyRevenue = orderCount * 45000 * 0.1;
        
        historyData.push({
          name: `${i}`,
          revenue: dailyRevenue,
          orders: orderCount
        });
      }
    } else if (filterType === "year") {
      // Show monthly data for the selected year
      const months = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"];
      
      for (let i = 0; i < 12; i++) {
        const orderCount = Math.floor(Math.random() * 60); // 0-59 orders per month
        const monthlyRevenue = orderCount * 45000 * 0.1;
        
        historyData.push({
          name: months[i],
          revenue: monthlyRevenue,
          orders: orderCount
        });
      }
    }
    
    setRevenueHistory(historyData);
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white flex items-center">
        <TrendingUp className="mr-2" /> Doanh Thu Giao Hàng
      </h2>

      {/* Filter controls */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex space-x-2">
          <button 
            onClick={() => setFilterType("day")} 
            className={`px-4 py-2 rounded-md ${filterType === "day" 
              ? "bg-blue-600 text-white" 
              : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"}`}
          >
            Ngày
          </button>
          <button 
            onClick={() => setFilterType("month")} 
            className={`px-4 py-2 rounded-md ${filterType === "month" 
              ? "bg-blue-600 text-white" 
              : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"}`}
          >
            Tháng
          </button>
          <button 
            onClick={() => setFilterType("year")} 
            className={`px-4 py-2 rounded-md ${filterType === "year" 
              ? "bg-blue-600 text-white" 
              : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"}`}
          >
            Năm
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button 
            onClick={() => navigateDate(-1)} 
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          <div className="flex items-center px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md">
            <CalendarIcon className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400" />
            <span>{formatDate(selectedDate, filterType)}</span>
          </div>
          
          <button 
            onClick={() => navigateDate(1)} 
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Statistics cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-blue-100">Tổng Đơn Hàng</p>
              <h3 className="text-3xl font-bold mt-2">
                {isLoading ? "..." : orderStats.totalOrders}
              </h3>
              <p className="text-blue-100 mt-2">đơn hoàn thành</p>
            </div>
            <div className="bg-white/20 p-4 rounded-full">
              <BarChart3 className="h-8 w-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-green-100">Doanh Thu</p>
              <h3 className="text-3xl font-bold mt-2">
                {isLoading ? "..." : formatCurrency(revenue)}
              </h3>
              <p className="text-green-100 mt-2">hoa hồng (10%)</p>
            </div>
            <div className="bg-white/20 p-4 rounded-full">
              <Calendar className="h-8 w-8" />
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="mt-6">
        <h3 className="font-semibold text-lg mb-4 text-gray-800 dark:text-white">
          Biểu Đồ Doanh Thu {filterType === "day" ? "Theo Giờ" : filterType === "month" ? "Theo Ngày" : "Theo Tháng"}
        </h3>
        
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg" style={{ height: "400px" }}>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={revenueHistory}
                margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" orientation="left" stroke="#3B82F6" />
                <YAxis yAxisId="right" orientation="right" stroke="#10B981" />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === "revenue") {
                      return [formatCurrency(value), "Doanh Thu"];
                    }
                    return [value, "Đơn Hàng"];
                  }}
                  labelFormatter={(label) => {
                    if (filterType === "day") {
                      return `${label} - ${selectedDate.toLocaleDateString('vi-VN')}`;
                    } else if (filterType === "month") {
                      return `Ngày ${label}/${selectedDate.getMonth() + 1}/${selectedDate.getFullYear()}`;
                    } else {
                      return `Tháng ${label}/${selectedDate.getFullYear()}`;
                    }
                  }}
                />
                <Legend />
                <Bar yAxisId="right" dataKey="orders" name="Đơn Hàng" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="revenue" name="Doanh Thu" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Additional information */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-800 dark:text-blue-200 text-sm">
        <p>
          <strong>Lưu ý:</strong> Doanh thu được tính dựa trên 10% hoa hồng từ giá trị đơn hàng. 
          Số liệu này chỉ là ước tính và có thể khác với thanh toán thực tế.
        </p>
      </div>
    </div>
  );
};

export default DeliveryRevenue;
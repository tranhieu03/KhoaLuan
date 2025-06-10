import { useState, useEffect } from "react";
import { Calendar, ChevronDown, DollarSign, BarChart, ShoppingBag, PieChart, RefreshCw } from "lucide-react";
import { BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RePieChart, Pie, Cell } from "recharts";
import RestaurantHeader from "./RestaurantHeader";
import API_BASE_URL from "../config";


export default function ReportDashboard() {
  const [activeTab, setActiveTab] = useState("revenue");
  const [filterType, setFilterType] = useState("day");
  const [date, setDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [error, setError] = useState("");
  

  // Data states
  const [revenue, setRevenue] = useState(0);
  const [productRevenue, setProductRevenue] = useState([]);
  const [productNames, setProductNames] = useState({});
  const [userRole, setUserRole] = useState(""); 

  const baseUrl = API_BASE_URL;

  // Fetch user role on component mount
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const response = await fetch(`${baseUrl}/Auth/status`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const userData = await response.json();
          setUserRole(userData.role);
        }
      } catch (error) {
        console.error("Không thể lấy thông tin người dùng:", error);
      }
    };

    fetchUserRole();
  }, []);

  // Định dạng ngày tháng cho API request
  const formatDateForApi = (date) => {
    return date.toISOString().split('T')[0];
  };

  // Định dạng hiển thị ngày tháng
  const formatDisplayDate = (date) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('vi-VN', options);
  };

  // Lấy tên sản phẩm từ API
  useEffect(() => {
    const fetchProductNames = async () => {
      try {
        const response = await fetch(`${baseUrl}/Product/listsanphamcuahang`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const products = await response.json();
          const productNameMap = {};
          products.forEach(product => {
            productNameMap[product.productId] = product.name;
          });
          setProductNames(productNameMap);
        }
      } catch (error) {
        console.error("Không thể lấy thông tin sản phẩm:", error);
      }
    };

    if (userRole === "seller") {
      fetchProductNames();
    }
  }, [userRole]);

  const fetchData = async () => {
    setIsLoading(true);
    setError("");
    
    try {
      if (userRole === "seller") {
        // Nếu là người bán - Lấy doanh thu tổng
        if (activeTab === "revenue" || activeTab === "product") {
          const revenueResponse = await fetch(
            `${baseUrl}/reports/seller/revenue?filterType=${filterType}&date=${formatDateForApi(date)}`, 
            { credentials: 'include' }
          );
          
          if (!revenueResponse.ok) {
            const errorData = await revenueResponse.json();
            throw new Error(errorData.message || "Không thể lấy dữ liệu doanh thu");
          }
          
          const revenueData = await revenueResponse.json();
          setRevenue(revenueData.revenue);
        }
        
        // Lấy doanh thu theo sản phẩm
        if (activeTab === "revenue" || activeTab === "product") {
          const productRevenueResponse = await fetch(
            `${baseUrl}/reports/seller/product-revenue?filterType=${filterType}&date=${formatDateForApi(date)}`,
            { credentials: 'include' }
          );
          
          if (!productRevenueResponse.ok) {
            throw new Error("Không thể lấy dữ liệu doanh thu sản phẩm");
          }
          
          const productRevenueData = await productRevenueResponse.json();
          setProductRevenue(productRevenueData);
        }
      }
    } catch (error) {
      setError(error.message);
      console.error("Lỗi khi tải dữ liệu:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterType, date, activeTab, userRole]);

  // Xử lý thay đổi kiểu lọc
  const handleFilterChange = (type) => {
    setFilterType(type);
    setIsDropdownOpen(false);
  };

  // Xử lý thay đổi ngày
  const handleDateChange = (e) => {
    if (filterType === "year") {
      const newDate = new Date();
      newDate.setFullYear(e.target.value);
      setDate(newDate);
    } else {
      setDate(new Date(e.target.value));
    }
  };

  // Format số tiền VND
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Chuẩn bị dữ liệu cho biểu đồ cột
  const chartData = productRevenue
    .map(item => ({
      name: productNames[item.productId] || `Sản phẩm #${item.productId}`,
      doanhthu: item.totalRevenue
    }))
    .sort((a, b) => b.doanhthu - a.doanhthu)
    .slice(0, 10);

  // Chuẩn bị dữ liệu cho biểu đồ tròn
  const pieData = productRevenue
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 5)
    .map(item => ({
      name: productNames[item.productId] || `Sản phẩm #${item.productId}`,
      value: item.totalRevenue
    }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  // Tab content cho báo cáo doanh thu tổng quát
  const RevenueReport = () => (
    
    <div className="mt-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tổng doanh thu */}
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 flex-1">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-700">Tổng Doanh Thu</h2>
            <DollarSign className="text-blue-500" size={24} />
          </div>
          <p className="text-3xl font-bold text-blue-600">{isLoading ? "..." : formatCurrency(revenue)}</p>
          <p className="text-sm text-gray-500 mt-2">
            {filterType === "day" ? `Ngày ${formatDisplayDate(date)}` : 
             filterType === "month" ? `Tháng ${date.getMonth() + 1}/${date.getFullYear()}` : 
             `Năm ${date.getFullYear()}`}
          </p>
        </div>
        
        {/* Số lượng sản phẩm bán ra */}
        <div className="bg-green-50 p-6 rounded-lg border border-green-200 flex-1">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-700">Số Sản Phẩm</h2>
            <ShoppingBag className="text-green-500" size={24} />
          </div>
          <p className="text-3xl font-bold text-green-600">{isLoading ? "..." : productRevenue.length}</p>
          <p className="text-sm text-gray-500 mt-2">Số lượng sản phẩm có doanh thu</p>
        </div>
      </div>
      
      {/* Biểu đồ doanh thu theo sản phẩm */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Doanh Thu Theo Sản Phẩm</h2>
        
        {isLoading ? (
          <div className="h-64 flex items-center justify-center bg-gray-50">
            <p>Đang tải dữ liệu...</p>
          </div>
        ) : chartData.length > 0 ? (
          <div className="h-64 md:h-96">
            <ResponsiveContainer width="100%" height="100%">
              <ReBarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="doanhthu" name="Doanh thu" fill="#4f46e5" />
              </ReBarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
            <p className="text-gray-500">Không có dữ liệu sản phẩm nào trong thời gian này</p>
          </div>
        )}
      </div>
    </div>
    
  );
  
  // Tab content cho báo cáo chi tiết theo sản phẩm
  const ProductReport = () => (
    <div className="mt-6">
      {/* Biểu đồ tròn cho 5 sản phẩm hàng đầu */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Top 5 Sản Phẩm Theo Doanh Thu</h2>
        
        {isLoading ? (
          <div className="h-64 flex items-center justify-center bg-gray-50">
            <p>Đang tải dữ liệu...</p>
          </div>
        ) : pieData.length > 0 ? (
          <div className="h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
            <p className="text-gray-500">Không có dữ liệu sản phẩm nào trong thời gian này</p>
          </div>
        )}
      </div>
      
      {/* Bảng chi tiết cho tất cả sản phẩm */}
      {productRevenue.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Chi Tiết Doanh Thu Theo Sản Phẩm</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 uppercase tracking-wider">ID</th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 uppercase tracking-wider">Sản phẩm</th>
                  <th className="py-3 px-4 text-right text-sm font-medium text-gray-600 uppercase tracking-wider">Doanh thu</th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 uppercase tracking-wider">Số lượng bán</th>
                  <th className="py-3 px-4 text-right text-sm font-medium text-gray-600 uppercase tracking-wider">Tỷ lệ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {productRevenue.map((item, index) => {
                  const percentage = (item.totalRevenue / revenue) * 100;
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-800">{item.productId}</td>
                      <td className="py-3 px-4 text-sm text-gray-800">
                        {productNames[item.productId] || `Sản phẩm #${item.productId}`}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-800 text-right">
                        {formatCurrency(item.totalRevenue)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-800 text-center" >{item.totalQuantitySold}</td>
                      <td className="py-3 px-4 text-sm text-gray-800 text-right">
                        {percentage.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white">
      {/* Header tràn full width */}
      <div className="w-full">
        <RestaurantHeader />
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Hệ Thống Báo Cáo</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {/* Tab navigation */}
      <div className="flex items-center border-b border-gray-200 mb-4">
        {userRole === "seller" && (
          <>
            <button
              onClick={() => setActiveTab("revenue")}
              className={`mr-4 py-2 px-4 font-medium ${activeTab === "revenue" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
            >
              <div className="flex items-center">
                <BarChart size={16} className="mr-2" />
                Doanh Thu Tổng Quát
              </div>
            </button>
            <button
              onClick={() => setActiveTab("product")}
              className={`mr-4 py-2 px-4 font-medium ${activeTab === "product" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
            >
              <div className="flex items-center">
                <PieChart size={16} className="mr-2" />
                Chi Tiết Sản Phẩm
              </div>
            </button>
          </>
        )}
        
        <button 
          onClick={fetchData}
          className="ml-auto py-2 px-4 text-gray-600 hover:text-gray-900 flex items-center"
          disabled={isLoading}
        >
          <RefreshCw size={16} className={`mr-1 ${isLoading ? "animate-spin" : ""}`} />
          Làm mới
        </button>
      </div>
      
      {/* Filter controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Bộ lọc thời gian */}
        <div className="relative w-full sm:w-1/3">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full flex items-center justify-between bg-gray-50 px-4 py-2 border border-gray-300 rounded"
          >
            <span className="capitalize">{filterType === "day" ? "Ngày" : filterType === "month" ? "Tháng" : "Năm"}</span>
            <ChevronDown size={16} />
          </button>
          
          {isDropdownOpen && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded shadow-lg">
              <ul>
                <li 
                  onClick={() => handleFilterChange("day")}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                >
                  Ngày
                </li>
                <li 
                  onClick={() => handleFilterChange("month")}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                >
                  Tháng
                </li>
                <li 
                  onClick={() => handleFilterChange("year")}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                >
                  Năm
                </li>
              </ul>
            </div>
          )}
        </div>
        
        {/* Chọn ngày/tháng/năm */}
        <div className="relative w-full sm:w-2/3">
          <div className="flex items-center">
            {filterType === "year" ? (
              <input
                type="number"
                value={date.getFullYear()}
                min="2000"
                max="2100"
                onChange={handleDateChange}
                className="w-full px-4 py-2 border border-gray-300 rounded"
              />
            ) : (
              <input
                type={filterType === "day" ? "date" : "month"}
                onChange={handleDateChange}
                className="w-full px-4 py-2 border border-gray-300 rounded"
              />
            )}
            <Calendar className="absolute right-3 text-gray-400" size={20} />
          </div>
        </div>
      </div>
      
      {/* Content based on active tab */}
      {activeTab === "revenue" && userRole === "seller" && <RevenueReport />}
      {activeTab === "product" && userRole === "seller" && <ProductReport />}
      
      {/* Display appropriate message if wrong role */}
      {userRole !== "seller" && (
        <div className="mt-6 p-8 bg-gray-50 rounded-lg text-center">
          <p className="text-gray-600">Bạn cần đăng nhập với vai trò người bán để xem báo cáo này.</p>
        </div>
      )}
    </div>
    </div>
    </div>
  );
}
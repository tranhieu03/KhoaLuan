import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import SellerDashboard from "./components/SellerDashboard";
import ProductListingPage from "./components/ProductListingPage"; // Thêm import này
import ProductDetailPage from "./components/ProductDetailPage"; // Thêm import này
import RestaurantProductsPage from "./components/RestaurantProductsPage";
import Cart from "./components/Cart";
import SellerOrder from "./components/SellerOrder";
import DeliveryPersonDashboard from "./components/DeliveryDashboard";
import DeliveryOrder from "./components/DeliveryOrder";
import MyOrders from "./components/CustomerOrder";
import ForgotPassword from "./components/ForgotPassword";
import AddressSearch from "./components/AddressSearch";
import CreateRestaurant from "./components/Restaurant";
import Order from "./components/Order";
import OrderDetailsPage from "./components/OrderDetailsPage";
import ReviewOrder from "./components/ReviewOder";
import UserProfile from "./components/UserProfile";
import AdminLogin from "./components/AdminLogin";
import AdminDashboard from "./components/AdminDashboard";
import RestaurantManagement from "./components/AdminRestaurants";
import RevenueReportComponent from "./components/RestaurantRevenueReport";
import VoucherManagement from "./components/AdminVoucher";
import DeliveryPersonProfile from "./components/DeliveryPersonProfile";
import DeliveryRevenue from "./components/DeliveryRevenue";
import RestaurantInfo from "./components/RestaurantInfo";
import PaymentResult from "./components/PaymentResult";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/restaurant/dashboard" element={<SellerDashboard />} />
        <Route path="/all" element={<ProductListingPage />} /> {/* Thay AllProducts bằng ProductListingPage */}
        <Route path="/product/:productId" element={<ProductDetailPage />} /> {/* Thêm route cho chi tiết sản phẩm */}
        <Route path="/restaurant-products/:restaurantId" element={<RestaurantProductsPage />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/seller/order" element={<SellerOrder />} />
        <Route path="/delivery/dashboard" element={<DeliveryPersonDashboard/>} />
        <Route path="/delivery/order" element={<DeliveryOrder />} />
        <Route path="/customer/order" element={<MyOrders />} /> {/* Sửa "Customer" thành "customer" cho nhất quán */}
        <Route path="/forgotpassword" element={<ForgotPassword />} />
        <Route path="/address" element={<AddressSearch />} />
        <Route path="/create/restaurant" element={<CreateRestaurant />} />
        <Route path="/order" element={<Order />} />
        <Route path="/order-details/:orderId" element={<OrderDetailsPage />} />
        <Route path="/review-order/:orderId" element={<ReviewOrder />} />
        <Route path="/profile" element={<UserProfile />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/restaurants" element={<RestaurantManagement />} />
        <Route path="/seller/renue" element={<RevenueReportComponent/>} />
        <Route path="/admin/voucher" element={<VoucherManagement />} />
        <Route path="/delivery/profile" element={<DeliveryPersonProfile />} />
        <Route path="/delivery/renue" element={<DeliveryRevenue/>}/>
        <Route path="/restaurant/info" element={<RestaurantInfo />} />
        <Route path="/payment-result" element={<PaymentResult />} />
      </Routes>
    </Router>
  );
}

export default App;
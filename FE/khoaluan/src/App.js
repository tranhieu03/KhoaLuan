import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

// Auth pages
import Login from "./components/Login";
import Register from "./components/Register";
import ForgotPassword from "./components/ForgotPassword";
import AdminLogin from "./components/AdminLogin";

// Customer pages
import ProductListingPage from "./components/ProductListingPage";
import ProductDetailPage from "./components/ProductDetailPage";
import RestaurantProductsPage from "./components/RestaurantProductsPage";
import Cart from "./components/Cart";
import Order from "./components/Order";
import OrderDetailsPage from "./components/OrderDetailsPage";
import MyOrders from "./components/CustomerOrder";
import ReviewOrder from "./components/ReviewOder";
import UserProfile from "./components/UserProfile";
import AddressSearch from "./components/AddressSearch";
import PaymentResult from "./components/PaymentResult";

// Seller pages
import SellerDashboard from "./components/SellerDashboard";
import SellerOrder from "./components/SellerOrder";
import CreateRestaurant from "./components/Restaurant";
import RevenueReportComponent from "./components/RestaurantRevenueReport";
import RestaurantInfo from "./components/RestaurantInfo";

// Delivery pages
import DeliveryPersonDashboard from "./components/DeliveryDashboard";
import DeliveryOrder from "./components/DeliveryOrder";
import DeliveryPersonProfile from "./components/DeliveryPersonProfile";
import DeliveryRevenue from "./components/DeliveryRevenue";

// Admin pages
import AdminDashboard from "./components/AdminDashboard";
import RestaurantManagement from "./components/AdminRestaurants";
import VoucherManagement from "./components/AdminVoucher";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgotpassword" element={<ForgotPassword />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Customer routes */}
          <Route 
            path="/all" 
            element={
              <ProtectedRoute allowedRoles={["customer"]}>
                <ProductListingPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/product/:productId" 
            element={
              <ProtectedRoute allowedRoles={["customer"]}>
                <ProductDetailPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/restaurant-products/:restaurantId" 
            element={
              <ProtectedRoute allowedRoles={["customer"]}>
                <RestaurantProductsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/cart" 
            element={
              <ProtectedRoute allowedRoles={["customer"]}>
                <Cart />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/order" 
            element={
              <ProtectedRoute allowedRoles={["customer"]}>
                <Order />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/order-details/:orderId" 
            element={
              <ProtectedRoute allowedRoles={["customer", "seller", "delivery"]}>
                <OrderDetailsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/customer/order" 
            element={
              <ProtectedRoute allowedRoles={["customer"]}>
                <MyOrders />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/review-order/:orderId" 
            element={
              <ProtectedRoute allowedRoles={["customer"]}>
                <ReviewOrder />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute allowedRoles={["customer"]}>
                <UserProfile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/address" 
            element={
              <ProtectedRoute allowedRoles={["customer"]}>
                <AddressSearch />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/payment-result" 
            element={
              <ProtectedRoute allowedRoles={["customer"]}>
                <PaymentResult />
              </ProtectedRoute>
            } 
          />

          {/* Seller routes */}
          <Route 
            path="/restaurant/dashboard" 
            element={
              <ProtectedRoute allowedRoles={["seller"]}>
                <SellerDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/seller/order" 
            element={
              <ProtectedRoute allowedRoles={["seller"]}>
                <SellerOrder />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/create/restaurant" 
            element={
              <ProtectedRoute allowedRoles={["seller"]}>
                <CreateRestaurant />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/seller/renue" 
            element={
              <ProtectedRoute allowedRoles={["seller"]}>
                <RevenueReportComponent />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/restaurant/info" 
            element={
              <ProtectedRoute allowedRoles={["seller"]}>
                <RestaurantInfo />
              </ProtectedRoute>
            } 
          />

          {/* Delivery routes */}
          <Route 
            path="/delivery/dashboard" 
            element={
              <ProtectedRoute allowedRoles={["delivery"]}>
                <DeliveryPersonDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/delivery/order" 
            element={
              <ProtectedRoute allowedRoles={["delivery"]}>
                <DeliveryOrder />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/delivery/profile" 
            element={
              <ProtectedRoute allowedRoles={["delivery"]}>
                <DeliveryPersonProfile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/delivery/renue" 
            element={
              <ProtectedRoute allowedRoles={["delivery"]}>
                <DeliveryRevenue />
              </ProtectedRoute>
            } 
          />

          {/* Admin routes */}
          <Route 
            path="/admin/dashboard" 
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/restaurants" 
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <RestaurantManagement />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/voucher" 
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <VoucherManagement />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

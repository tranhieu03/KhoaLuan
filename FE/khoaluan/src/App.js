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

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/seller" element={<SellerDashboard />} />
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
      </Routes>
    </Router>
  );
}

export default App;
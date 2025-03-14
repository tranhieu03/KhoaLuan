import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import Home from "./components/Home";
import SellerDashboard from "./components/SellerDashboard";
import AllProducts from "./components/AllProducts";
import ProductsByRestaurant from "./components/ProductsByRestaurant";
import Cart from "./components/Cart";
import SellerOrder from "./components/SellerOrder";
import DeliveryDashboard from "./components/DeliveryDashboard";
import DeliveryOrder from "./components/DeliveryOrder";
import CustomerOrder from "./components/CustomerOrder";
import ForgotPassword from "./components/ForgotPassword";
import TestRestaurant from "./components/TestRestaurants";
import TestMap from "./components/TestMap";
import AddressSearch from "./components/AddressSearch";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/home" element={<Home />} />
        <Route path="/seller" element={<SellerDashboard />} />
        <Route path="/all" element={<AllProducts />} />
        <Route path="/restaurant/:restaurantId" element={<ProductsByRestaurant />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/seller/order" element={<SellerOrder />} />
        <Route path="/delivery" element={<DeliveryDashboard />} />
        <Route path="/delivery/order" element={<DeliveryOrder />} />
        <Route path="/Customer/order" element={<CustomerOrder />} />
        <Route path="/forgotpassword" element={<ForgotPassword />} />
        <Route path="/test" element={<TestRestaurant />} />
        <Route path="/testmap" element={<TestMap />} />
        <Route path="/address" element={<AddressSearch />} />
      </Routes>
    </Router>
  );
}

export default App;

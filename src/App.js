import React from "react";
import { Fragment } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { publicRoutes } from "./routes";
import DefaltLayout from "./components/Layout/DefaltLayout";
function App() {
  return (
    <Router>
      <Routes>
        {publicRoutes.map((route, index) => {
          const Page = route.component;
          const Layout = route.layout === null ? Fragment : DefaltLayout;
          return (
            <Route
              key={index}
              path={route.path}
              element={
                <Layout>
                  <Page />
                </Layout>
              }
            />
          );
        })}
      </Routes>
    </Router>
  );
}

export default App;
{
  /* <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/home" element={<Home />} />
        <Route path="/seller" element={<SellerDashboard />} />
        <Route path="/all" element={<AllProducts />} />
        <Route
          path="/restaurant/:restaurantId"
          element={<ProductsByRestaurant />}
        />
        <Route path="/cart" element={<Cart />} />
        <Route path="/seller/order" element={<SellerOrder />} />
        <Route path="/delivery" element={<DeliveryDashboard />} />
        <Route path="/delivery/order" element={<DeliveryOrder />} /> */
}

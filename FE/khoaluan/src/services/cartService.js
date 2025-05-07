import axios from "axios";

const API_URL = "https://localhost:44308/api/Cart";
axios.defaults.withCredentials = true; // Gửi cookie session

export const addToCart = async (productId, quantity) => {
    const response = await axios.post(`${API_URL}/Cart_add`, {
      productId,
      quantity,
    });
    return response.data;
  };
  export const getCartItems = async () => {
    const response = await axios.get(`${API_URL}/Cart_items`);
    return response.data;
  };
  
  export const removeFromCart = async (cartItemId) => {
    const response = await axios.delete(`${API_URL}/remove/${cartItemId}`);
    return response.data;
  };
  // export const createOrder = async (orderData) => {
  //   const response = await axios.post("https://localhost:44308/api/Order/create-order", orderData);
  //   return response.data;
  // };
  export const createOrder = async (orderData) => {
    try {
      const response = await axios.post("https://localhost:44308/api/Order/create-order", orderData, {
        withCredentials: true, // Gửi session cookie (nếu cần)
      });
  
      if (response.data.paymentUrl) {
        // Nếu có URL thanh toán VNPAY, chuyển hướng người dùng
        window.location.href = response.data.paymentUrl;
      }
  
      return response.data;
    } catch (error) {
      console.error("Lỗi khi tạo đơn hàng:", error);
      throw error.response?.data || { message: "Không thể tạo đơn hàng" };
    }
  };
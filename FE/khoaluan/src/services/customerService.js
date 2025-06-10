import axios from "axios";
import API_BASE_URL from "../config";

const API_URL = `${API_BASE_URL}/Product`; // Đảm bảo API_BASE_URL được định nghĩa trong config.js
axios.defaults.withCredentials = true; // Gửi cookie session

export const getAllProducts = async (page, pageSize) => {
  const response = await axios.get(`${API_URL}/all-products`, {
    params: { page, pageSize },
  });
  return response.data;
};

export const getProductsByRestaurant = async (restaurantId) => {
  try {
    const response = await axios.get(`${API_URL}/products-by-restaurant/${restaurantId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching products by restaurant:", error.response?.data || error.message);
    throw error;
  }
};


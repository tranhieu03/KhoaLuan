import axios from "axios";

const API_URL = "https://localhost:44308/api/Customer";
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


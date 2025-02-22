import axios from "axios";

const API_URL = "https://localhost:44308/api/Auth";

axios.defaults.withCredentials = true; // Đảm bảo gửi cookie session với mọi request

export const register = async (data) => {
  const response = await axios.post(`${API_URL}/register`, data);
  return response.data;
};

export const login = async (data) => {
  const response = await axios.post(`${API_URL}/login`, data);
  return response.data;
};

export const getStatus = async () => {
  try {
    const response = await axios.get(`${API_URL}/status`, { withCredentials: true });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const logout = async () => {
  const response = await axios.post(`${API_URL}/logout`);
  return response.data;
};

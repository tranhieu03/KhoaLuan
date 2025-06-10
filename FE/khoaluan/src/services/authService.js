// src/services/authService.js
import axios from "axios";
import API_BASE_URL from "../config";

const API_URL = `${API_BASE_URL}/Auth`; // Replace with your actual API URL

const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true // This is crucial for session cookies
});
export const register = async (formData) => {
  try {
    // We need to use FormData to handle file uploads
    // The formData object is already prepared in the Register component
    const response = await axios.post(`${API_URL}/register`, formData, {
      headers: {
        "Content-Type": "multipart/form-data", // Important for file uploads
      },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const verifyOtp = async (otpData) => {
  const response = await axios.post(`${API_URL}/verify-otp`, otpData);
  return response.data;
};
export const resendOtp = async (data) => {
  try {
    const response = await axios.post(`${API_URL}/resend-otp`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};
export const login = async (credentials) => {
  const response = await axiosInstance.post("/login", credentials);
  return response.data;
};

export const checkLoginStatus = async () => {
  try {
    const response = await axiosInstance.get("/status");
    return response.data;
  } catch (error) {
    return null;
  }
};

export const logout = async () => {
  try {
    await axiosInstance.post("/logout");
    localStorage.removeItem("user");
  } catch (error) {
    console.error("Logout error:", error);
  }
};

export const getCurrentUser = () => {
  return JSON.parse(localStorage.getItem("user"));
};
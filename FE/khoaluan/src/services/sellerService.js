import axios from "axios";
import API_BASE_URL from "../config";

const API_URL = `${API_BASE_URL}/Product`;
axios.defaults.withCredentials = true; // Đảm bảo gửi cookie session với mọi request

export const create = async (data) => {
  const response = await axios.post(`${API_URL}/create`, data);
  return response.data;
};

export const listsanphamcuahang = async (data) => {
  const response = await axios.get(`${API_URL}/listsanphamcuahang`, data);
  return response.data;
};
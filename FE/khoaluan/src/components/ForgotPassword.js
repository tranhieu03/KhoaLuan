import React, { useState } from "react";
import axios from "axios";
import API_BASE_URL from "../config";

const API_URL = `${API_BASE_URL}/Auth`; // Đổi URL theo API của bạn

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState(1); // 1: Nhập email, 2: Nhập OTP, 3: Nhập mật khẩu mới
  const [message, setMessage] = useState("");

  // Gửi yêu cầu lấy OTP
  const handleSendOTP = async () => {
    try {
      const response = await axios.post(`${API_URL}/forgot-password`, { email });
      setMessage(response.data.message);
      setStep(2);
    } catch (error) {
      setMessage(error.response?.data?.message || "Lỗi khi gửi OTP.");
    }
  };

  // Xác minh OTP
  const handleVerifyOTP = async () => {
    try {
      const response = await axios.post(`${API_URL}/verify-otp`, { email, otp });
      setMessage(response.data.message);
      setStep(3);
    } catch (error) {
      setMessage(error.response?.data?.message || "OTP không hợp lệ.");
    }
  };

  // Đặt lại mật khẩu mới
  const handleResetPassword = async () => {
    try {
      const response = await axios.post(`${API_URL}/reset-password`, {
        email,
        otp,
        newPassword,
      });
      setMessage(response.data.message);
      setStep(1); // Quay về bước nhập email sau khi đặt lại mật khẩu
    } catch (error) {
      setMessage(error.response?.data?.message || "Lỗi khi đặt lại mật khẩu.");
    }
  };

  return (
    <div className="forgot-password-container">
      <h2>Quên Mật Khẩu</h2>

      {message && <p className="message">{message}</p>}

      {step === 1 && (
        <div>
          <label>Email của bạn:</label>
          <input
            type="email"
            placeholder="Nhập email..."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button onClick={handleSendOTP}>Gửi OTP</button>
        </div>
      )}

      {step === 2 && (
        <div>
          <label>Nhập mã OTP:</label>
          <input
            type="text"
            placeholder="Nhập OTP..."
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
          <button onClick={handleVerifyOTP}>Xác nhận OTP</button>
        </div>
      )}

      {step === 3 && (
        <div>
          <label>Nhập mật khẩu mới:</label>
          <input
            type="password"
            placeholder="Nhập mật khẩu mới..."
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <button onClick={handleResetPassword}>Đặt lại mật khẩu</button>
        </div>
      )}
    </div>
  );
}

export default ForgotPassword;

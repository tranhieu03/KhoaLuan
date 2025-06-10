import React, { useState } from "react";
import { register, verifyOtp, resendOtp } from "../services/authService";
import API_BASE_URL from "../config";

function Register() {
  const [step, setStep] = useState("register");
  const [userId, setUserId] = useState(null);
  const [remainingAttempts, setRemainingAttempts] = useState(null);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    phoneNumber: "",
    role: "Customer",
    vehicleNumber: "",
    frontIdCardImageFile: null,
    backIdCardImageFile: null,
  });
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [timer, setTimer] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.files[0] });
  };

  const handleOtpChange = (e) => {
    setOtp(e.target.value);
  };

  // Start countdown timer
  const startTimer = () => {
    setTimer(60);
    const interval = setInterval(() => {
      setTimer((prevTimer) => {
        if (prevTimer <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prevTimer - 1;
      });
    }, 1000);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);
    
    try {
      // Create FormData object to handle file uploads
      const formDataToSend = new FormData();
      formDataToSend.append("fullName", formData.fullName);
      formDataToSend.append("email", formData.email);
      formDataToSend.append("password", formData.password);
      formDataToSend.append("phoneNumber", formData.phoneNumber);
      formDataToSend.append("role", formData.role);
      
      // Only append these fields if it's a delivery person
      if (formData.role === "DeliveryPerson") {
        formDataToSend.append("vehicleNumber", formData.vehicleNumber || "");
        if (formData.frontIdCardImageFile) {
          formDataToSend.append("frontIdCardImageFile", formData.frontIdCardImageFile);
        }
        if (formData.backIdCardImageFile) {
          formDataToSend.append("backIdCardImageFile", formData.backIdCardImageFile);
        }
      }
      
      const response = await register(formDataToSend);
      setUserId(response.userId);
      setRemainingAttempts(response.remainingAttempts);
      setMessage(response.message);
      setStep("verify");
      startTimer(); // Start OTP expiration timer
    } catch (err) {
      setError(err.response?.data?.message || "Đăng ký thất bại!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);
    
    try {
      const response = await verifyOtp({ otp });
      setMessage(response.message);
      setTimeout(() => {
        window.location.href = "/"; // Redirect to login after successful verification
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Xác thực OTP thất bại!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (timer > 0) return; // Prevent resending if timer is still active
    
    setError(null);
    setMessage(null);
    setIsSubmitting(true);
    
    try {
      const response = await resendOtp({ email: formData.email });
      setMessage(response.message);
      setRemainingAttempts(response.remainingAttempts);
      startTimer(); // Restart timer
    } catch (err) {
      setError(err.response?.data?.message || "Gửi lại OTP thất bại!");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if delivery person role is selected
  const isDeliveryPerson = formData.role === "DeliveryPerson";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {step === "register" ? "Đăng ký tài khoản" : "Xác thực tài khoản"}
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {message && (
            <div className="mb-4 p-4 rounded-md bg-green-50 text-green-800">
              {message}
            </div>
          )}
          {error && (
            <div className="mb-4 p-4 rounded-md bg-red-50 text-red-800">
              {error}
            </div>
          )}

          {step === "register" ? (
            <form className="space-y-6" onSubmit={handleRegister} encType="multipart/form-data">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                  Họ và tên
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nhập họ và tên"
                  value={formData.fullName}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nhập email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
                  Số điện thoại
                </label>
                <input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nhập số điện thoại"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Mật khẩu
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nhập mật khẩu"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                  Loại tài khoản
                </label>
                <select
                  id="role"
                  name="role"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                  value={formData.role}
                  onChange={handleChange}
                >
                  <option value="Customer">Khách hàng</option>
                  <option value="seller">Người bán</option>
                  <option value="DeliveryPerson">Người giao hàng</option>
                </select>
              </div>

              {/* Additional fields for Delivery Person */}
              {isDeliveryPerson && (
                <>
                  <div>
                    <label htmlFor="vehicleNumber" className="block text-sm font-medium text-gray-700">
                      Biển số xe
                    </label>
                    <input
                      id="vehicleNumber"
                      name="vehicleNumber"
                      type="text"
                      required={isDeliveryPerson}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Nhập biển số xe"
                      value={formData.vehicleNumber}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <label htmlFor="frontIdCardImageFile" className="block text-sm font-medium text-gray-700">
                      Ảnh CCCD mặt trước
                    </label>
                    <input
                      id="frontIdCardImageFile"
                      name="frontIdCardImageFile"
                      type="file"
                      accept="image/*"
                      required={isDeliveryPerson}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      onChange={handleFileChange}
                    />
                  </div>

                  <div>
                    <label htmlFor="backIdCardImageFile" className="block text-sm font-medium text-gray-700">
                      Ảnh CCCD mặt sau
                    </label>
                    <input
                      id="backIdCardImageFile"
                      name="backIdCardImageFile"
                      type="file"
                      accept="image/*"
                      required={isDeliveryPerson}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      onChange={handleFileChange}
                    />
                  </div>
                </>
              )}

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                    isSubmitting ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                >
                  {isSubmitting ? "Đang xử lý..." : "Đăng ký"}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <form className="space-y-6" onSubmit={handleVerifyOtp}>
                <div>
                  <p className="text-sm text-gray-600 mb-4">
                    Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra và nhập mã để hoàn tất đăng ký.
                  </p>
                  {timer > 0 && (
                    <p className="text-sm text-gray-600 mb-4">
                      Mã OTP sẽ hết hạn sau: <span className="font-medium text-blue-600">{timer} giây</span>
                    </p>
                  )}
                  {remainingAttempts !== null && (
                    <p className="text-sm text-gray-600 mb-4">
                      Số lần gửi OTP còn lại: <span className="font-medium">{remainingAttempts}</span>
                    </p>
                  )}
                  <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                    Mã OTP
                  </label>
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    required
                    maxLength={6}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Nhập mã OTP 6 số"
                    value={otp}
                    onChange={handleOtpChange}
                  />
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                      isSubmitting ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
                    } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                  >
                    {isSubmitting ? "Đang xử lý..." : "Xác nhận"}
                  </button>
                </div>
              </form>

              <div className="flex justify-center">
                <button
                  onClick={handleResendOtp}
                  disabled={isSubmitting || timer > 0}
                  className={`text-sm font-medium ${
                    timer > 0 || isSubmitting ? "text-gray-400 cursor-not-allowed" : "text-blue-600 hover:text-blue-500"
                  }`}
                >
                  {timer > 0 ? `Gửi lại OTP (${timer}s)` : "Gửi lại OTP"}
                </button>
              </div>
            </div>
          )}
          
          {/* Link to login page */}
          <div className="mt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Đã có tài khoản?{" "}
                <a href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                  Đăng nhập
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
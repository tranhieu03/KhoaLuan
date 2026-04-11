import React, { useState } from "react";
import { login, checkLoginStatus } from "../services/authService";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { Eye, EyeOff, Mail, Lock, Loader2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const location = useLocation();
  const { login: authLogin } = useAuth();

  // Lay trang truoc do de redirect sau khi dang nhap
  const from = location.state?.from || null;

  const validateForm = () => {
    const newErrors = {};
    
    if (!email) {
      newErrors.email = "Vui long nhap email";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Email khong hop le";
    }
    
    if (!password) {
      newErrors.password = "Vui long nhap mat khau";
    } else if (password.length < 6) {
      newErrors.password = "Mat khau phai co it nhat 6 ky tu";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      const response = await login({ email, password });
      
      // Kiem tra dang nhap thanh cong bang cach verify session
      const userStatus = await checkLoginStatus();
      
      if (userStatus) {
        // Luu thong tin user vao AuthContext
        authLogin(userStatus);
        
        toast.success(response.message || "Dang nhap thanh cong!");
        
        // Redirect dua tren role hoac trang truoc do
        if (from) {
          navigate(from);
        } else {
          const role = userStatus.role?.toLowerCase();
          switch(role) {
            case 'customer':
              navigate("/all");
              break;
            case 'deliveryperson':
              navigate("/delivery/dashboard");
              break;
            case 'seller':
              navigate("/restaurant/dashboard");
              break;
            case 'admin':
              navigate("/admin/dashboard");
              break;
            default:
              navigate("/all");
          }
        }
      } else {
        toast.error("Khong the thiet lap phien dang nhap. Vui long thu lai.");
      }
    } catch (err) {
      console.error("Login error:", err);
      const errorMessage = err.response?.data?.message || "Dang nhap that bai! Vui long kiem tra lai thong tin.";
      toast.error(errorMessage);
      
      // Hien thi loi cu the cho tung truong neu co
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-100 via-white to-red-100 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full mb-4 shadow-lg">
            <span className="text-white text-2xl font-bold">F</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800">FoodDelight</h1>
          <p className="text-gray-600 mt-2">Chao mung tro lai!</p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleLogin}
          className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100"
        >
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Dang nhap</h2>

          {/* Email field */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors({ ...errors, email: null });
                }}
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${
                  errors.email 
                    ? 'border-red-500 focus:ring-red-200' 
                    : 'border-gray-300 focus:ring-orange-200 focus:border-orange-500'
                }`}
              />
            </div>
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          {/* Password field */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mat khau
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Nhap mat khau"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors({ ...errors, password: null });
                }}
                className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${
                  errors.password 
                    ? 'border-red-500 focus:ring-red-200' 
                    : 'border-gray-300 focus:ring-orange-200 focus:border-orange-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password}</p>
            )}
          </div>

          {/* Forgot password link */}
          <div className="flex justify-end mb-6">
            <Link 
              to="/forgotpassword" 
              className="text-sm text-orange-600 hover:text-orange-800 font-medium transition-colors"
            >
              Quen mat khau?
            </Link>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all duration-300 flex items-center justify-center ${
              isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                Dang xu ly...
              </>
            ) : (
              'Dang nhap'
            )}
          </button>

          {/* Register link */}
          <div className="text-center mt-6 text-gray-600">
            Chua co tai khoan?{" "}
            <Link 
              to="/register" 
              className="text-orange-600 hover:text-orange-800 font-medium transition-colors"
            >
              Dang ky ngay
            </Link>
          </div>

          {/* Admin login link */}
          <div className="text-center mt-4">
            <Link 
              to="/admin/login" 
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Dang nhap voi tu cach Quan tri vien
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;

import React, { useState } from "react";
import { login } from "../services/authService";
import { checkLoginStatus } from "../services/authService";
import { useNavigate, Link } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await login({ email, password });
      alert(response.message);
      
      // Check if login was successful by verifying session status
      const userStatus = await checkLoginStatus();
      if (userStatus) {
        // Store user info in local state or context if needed
        localStorage.setItem("user", JSON.stringify(userStatus));
        
        // Redirect based on user role
        switch(userStatus.role) {
          case 'Customer':
            navigate("/all");
            break;
          case 'DeliveryPerson':
            navigate("/delivery/dashboard");
            break;
          case 'seller':
            navigate("/restaurant/dashboard");
            break;
          default:
            navigate("/");
        }
      } else {
        alert("Session could not be established. Please try again.");
      }
    } catch (err) {
      console.error("Error:", err);
      alert(err.response?.data?.message || "Login failed!");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleLogin}
        className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md"
      >
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Login</h2>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-300 mb-4"
        >
          Login
        </button>

        <div className="text-center text-gray-600">
          Don't have an account?{" "}
          <Link 
            to="/register" 
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Register here
          </Link>
        </div>
      </form>
    </div>
  );
}

export default Login;
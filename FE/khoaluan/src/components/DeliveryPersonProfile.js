import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Edit, Save, X } from 'lucide-react';
import API_BASE_URL from "../config";

const DeliveryPersonProfile = () => {
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    address: '',
    vehicleNumber: ''
  });

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    setIsLoading(true);
    try {
      // Updated API path based on your controller routes
      const response = await fetch(`${API_BASE_URL}/Account/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include' // Important for sessions
      });

      if (!response.ok) {
        // Check content type to better handle HTML responses vs JSON errors
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch profile');
        } else {
          throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
      }

      // Try to parse the response as JSON
      try {
        const profileData = await response.json();
        setProfile(profileData);
        
        // Initialize form data
        setFormData({
          fullName: profileData.fullName || '',
          phoneNumber: profileData.phoneNumber || '',
          address: profileData.address || '',
          vehicleNumber: profileData.vehicleNumber || ''
        });
        
        setError(null);
      } catch (parseError) {
        console.error("JSON parsing error:", parseError);
        throw new Error("Failed to parse server response. The server might be returning HTML instead of JSON.");
      }
    } catch (err) {
      setError(err.message);
      console.error("API Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Updated API path based on your controller routes
      const response = await fetch(`${API_BASE_URL}/Account/update-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        // Check content type to better handle HTML responses vs JSON errors
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update profile');
        } else {
          throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
      }

      try {
        const result = await response.json();
        setSuccessMessage(result.message || "Profile updated successfully");
        
        // Refresh profile data
        await fetchUserProfile();
        setIsEditing(false);
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      } catch (parseError) {
        console.error("JSON parsing error:", parseError);
        // If we can't parse JSON but the request was successful
        setSuccessMessage("Profile updated successfully");
        await fetchUserProfile();
        setIsEditing(false);
      }
    } catch (err) {
      setError(err.message);
      console.error("API Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const cancelEdit = () => {
    // Reset form data to current profile values
    if (profile) {
      setFormData({
        fullName: profile.fullName || '',
        phoneNumber: profile.phoneNumber || '',
        address: profile.address || '',
        vehicleNumber: profile.vehicleNumber || ''
      });
    }
    setIsEditing(false);
  };

  // Check authentication status
  const checkAuthStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/Auth/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        // If not authenticated, we might want to redirect
        if (response.status === 401) {
          setError("You are not logged in. Please log in to access your profile.");
          return false;
        }
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      // Check if user has the DeliveryPerson role
      if (data.role !== "DeliveryPerson") {
        setError("You don't have permission to access this page. This page is only for delivery personnel.");
        return false;
      }
      
      return true;
    } catch (err) {
      setError("Failed to verify authentication status: " + err.message);
      return false;
    }
  };

  useEffect(() => {
    // Check auth status when component mounts
    checkAuthStatus().then(isAuthenticated => {
      if (isAuthenticated) {
        fetchUserProfile();
      }
    });
  }, []);

  if (isLoading && !profile) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-t-blue-500 border-b-blue-500 rounded-full animate-spin mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
        <div className="flex items-center">
          <AlertCircle className="text-red-500 mr-2" size={20} />
          <p className="text-red-700">{error}</p>
          {error.includes("not logged in") && (
            <button 
              onClick={() => window.location.href = '/login'} 
              className="ml-4 bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700"
            >
              Go to Login
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
          <h1 className="text-2xl font-bold">Delivery Person Profile</h1>
          {!isEditing && profile ? (
            <button 
              onClick={() => setIsEditing(true)}
              className="flex items-center bg-white text-blue-600 px-4 py-2 rounded-md hover:bg-blue-50"
            >
              <Edit size={18} className="mr-1" />
              Edit Profile
            </button>
          ) : null}
        </div>
        
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded m-4 p-3 flex items-center">
            <CheckCircle className="text-green-500 mr-2" size={20} />
            <p className="text-green-700">{successMessage}</p>
          </div>
        )}
        
        {error && profile && (
          <div className="bg-red-50 border border-red-200 rounded m-4 p-3 flex items-center">
            <AlertCircle className="text-red-500 mr-2" size={20} />
            <p className="text-red-700">{error}</p>
          </div>
        )}
        
        <div className="p-6">
          {isEditing ? (
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Number</label>
                  <input
                    type="text"
                    name="vehicleNumber"
                    value={formData.vehicleNumber}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="mt-6 flex space-x-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mr-2"></div>
                  ) : (
                    <Save size={18} className="mr-2" />
                  )}
                  Save Changes
                </button>
                
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="flex items-center bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  <X size={18} className="mr-2" />
                  Cancel
                </button>
              </div>
            </form>
          ) : profile ? (
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg flex items-start">
                <div className="bg-blue-100 rounded-full p-3 mr-4">
                  <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                    {profile.fullName?.charAt(0) || 'D'}
                  </div>
                </div>
                
                <div>
                  <h2 className="text-xl font-bold text-gray-800">{profile.fullName}</h2>
                  <p className="text-gray-600">{profile.email}</p>
                  <div className="mt-2 inline-flex items-center bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
                    Delivery Person
                  </div>
                  {profile.averageRating !== null && (
                    <div className="mt-2 flex items-center">
                      <div className="flex text-yellow-400">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg key={star} className="w-5 h-5" fill={star <= Math.round(profile.averageRating) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
                          </svg>
                        ))}
                      </div>
                      <span className="ml-2 text-gray-600">{profile.averageRating ? profile.averageRating.toFixed(1) : '0'}/5.0</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Phone Number</h3>
                  <p className="text-gray-800">{profile.phoneNumber || "Not provided"}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Address</h3>
                  <p className="text-gray-800">{profile.address || "Not provided"}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Vehicle Number</h3>
                  <p className="text-gray-800">{profile.vehicleNumber || "Not provided"}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Account Created</h3>
                  <p className="text-gray-800">{profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "Unknown"}</p>
                </div>
              </div>
              
              {(profile.frontIdCardImage || profile.backIdCardImage) && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-700 mb-3">Identification</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {profile.frontIdCardImage && (
                      <div>
                        <p className="text-sm text-gray-500 mb-2">Front ID Card</p>
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          <img 
                            src="/api/placeholder/300/200" 
                            alt="Front ID Card" 
                            className="w-full h-auto"
                          />
                        </div>
                      </div>
                    )}
                    
                    {profile.backIdCardImage && (
                      <div>
                        <p className="text-sm text-gray-500 mb-2">Back ID Card</p>
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          <img 
                            src="/api/placeholder/300/200" 
                            alt="Back ID Card" 
                            className="w-full h-auto"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default DeliveryPersonProfile;
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import API_BASE_URL from "../config";
import { User, Mail, Phone, MapPin, Truck, Loader2, Check } from 'lucide-react';
import Header from './Header';

const UserProfile = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    address: '',
    vehicleNumber: ''
  });
  const [updating, setUpdating] = useState(false);

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE_URL}/Account/profile`, {
          withCredentials: true
        });
        
        setUserData(response.data);
        setFormData({
          fullName: response.data.fullName || '',
          phoneNumber: response.data.phoneNumber || '',
          address: response.data.address || '',
          vehicleNumber: response.data.vehicleNumber || ''
        });
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to fetch user profile');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);
    
    try {
      const response = await axios.put(
        `${API_BASE_URL}/Account/update-profile`,
        {
          fullName: formData.fullName,
          phoneNumber: formData.phoneNumber,
          address: formData.address,
          vehicleNumber: userData.role === 'DeliveryPerson' ? formData.vehicleNumber : null
        },
        { withCredentials: true }
      );

      toast.success(response.data.message || 'Profile updated successfully');
      setUserData(prev => ({
        ...prev,
        ...formData
      }));
      setEditMode(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin h-12 w-12 text-blue-500" />
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Failed to load user profile</p>
      </div>
    );
  }

  return (
    <div className="bg-white">
  {/* Header tràn full width */}
  <div className="w-full">
    <Header />
  </div>
    <div className="max-w-2xl mx-auto p-4 bg-white rounded-lg shadow-md">   
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center">
          <User className="mr-2" />
          User Profile
        </h1>
        {!editMode && (
          <button
            onClick={() => setEditMode(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            Edit Profile
          </button>
        )}
      </div>

      {editMode ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Email (readonly) */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="flex items-center p-2 bg-gray-100 rounded">
                <Mail className="text-gray-500 mr-2" size={18} />
                <span>{userData.email}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-md bg-gray-50 text-gray-500">
                  <User size={18} />
                </span>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="flex-1 rounded-r-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-md bg-gray-50 text-gray-500">
                  <Phone size={18} />
                </span>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  className="flex-1 rounded-r-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Address */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <div className="flex">
                <span className="inline-flex items-start pt-2 px-3 rounded-l-md bg-gray-50 text-gray-500">
                  <MapPin size={18} />
                </span>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows={3}
                  className="flex-1 rounded-r-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Vehicle Number (for DeliveryPerson) */}
            {userData.role === 'DeliveryPerson' && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Number</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-md bg-gray-50 text-gray-500">
                    <Truck size={18} />
                  </span>
                  <input
                    type="text"
                    name="vehicleNumber"
                    value={formData.vehicleNumber}
                    onChange={handleInputChange}
                    className="flex-1 rounded-r-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setEditMode(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={updating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center"
              disabled={updating}
            >
              {updating ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={18} />
                  Updating...
                </>
              ) : (
                <>
                  <Check className="mr-2" size={18} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <Mail className="text-gray-500 mr-3" size={20} />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{userData.email}</p>
              </div>
            </div>

            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <User className="text-gray-500 mr-3" size={20} />
              <div>
                <p className="text-sm text-gray-500">Full Name</p>
                <p className="font-medium">{userData.fullName || 'Not provided'}</p>
              </div>
            </div>

            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <Phone className="text-gray-500 mr-3" size={20} />
              <div>
                <p className="text-sm text-gray-500">Phone Number</p>
                <p className="font-medium">{userData.phoneNumber || 'Not provided'}</p>
              </div>
            </div>

            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <MapPin className="text-gray-500 mr-3" size={20} />
              <div>
                <p className="text-sm text-gray-500">Address</p>
                <p className="font-medium">{userData.address || 'Not provided'}</p>
              </div>
            </div>
          </div>

          {/* Delivery Person Info */}
          {userData.role === 'DeliveryPerson' && (
            <div className="mt-6 border-t pt-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <Truck className="mr-2" size={20} />
                Delivery Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500">Vehicle Number</p>
                    <p className="font-medium">{userData.vehicleNumber || 'Not provided'}</p>
                  </div>
                </div>

                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500">Average Rating</p>
                    <div className="flex items-center">
                      <span className="font-medium mr-2">
                        {userData.averageRating ? userData.averageRating.toFixed(1) : 'N/A'}
                      </span>
                      {userData.averageRating && (
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <svg
                              key={i}
                              className={`w-4 h-4 ${i < Math.floor(userData.averageRating) ? 'text-yellow-400' : 'text-gray-300'}`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-2">Front ID Card</p>
                  {userData.frontIdCardImage ? (
                    <img 
                      src={userData.frontIdCardImage} 
                      alt="Front ID Card" 
                      className="w-full h-auto border rounded-md"
                    />
                  ) : (
                    <div className="p-4 bg-gray-100 rounded-md text-center text-gray-500">
                      No front ID card uploaded
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-2">Back ID Card</p>
                  {userData.backIdCardImage ? (
                    <img 
                      src={userData.backIdCardImage} 
                      alt="Back ID Card" 
                      className="w-full h-auto border rounded-md"
                    />
                  ) : (
                    <div className="p-4 bg-gray-100 rounded-md text-center text-gray-500">
                      No back ID card uploaded
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Account Info */}
          <div className="mt-6 border-t pt-6">
            <h2 className="text-lg font-semibold mb-4">Account Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Role</p>
                  <p className="font-medium capitalize">{userData.role}</p>
                </div>
              </div>

              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Member Since</p>
                  <p className="font-medium">
                    {new Date(userData.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};

export default UserProfile;
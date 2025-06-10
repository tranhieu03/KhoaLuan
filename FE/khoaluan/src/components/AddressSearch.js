import React, { useState } from "react";
import axios from "axios";
import MapComponent from "./MapComponent";
import API_BASE_URL from "../config"; // Đảm bảo bạn đã cấu hình đúng API_BASE_URL

const AddressSearch = () => {
  const [address, setAddress] = useState("");
  const [destination, setDestination] = useState("");
  const [coordinates, setCoordinates] = useState(null);
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [distance, setDistance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 🟢 Hàm lấy tọa độ từ API Goong
  const fetchCoordinates = async (addr, setCoordFunction) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/Goong/geocode`, {
        params: { address: addr },
      });

      console.log("Geocode Response:", response.data); // Debug dữ liệu trả về

      if (response.data.results.length > 0) {
        const { lat, lng } = response.data.results[0].geometry.location;
        setCoordFunction({ lat, lon: lng });
      } else {
        setError("Không tìm thấy tọa độ!");
      }
    } catch (error) {
      console.error("Lỗi khi lấy tọa độ:", error);
      setError("Không thể lấy tọa độ từ API!");
    }
  };

  // 🟢 Tìm kiếm tọa độ địa chỉ nhập vào
  const handleSearch = async () => {
    if (!address.trim()) {
      setError("Vui lòng nhập địa chỉ!");
      return;
    }
    setError("");
    setLoading(true);
    await fetchCoordinates(address, setCoordinates);
    setLoading(false);
  };

  // 🟢 Tìm kiếm tọa độ điểm đến
  const handleDestinationSearch = async () => {
    if (!destination.trim()) {
      setError("Vui lòng nhập địa điểm đến!");
      return;
    }
    setError("");
    setLoading(true);
    await fetchCoordinates(destination, setDestinationCoords);
    setLoading(false);
  };

  // 🟢 Tính khoảng cách giữa 2 điểm
  const handleCalculateDistance = async () => {
    if (!coordinates || !destinationCoords) {
      setError("Vui lòng nhập cả điểm bắt đầu và điểm đến!");
      return;
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/Goong/distance`, {
        params: {
          start: `${coordinates.lat},${coordinates.lon}`,
          end: `${destinationCoords.lat},${destinationCoords.lon}`,
        },
      });

      console.log("Distance Response:", response.data); // Debug dữ liệu trả về

      if (response.data.routes.length > 0) {
        const distanceMeters = response.data.routes[0].legs[0].distance.value;
        setDistance((distanceMeters / 1000).toFixed(2)); // Chuyển sang km
      } else {
        setError("Không thể tính khoảng cách!");
      }
    } catch (error) {
      console.error("Lỗi khi tính khoảng cách:", error);
      setError("Không thể kết nối đến API khoảng cách!");
    }
  };

  return (
    <div>
      <h2>Tìm tọa độ và tính khoảng cách</h2>

      <div>
        <input
          type="text"
          placeholder="Nhập địa chỉ"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <button onClick={handleSearch} disabled={loading}>
          {loading ? "Đang tìm..." : "Tìm tọa độ"}
        </button>
      </div>

      <div>
        <input
          type="text"
          placeholder="Nhập điểm đến"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
        />
        <button onClick={handleDestinationSearch} disabled={loading}>
          {loading ? "Đang tìm..." : "Tìm điểm đến"}
        </button>
      </div>

      <button onClick={handleCalculateDistance} disabled={loading || !coordinates || !destinationCoords}>
        {loading ? "Đang tính..." : "Tính khoảng cách"}
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* Hiển thị cả 2 điểm trên cùng một bản đồ */}
      <MapComponent locations={[coordinates, destinationCoords].filter(Boolean)} />

      {distance && <p>Khoảng cách: {distance} km</p>}
    </div>
  );
};

export default AddressSearch;

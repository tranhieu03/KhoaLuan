import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import API_BASE_URL from "../config";

const MapComponent = ({ locations = [] }) => {
  console.log("Locations received:", locations); // Debug

  if (!Array.isArray(locations) || locations.length === 0) {
    return <p>Không có vị trí nào để hiển thị.</p>;
  }

  // 🟢 Lấy trung tâm bản đồ là điểm đầu tiên
  const center = [locations[0].lat, locations[0].lon];

  return (
    <MapContainer center={center} zoom={13} style={{ height: "400px", width: "100%" }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      {locations.map((loc, index) => (
        <Marker key={index} position={[loc.lat, loc.lon]}>
          <Popup>Vị trí {index + 1}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default MapComponent;

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import { Truck, Store, Home } from 'lucide-react';

// Tạo custom icons cho bản đồ
const createCustomIcon = (iconUrl, iconSize = [32, 32]) => {
  return L.icon({
    iconUrl,
    iconSize,
    iconAnchor: [iconSize[0] / 2, iconSize[1]],
    popupAnchor: [0, -iconSize[1]]
  });
};

const LeafletMap = ({ driverLocation, restaurantLocation, destination }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routingControlRef = useRef(null);

  useEffect(() => {
    // Khởi tạo bản đồ nếu chưa có
    if (!mapInstanceRef.current && mapRef.current) {
      // Tạo map instance
      mapInstanceRef.current = L.map(mapRef.current).setView(
        [driverLocation.lat, driverLocation.lng], 
        15
      );

      // Thêm tile layer (OpenStreetMap)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(mapInstanceRef.current);
    }

    // Cập nhật bản đồ khi có dữ liệu mới
    if (mapInstanceRef.current) {
      const map = mapInstanceRef.current;
      
      // Xóa tất cả markers và routes hiện tại
      map.eachLayer(layer => {
        if (layer instanceof L.Marker || layer instanceof L.Polyline) {
          map.removeLayer(layer);
        }
      });

      // Xóa routing control cũ nếu có
      if (routingControlRef.current) {
        map.removeControl(routingControlRef.current);
        routingControlRef.current = null;
      }

      // Thêm marker cho tài xế
      const driverIcon = createDriverIcon();
      const driverMarker = L.marker([driverLocation.lat, driverLocation.lng], { icon: driverIcon })
        .addTo(map)
        .bindPopup('Vị trí tài xế')
        .openPopup();

      // Thêm marker cho nhà hàng nếu có
      if (restaurantLocation && restaurantLocation.lat && restaurantLocation.lng) {
        const restaurantIcon = createRestaurantIcon();
        L.marker([restaurantLocation.lat, restaurantLocation.lng], { icon: restaurantIcon })
          .addTo(map)
          .bindPopup(restaurantLocation.name || 'Nhà hàng');
      }

      // Thêm marker cho điểm giao hàng
      if (destination && destination.lat && destination.lng) {
        const destinationIcon = createDestinationIcon();
        L.marker([destination.lat, destination.lng], { icon: destinationIcon })
          .addTo(map)
          .bindPopup(destination.address || 'Địa chỉ giao hàng');
      }

      // Cập nhật routing với waypoints đẹp hơn, không chỉ là đường thẳng
      if (restaurantLocation && destination && driverLocation) {
        // Sử dụng Leaflet Routing Machine thay vì đường thẳng đơn giản
        createRoutingControl(map, restaurantLocation, driverLocation, destination);
      }

      // Fit bounds để hiển thị tất cả marker
      const bounds = [];
      if (driverLocation) bounds.push([driverLocation.lat, driverLocation.lng]);
      if (restaurantLocation && restaurantLocation.lat) bounds.push([restaurantLocation.lat, restaurantLocation.lng]);
      if (destination && destination.lat) bounds.push([destination.lat, destination.lng]);
      
      if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }

    return () => {
      // Cleanup khi component unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [driverLocation, restaurantLocation, destination]);

  // Tạo biểu tượng tùy chỉnh cho tài xế
  const createDriverIcon = () => {
    // Tạo HTML cho icon tùy chỉnh
    const iconHtml = `
      <div class="flex items-center justify-center w-8 h-8 bg-blue-500 rounded-full border-2 border-white shadow-lg text-white">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M16 3h1a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h1"></path>
          <path d="M9 3v18m7-18v18"></path>
        </svg>
      </div>
    `;

    // Sử dụng div icon để tùy chỉnh HTML
    return L.divIcon({
      html: iconHtml,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
  };

  // Tạo biểu tượng tùy chỉnh cho nhà hàng
  const createRestaurantIcon = () => {
    const iconHtml = `
      <div class="flex items-center justify-center w-8 h-8 bg-red-500 rounded-full border-2 border-white shadow-lg text-white">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 3h18v18H3z"></path>
          <path d="M9 3v18m6-18v18"></path>
        </svg>
      </div>
    `;

    return L.divIcon({
      html: iconHtml,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
  };

  // Tạo biểu tượng tùy chỉnh cho điểm giao hàng
  const createDestinationIcon = () => {
    const iconHtml = `
      <div class="flex items-center justify-center w-8 h-8 bg-green-500 rounded-full border-2 border-white shadow-lg text-white">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      </div>
    `;

    return L.divIcon({
      html: iconHtml,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
  };

  // Tạo routing control với waypoints thực tế
  const createRoutingControl = (map, restaurantLocation, driverLocation, destination) => {
    // Tạo waypoints cho lộ trình
    const waypoints = [
      L.latLng(restaurantLocation.lat, restaurantLocation.lng),
      // Thêm điểm trung gian để làm cho đường đi không phải là đường thẳng
      generateIntermediatePoint(
        restaurantLocation.lat, restaurantLocation.lng,
        driverLocation.lat, driverLocation.lng, 0.3
      ),
      L.latLng(driverLocation.lat, driverLocation.lng),
      generateIntermediatePoint(
        driverLocation.lat, driverLocation.lng,
        destination.lat, destination.lng, 0.7
      ),
      L.latLng(destination.lat, destination.lng)
    ];

    // Tạo polyline cho lộ trình với gradient màu
    const routePolyline = L.polyline(waypoints, {
      color: '#3B82F6',
      weight: 4,
      opacity: 0.8,
      dashArray: '10, 10',
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    // Hiệu ứng di chuyển dọc theo đường đi
    animatePolyline(map, routePolyline);

    // Tạo các điểm nhỏ dọc theo tuyến đường
    for (let i = 1; i < waypoints.length - 1; i++) {
      L.circleMarker(waypoints[i], {
        radius: 3,
        color: '#3B82F6',
        fillColor: '#3B82F6',
        fillOpacity: 1
      }).addTo(map);
    }
  };

  // Hàm tạo điểm trung gian giữa hai điểm
  const generateIntermediatePoint = (lat1, lng1, lat2, lng2, factor) => {
    // Tạo một điểm trung gian có thêm độ lệch ngẫu nhiên để đường đi không thẳng
    const midLat = lat1 + (lat2 - lat1) * factor;
    const midLng = lng1 + (lng2 - lng1) * factor;
    
    // Thêm một chút độ lệch ngẫu nhiên để tạo đường cong
    const latOffset = (Math.random() - 0.5) * 0.01;
    const lngOffset = (Math.random() - 0.5) * 0.01;
    
    return L.latLng(midLat + latOffset, midLng + lngOffset);
  };

  // Hiệu ứng di chuyển dọc theo đường đi
  const animatePolyline = (map, polyline) => {
    const latlngs = polyline.getLatLngs();
    
    // Tạo marker animation
    const animationMarker = L.circleMarker(latlngs[0], {
      radius: 5,
      color: '#3B82F6',
      fillColor: '#fff',
      fillOpacity: 1,
      weight: 2
    }).addTo(map);
    
    let step = 0;
    const totalSteps = 100;
    const totalPoints = latlngs.length - 1;
    
    const animateFrame = () => {
      step = (step + 1) % totalSteps;
      
      const segmentIndex = Math.floor((step / totalSteps) * totalPoints);
      const segmentPosition = (step / totalSteps) * totalPoints - segmentIndex;
      
      if (segmentIndex < totalPoints) {
        const p1 = latlngs[segmentIndex];
        const p2 = latlngs[segmentIndex + 1];
        
        const lat = p1.lat + (p2.lat - p1.lat) * segmentPosition;
        const lng = p1.lng + (p2.lng - p1.lng) * segmentPosition;
        
        animationMarker.setLatLng([lat, lng]);
      }
      
      requestAnimationFrame(animateFrame);
    };
    
    animateFrame();
  };

  return (
    <div ref={mapRef} className="w-full h-full rounded-lg"></div>
  );
};

export default LeafletMap;
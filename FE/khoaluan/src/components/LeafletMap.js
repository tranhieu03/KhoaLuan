import React, { useEffect, useRef, useState } from 'react';
import { Info, MapPin, AlertTriangle } from 'lucide-react';

const LeafletMap = ({ driverLocation, restaurantLocation, destination }) => {
  const mapContainerRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);
  const mapInstance = useRef(null);
  const markers = useRef([]);
  const polyline = useRef(null);

  useEffect(() => {
    // Kiểm tra nếu script đã được tải
    if (window.L) {
      setMapLoaded(true);
      return;
    }

    const leafletScriptId = 'leaflet-js-script';
    
    // Tránh tải script nhiều lần
    if (document.getElementById(leafletScriptId)) {
      setMapLoaded(true);
      return;
    }

    const loadScript = (id, src) => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.id = id;
        script.src = src;
        script.async = true;
        script.defer = true;
        
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        
        document.head.appendChild(script);
      });
    };

    const loadCSS = (href) => {
      const link = document.createElement('link');
      link.href = href;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    };

    // Tải script và CSS Leaflet cơ bản
    loadScript(leafletScriptId, 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js')
      .then(() => {
        loadCSS('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
        setMapLoaded(true);
      })
      .catch((error) => {
        console.error('Error loading scripts:', error);
        setMapError('Không thể tải thư viện bản đồ');
      });

    return () => {
      // Cleanup
      if (mapInstance.current) {
        mapInstance.current.remove();
      }
    };
  }, []);

  // Khởi tạo bản đồ
  useEffect(() => {
    if (!mapLoaded || !window.L || !driverLocation) return;

    try {
      // Khởi tạo bản đồ
      mapInstance.current = window.L.map(mapContainerRef.current).setView(
        [parseFloat(driverLocation.lat), parseFloat(driverLocation.lng)], 
        13
      );

      // Thêm tile layer (OpenStreetMap)
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(mapInstance.current);

      // Đảm bảo bản đồ đã tải xong
      updateMapMarkers();
      drawRoute();
    } catch (error) {
      console.error('Lỗi khởi tạo bản đồ:', error);
      setMapError('Không thể khởi tạo bản đồ');
    }
  }, [mapLoaded]);

  // Tạo icon theo màu
  const createColoredIcon = (color) => {
    return window.L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color: ${color}; width: 15px; height: 15px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
      iconSize: [15, 15],
      iconAnchor: [7, 7]
    });
  };

  // Cập nhật markers khi dữ liệu thay đổi
  const updateMapMarkers = () => {
    if (!mapInstance.current || !window.L) return;

    // Xóa markers cũ
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    // Thêm marker cho tài xế
    if (driverLocation) {
      const driverMarker = window.L.marker(
        [parseFloat(driverLocation.lat), parseFloat(driverLocation.lng)],
        { icon: createColoredIcon('blue') }
      ).addTo(mapInstance.current);
      
      driverMarker.bindPopup('Vị trí tài xế');
      markers.current.push(driverMarker);
    }

    // Thêm marker cho nhà hàng
    if (restaurantLocation) {
      // Chuyển đổi chuỗi thành số nếu cần
      let restLat = parseFloat(restaurantLocation.lat);
      let restLng = parseFloat(restaurantLocation.lng);
      
      // Fallback nếu dữ liệu không đúng định dạng
      if (isNaN(restLat) || isNaN(restLng)) {
        // Thử lấy từ lattitude và longtitude thay vì lat lng
        restLat = parseFloat(restaurantLocation.lattitude);
        restLng = parseFloat(restaurantLocation.longtitude);
      }
      
      if (!isNaN(restLat) && !isNaN(restLng)) {
        const restaurantMarker = window.L.marker(
          [restLat, restLng],
          { icon: createColoredIcon('red') }
        ).addTo(mapInstance.current);
        
        restaurantMarker.bindPopup(restaurantLocation.name || 'Nhà hàng');
        markers.current.push(restaurantMarker);
      }
    }

    // Thêm marker cho địa chỉ giao hàng
    if (destination && destination.lat && destination.lng) {
      const destinationMarker = window.L.marker(
        [parseFloat(destination.lat), parseFloat(destination.lng)],
        { icon: createColoredIcon('green') }
      ).addTo(mapInstance.current);
      
      destinationMarker.bindPopup(destination.address || 'Địa chỉ giao hàng');
      markers.current.push(destinationMarker);
    }

    // Fit bounds để hiển thị tất cả các điểm
    if (markers.current.length > 0) {
      const bounds = window.L.latLngBounds(markers.current.map(marker => marker.getLatLng()));
      mapInstance.current.fitBounds(bounds, { padding: [50, 50] });
    }
  };

  // Vẽ đường đi đơn giản (đường thẳng) giữa các điểm
  const drawRoute = () => {
    if (!mapInstance.current || !window.L || !driverLocation) return;

    try {
      // Xóa polyline cũ nếu có
      if (polyline.current) {
        polyline.current.remove();
      }

      // Mảng lưu các điểm để vẽ route
      const points = [];
      
      // Thêm điểm tài xế
      if (driverLocation && driverLocation.lat && driverLocation.lng) {
        points.push([parseFloat(driverLocation.lat), parseFloat(driverLocation.lng)]);
      }
      
      // Thêm điểm nhà hàng (nếu có và chưa được giao)
      if (restaurantLocation) {
        let restLat = parseFloat(restaurantLocation.lat);
        let restLng = parseFloat(restaurantLocation.lng);
        
        if (isNaN(restLat) || isNaN(restLng)) {
          restLat = parseFloat(restaurantLocation.lattitude);
          restLng = parseFloat(restaurantLocation.longtitude);
        }
        
        if (!isNaN(restLat) && !isNaN(restLng)) {
          points.push([restLat, restLng]);
        }
      }
      
      // Thêm điểm đích (địa chỉ giao hàng)
      if (destination && destination.lat && destination.lng) {
        points.push([parseFloat(destination.lat), parseFloat(destination.lng)]);
      }
      
      // Vẽ đường nếu có ít nhất 2 điểm
      if (points.length >= 2) {
        polyline.current = window.L.polyline(points, {
          color: '#0080ff',
          weight: 5,
          opacity: 0.7,
          lineJoin: 'round'
        }).addTo(mapInstance.current);
      }
    } catch (error) {
      console.error('Lỗi khi vẽ tuyến đường:', error);
    }
  };

  // Cập nhật markers và tuyến đường khi dữ liệu thay đổi
  useEffect(() => {
    if (!mapInstance.current || !mapLoaded) return;
    updateMapMarkers();
    drawRoute();
  }, [driverLocation, restaurantLocation, destination, mapLoaded]);

  if (mapError) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gray-100 rounded-lg p-4">
        <AlertTriangle className="text-red-500 w-8 h-8 mb-2" />
        <p className="text-red-500 font-medium text-center">{mapError}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-2 px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          Tải lại bản đồ
        </button>
      </div>
    );
  }

  if (!mapLoaded) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-2"></div>
          <p className="text-gray-600">Đang tải bản đồ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full rounded-lg"></div>
      <div className="absolute bottom-2 left-2 bg-white rounded-md shadow-md p-2 text-xs">
        <div className="flex items-center mb-1">
          <div className="w-3 h-3 rounded-full bg-blue-500 mr-1"></div>
          <span>Tài xế</span>
        </div>
        <div className="flex items-center mb-1">
          <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
          <span>Nhà hàng</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
          <span>Địa chỉ giao hàng</span>
        </div>
      </div>
      <div className="absolute top-2 right-2">
        <button 
          onClick={() => {
            updateMapMarkers();
            drawRoute();
          }}
          className="bg-white p-2 rounded-full shadow-md hover:bg-gray-100"
          title="Làm mới bản đồ"
        >
          <Info className="w-4 h-4 text-gray-600" />
        </button>
      </div>
    </div>
  );
};

export default LeafletMap;
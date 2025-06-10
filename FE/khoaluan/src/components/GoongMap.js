import React, { useEffect, useRef, useState } from 'react';
import { Info, MapPin, AlertTriangle } from 'lucide-react';
import API_BASE_URL from "../config";

const GoongMap = ({ driverLocation, restaurantLocation, destination }) => {
  const mapContainerRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);
  const mapInstance = useRef(null);
  const markers = useRef([]);
  const routeLayer = useRef(null);

  const GOONG_API_KEY = '8pgcwI15NLNXHs35DfSZC7DN3zWmqkEWfgIXoSmn';
  const GOONG_MAPTILES_KEY = 'lvk0JwNwaf0IZdBqZeDZZS0YUfAsFl2prXSWVDkb';

  useEffect(() => {
    // Kiểm tra nếu script đã được tải
    if (window.goongjs) {
      setMapLoaded(true);
      return;
    }

    const scriptId = 'goong-js-script';
    const directionsScriptId = 'goong-directions-script';
    
    // Tránh tải script nhiều lần
    if (document.getElementById(scriptId)) {
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

    // Tải các script và CSS cần thiết
    Promise.all([
      loadScript(scriptId, `https://maps.goong.io/assets/goong-js/v1.0.0/goong-js.js?api_key=${GOONG_MAPTILES_KEY}`),
      loadScript(directionsScriptId, `https://maps.goong.io/assets/goong-js/v1.0.0/goong-js.js?api_key=${GOONG_API_KEY}`)
    ])
    .then(() => {
      loadCSS('https://maps.goong.io/assets/goong-js/v1.0.0/goong-js.css');
      loadCSS('https://maps.goong.io/assets/goong-sdk/v1.0.0/goong-sdk.min.css');
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
    if (!mapLoaded || !window.goongjs || !driverLocation) return;

    try {
      // Khởi tạo bản đồ
      mapInstance.current = new window.goongjs.Map({
        container: mapContainerRef.current,
        style: 'https://tiles.goong.io/assets/goong_map_web.json',
        center: [parseFloat(driverLocation.lng), parseFloat(driverLocation.lat)],
        zoom: 13,
        accessToken: GOONG_MAPTILES_KEY
      });

      // Thêm các control
      mapInstance.current.addControl(new window.goongjs.NavigationControl(), 'bottom-right');
      mapInstance.current.addControl(new window.goongjs.FullscreenControl());

      // Đảm bảo bản đồ đã tải xong
      mapInstance.current.on('load', () => {
        updateMapMarkers();
        calculateRoute();
      });
    } catch (error) {
      console.error('Lỗi khởi tạo bản đồ:', error);
      setMapError('Không thể khởi tạo bản đồ');
    }
  }, [mapLoaded]);

  // Cập nhật markers khi dữ liệu thay đổi
  const updateMapMarkers = () => {
    if (!mapInstance.current || !window.goongjs) return;

    // Xóa markers cũ
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    // Thêm marker cho tài xế
    if (driverLocation) {
      const driverMarker = createMarker(
        driverLocation.lng, 
        driverLocation.lat, 
        'blue', 
        'Vị trí tài xế'
      );
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
        const restaurantMarker = createMarker(
          restLng, 
          restLat, 
          'red', 
          restaurantLocation.name || 'Nhà hàng'
        );
        markers.current.push(restaurantMarker);
      }
    }

    // Thêm marker cho địa chỉ giao hàng
    if (destination && destination.lat && destination.lng) {
      const destinationMarker = createMarker(
        destination.lng, 
        destination.lat, 
        'green', 
        destination.address || 'Địa chỉ giao hàng'
      );
      markers.current.push(destinationMarker);
    }

    // Fit bounds để hiển thị tất cả các điểm
    if (markers.current.length > 0) {
      const bounds = new window.goongjs.LngLatBounds();
      markers.current.forEach(marker => {
        bounds.extend(marker.getLngLat());
      });
      mapInstance.current.fitBounds(bounds, { padding: 50 });
    }
  };

  // Tạo marker với popup
  const createMarker = (lng, lat, color, title) => {
    // Tạo element cho marker
    const el = document.createElement('div');
    el.className = 'custom-marker';
    el.style.backgroundColor = color;
    el.style.width = '15px';
    el.style.height = '15px';
    el.style.borderRadius = '50%';
    el.style.border = '2px solid white';
    el.style.boxShadow = '0 0 4px rgba(0,0,0,0.5)';

    // Tạo marker
    const marker = new window.goongjs.Marker(el)
      .setLngLat([parseFloat(lng), parseFloat(lat)])
      .addTo(mapInstance.current);

    // Thêm popup
    const popup = new window.goongjs.Popup({ offset: 25 })
      .setHTML(`<div style="font-weight: bold;">${title}</div>`)
      .setMaxWidth('300px');

    marker.setPopup(popup);
    
    return marker;
  };

  // Tính toán và hiển thị tuyến đường
  const calculateRoute = async () => {
    if (!mapInstance.current || !window.goongjs || !window.goongSdk) return;
    if (!driverLocation || !destination || !destination.lat || !destination.lng) return;

    try {
      // Xóa lớp tuyến đường cũ nếu có
      if (routeLayer.current) {
        mapInstance.current.removeLayer(routeLayer.current);
      }

      // Tạo directions service
      const directionsService = new window.goongSdk.DirectionService({
        accessToken: GOONG_API_KEY
      });

      // Lấy tọa độ
      const origin = [parseFloat(driverLocation.lng), parseFloat(driverLocation.lat)];
      const dest = [parseFloat(destination.lng), parseFloat(destination.lat)];

      // Gọi API để lấy tuyến đường
      const result = await directionsService.getDirections({
        origin: origin,
        destination: dest,
        vehicle: 'car'
      });

      if (result && result.data && result.data.routes && result.data.routes.length > 0) {
        const route = result.data.routes[0];
        const coords = route.overview_polyline.points;
        
        // Hiển thị tuyến đường trên bản đồ
        const id = 'route';
        
        // Thêm nguồn dữ liệu
        if (!mapInstance.current.getSource(id)) {
          mapInstance.current.addSource(id, {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: window.goongjs.Polyline.decode(coords)
              }
            }
          });
          
          // Thêm layer hiển thị
          mapInstance.current.addLayer({
            id: id,
            type: 'line',
            source: id,
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#0080ff',
              'line-width': 5,
              'line-opacity': 0.75
            }
          });
          
          routeLayer.current = id;
        } else {
          // Cập nhật nguồn dữ liệu nếu đã tồn tại
          mapInstance.current.getSource(id).setData({
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: window.goongjs.Polyline.decode(coords)
            }
          });
        }
      }
    } catch (error) {
      console.error('Lỗi khi tính toán tuyến đường:', error);
    }
  };

  // Cập nhật markers và tuyến đường khi dữ liệu thay đổi
  useEffect(() => {
    if (!mapInstance.current || !mapLoaded) return;
    updateMapMarkers();
    calculateRoute();
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
          onClick={updateMapMarkers}
          className="bg-white p-2 rounded-full shadow-md hover:bg-gray-100"
          title="Làm mới bản đồ"
        >
          <Info className="w-4 h-4 text-gray-600" />
        </button>
      </div>
    </div>
  );
};

export default GoongMap;
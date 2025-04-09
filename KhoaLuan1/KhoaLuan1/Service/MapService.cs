
using System.Net.Http;
using System.Threading.Tasks;
using KhoaLuan1.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json.Linq;
namespace KhoaLuan1.Service
{
    public class MapService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<MapService> _logger;
        private readonly KhoaluantestContext _context;
        private const string GoongApiKey = "lvk0JwNwaf0IZdBqZeDZZS0YUfAsFl2prXSWVDkb"; // Thay bằng API Key của bạn

        public MapService(HttpClient httpClient, KhoaluantestContext context, ILogger<MapService> logger)
        {
            _httpClient = httpClient;
            _context = context;
            _logger = logger;
        }

        public async Task<(double lat, double lng)> GetCoordinates(string address)
        {
            string url = $"https://rsapi.goong.io/Geocode?address={Uri.EscapeDataString(address)}&api_key={GoongApiKey}";
            var response = await _httpClient.GetStringAsync(url);
            var json = JObject.Parse(response);

            if (json["status"].ToString() == "OK" && json["results"].HasValues)
            {
                var location = json["results"][0]["geometry"]["location"];
                double lat = location["lat"].ToObject<double>();
                double lng = location["lng"].ToObject<double>();
                return (lat, lng);
            }

            throw new Exception("Không tìm thấy địa chỉ.");
        }

        public async Task<double> CalculateShortestBikeRouteDistance(double lat1, double lng1, double lat2, double lng2)
        {
            string origin = $"{lat1},{lng1}";
            string destination = $"{lat2},{lng2}";
            string url = $"https://rsapi.goong.io/Direction?origin={origin}&destination={destination}&vehicle=bike&api_key={GoongApiKey}";

            var response = await _httpClient.GetStringAsync(url);
            var json = JObject.Parse(response);

            if (json["status"].ToString() == "OK" && json["routes"].HasValues)
            {
                var route = json["routes"][0]["legs"][0];
                double distanceInMeters = route["distance"]["value"].ToObject<double>(); // Khoảng cách tính bằng mét
                return distanceInMeters / 1000; // Chuyển sang kilômét
            }

            throw new Exception("Không tìm thấy tuyến đường phù hợp.");
        }

        // Cập nhật phương thức GetDefaultAddress trong MapService
        public async Task<(string address, double latitude, double longitude)> GetUserLocation(int? userId)
        {
            // Mặc định sẽ trả về null để controller có thể yêu cầu địa chỉ từ người dùng nếu cần
            string address = null;
            double latitude = 0;
            double longitude = 0;

            try
            {
                // 1. Kiểm tra nếu có userId, thử lấy địa chỉ từ database
                if (userId.HasValue)
                {
                    var user = await _context.Users.FindAsync(userId.Value);
                    if (user != null && !string.IsNullOrEmpty(user.Address))
                    {
                        // Đã có địa chỉ trong database
                        address = user.Address;
                        _logger.LogInformation("Sử dụng địa chỉ từ database: {Address}", address);

                        try
                        {
                            // Lấy tọa độ từ địa chỉ
                            (latitude, longitude) = await GetCoordinates(address);
                            _logger.LogInformation("Đã lấy tọa độ từ địa chỉ database: {Lat}, {Lng}", latitude, longitude);
                            return (address, latitude, longitude);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogWarning(ex, "Không thể lấy tọa độ từ địa chỉ database: {Address}", address);
                            // Tiếp tục với logic khác nếu không lấy được tọa độ từ địa chỉ
                        }
                    }
                }

                // Nếu không có địa chỉ từ database hoặc không lấy được tọa độ,
                // trả về null để controller yêu cầu người dùng nhập địa chỉ
                return (null, 0, 0);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy thông tin vị trí người dùng");
                return (null, 0, 0);
            }
        }

        // Cập nhật phương thức để chuyển đổi tọa độ thành địa chỉ
        public async Task<string> GetAddressFromCoordinates(double lat, double lng)
        {
            try
            {
                string url = $"https://rsapi.goong.io/Geocode?latlng={lat.ToString().Replace(",", ".")},{lng.ToString().Replace(",", ".")}&api_key={GoongApiKey}";
                var response = await _httpClient.GetStringAsync(url);
                var json = JObject.Parse(response);
                if (json["status"].ToString() == "OK" && json["results"].HasValues)
                {
                    return json["results"][0]["formatted_address"].ToString();
                }
                throw new Exception("Không thể xác định địa chỉ từ tọa độ này.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi chuyển đổi tọa độ thành địa chỉ: {Lat}, {Lng}", lat, lng);
                throw;
            }
        }

        public async Task<double?> CalculateDistanceAsync(double x, double y, double a, double b)
        {
            
            //var (startLat, startLng) = await GetCoordinates(startAddress);
            //var (endLat, endLng) = await GetCoordinates(endAddress);

            if (x == 0 || y == 0 || a == 0 || b == 0)
            {
                return null; // Không lấy được tọa độ
            }

            // Tạo URL gọi Goong Direction API
            string requestUri = $"https://rsapi.goong.io/Direction?origin={x.ToString().Replace(",", ".")},{y.ToString().Replace(",", ".")}&destination={a.ToString().Replace(",", ".")},{b.ToString().Replace(",", ".")}&vehicle=car&api_key={GoongApiKey}";

            var response = await _httpClient.GetAsync(requestUri);
            if (!response.IsSuccessStatusCode)
                return null; // Không thể tính khoảng cách

            var result = await response.Content.ReadAsStringAsync();
            var jsonData = JObject.Parse(result);

            // Lấy giá trị khoảng cách từ API (đơn vị mét)
            var distanceInMeters = jsonData["routes"]?[0]?["legs"]?[0]?["distance"]?["value"]?.ToObject<double>();

            return distanceInMeters.HasValue ? distanceInMeters / 1000 : null; // Chuyển đổi sang km
        }
        public string GetDefaultAddress()
        {
            return "88 Quang Trung";
        }
    }

}



using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json.Linq;
namespace KhoaLuan1.Service
{
    public class MapService
    {
        private readonly HttpClient _httpClient;
        private const string GoongApiKey = "lvk0JwNwaf0IZdBqZeDZZS0YUfAsFl2prXSWVDkb"; // Thay bằng API Key của bạn

        public MapService(HttpClient httpClient)
        {
            _httpClient = httpClient;
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
    }
}


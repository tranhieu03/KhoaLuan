
using System.Net.Http;
using System.Threading.Tasks;
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
    }
}


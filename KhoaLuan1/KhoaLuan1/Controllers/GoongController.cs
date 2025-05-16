using KhoaLuan1.Models;
using KhoaLuan1.Service;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;

namespace KhoaLuan1.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class GoongController : ControllerBase
    {
        private readonly KhoaluantestContext _context;
        private readonly HttpClient _httpClient;
        private readonly MapService _mapService;
        private const string ApiKey = "xyz"; // Thay bằng API Key của bạn

        public GoongController(KhoaluantestContext context,MapService mapService)
        {
            _context = context;
            _httpClient = new HttpClient();
            _mapService = mapService;
        }



        //API Test em hiệp ạ


        // API chuyển địa chỉ thành tọa độ (Geocoding)
        [HttpGet("geocode")]
        public async Task<IActionResult> GetCoordinates([FromQuery] GeocodeRequest model)
        {
            string requestUri = $"https://rsapi.goong.io/Geocode?address={model.Address}&api_key={ApiKey}";

            var response = await _httpClient.GetAsync(requestUri);
            if (!response.IsSuccessStatusCode)
                return BadRequest("Không thể lấy tọa độ từ địa chỉ!");

            var result = await response.Content.ReadAsStringAsync();
            return Ok(result);
        }

        // API tính khoảng cách giữa hai tọa độ (Directions API)
        [HttpGet("distance")]
        public async Task<IActionResult> CalculateDistance([FromQuery] string start, [FromQuery] string end)
        {
            string requestUri = $"https://rsapi.goong.io/Direction?origin={start}&destination={end}&vehicle=car&api_key={ApiKey}";

            var response = await _httpClient.GetAsync(requestUri);
            if (!response.IsSuccessStatusCode)
                return BadRequest("Không thể tính khoảng cách!");

            var result = await response.Content.ReadAsStringAsync();
            return Ok(result);
        }
        [HttpGet("get-coordinates")]
        public async Task<IActionResult> GetCoordinatess([FromQuery] GeocodeRequest model)
        {
            try
            {
                var (lat, lng) = await _mapService.GetCoordinates(model.Address);
                return Ok(new { latitude = lat, longitude = lng });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("distance2")]
        public async Task<IActionResult> CalculateDistance2([FromBody] Caculate model)
        {
            var restaurant = await _context.Restaurants
                .FirstOrDefaultAsync(r => r.RestaurantId == model.ResID);

            if (restaurant == null)
                return NotFound("Không tìm thấy nhà hàng!");

            // Lấy tọa độ điểm đến từ địa chỉ
            var (lat, lng) = await _mapService.GetCoordinates(model.End);

            if (lat == 0 || lng == 0)
                return BadRequest("Không thể lấy tọa độ của địa điểm đích!");

            // Tính khoảng cách giữa hai điểm
            double? distance = await _mapService.CalculateDistanceAsync(
                (double)restaurant.Latitude, (double)restaurant.Longitude, lat, lng
            );

            if (distance == null)
                return BadRequest("Không thể tính khoảng cách!");

            return Ok(new { DistanceKm = distance.Value });
        }







    }
    public class GeocodeRequest
    {
        public string Address { get; set; }
    }

    public class Caculate
    {
        public int ResID { get; set; }
        public string End { get; set; }
    }
    public class GoongGeocodeResponse
    {
        public List<Result> Results { get; set; }
        public string Status { get; set; }
    }

    public class Result
    {
        public Geometry Geometry { get; set; }
    }

    public class Geometry
    {
        public Location Location { get; set; }
    }

    public class Location
    {
        public double Lat { get; set; }
        public double Lng { get; set; }
    }


}

using KhoaLuan1.Service;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace KhoaLuan1.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class GoongController : ControllerBase
    {
        private readonly HttpClient _httpClient;
        private readonly MapService _mapService;
        private const string ApiKey = "lvk0JwNwaf0IZdBqZeDZZS0YUfAsFl2prXSWVDkb"; // Thay bằng API Key của bạn

        public GoongController(MapService mapService)
        {
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


    }
    public class GeocodeRequest
    {
        public string Address { get; set; }
    }

}

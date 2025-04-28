using KhoaLuan1.Models;
using Microsoft.Extensions.Configuration;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

namespace KhoaLuan1.Services
{
    public class ZaloPayService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<ZaloPayService> _logger;
        private readonly HttpClient _httpClient;
        private readonly string _appId;
        private readonly string _key1;
        private readonly string _key2;
        private readonly string _createOrderUrl;
        private readonly string _callbackUrl;
        private readonly string _redirectUrl;

        public ZaloPayService(IConfiguration configuration, ILogger<ZaloPayService> logger, HttpClient httpClient)
        {
            _configuration = configuration;
            _logger = logger;
            _httpClient = httpClient;

            _appId = _configuration["ZaloPay:AppId"];
            _key1 = _configuration["ZaloPay:Key1"];
            _key2 = _configuration["ZaloPay:Key2"];
            _createOrderUrl = _configuration["ZaloPay:CreateOrderUrl"];
            _callbackUrl = _configuration["ZaloPay:CallbackUrl"];
            _redirectUrl = _configuration["ZaloPay:RedirectUrl"];
        }

        public async Task<string> CreatePaymentUrl(Order order, User user)
        {
            try
            {
                _logger.LogInformation($"Bắt đầu tạo URL thanh toán ZaloPay cho đơn hàng {order.OrderId}");
                _logger.LogInformation($"AppId: {_appId}, CreateOrderUrl: {_createOrderUrl}");

                // AppTransID phải là duy nhất trong ngày
                var appTransId = $"{DateTime.Now:yyMMdd}_{order.OrderId}";
                var embedData = new Dictionary<string, string>
        {
            { "merchantinfo", "Thanh toán đơn hàng thực phẩm" },
            { "redirecturl", _redirectUrl }
        };

                _logger.LogInformation($"Tạo embedData: {JsonConvert.SerializeObject(embedData)}");

                var items = new List<object>();
                foreach (var item in order.OrderDetails)
                {
                    items.Add(new
                    {
                        itemid = item.ProductId,
                        itemname = item.Product.Name,
                        itemprice = (long)(item.Price * 100), // Chuyển sang xu (VND * 100)
                        itemquantity = item.Quantity
                    });
                }

                _logger.LogInformation($"Tạo items: {JsonConvert.SerializeObject(items)}");

                // Số tiền phải nhân 100 (đơn vị xu)
                long amount = (long)(order.TotalAmount * 100);

                var param = new Dictionary<string, string>
        {
            { "app_id", _appId },
            { "app_trans_id", appTransId },
            { "app_user", user.UserId.ToString() },
            { "app_time", DateTimeOffset.Now.ToUnixTimeMilliseconds().ToString() },
            { "amount", amount.ToString() },
            { "description", $"Thanh toán đơn hàng #{order.OrderId}" },
            { "bank_code", "zalopayapp" },
            { "item", JsonConvert.SerializeObject(items) },
            { "embed_data", JsonConvert.SerializeObject(embedData) },
            { "callback_url", _callbackUrl }
        };

                _logger.LogInformation($"Request parameters: {JsonConvert.SerializeObject(param)}");

                // Tạo chuỗi MAC bằng cách nối các giá trị và key1
                var data = _appId + "|" + param["app_trans_id"] + "|" + param["app_user"] + "|" + param["amount"] + "|"
                           + param["app_time"] + "|" + param["embed_data"] + "|" + param["item"];
                param.Add("mac", HmacSHA256(data, _key1));

                _logger.LogInformation($"Generated MAC: {param["mac"]}");

                // Gửi yêu cầu đến ZaloPay API
                var content = new FormUrlEncodedContent(param);

                // Log the exact URL and content being sent
                _logger.LogInformation($"Sending request to: {_createOrderUrl}");

                var response = await _httpClient.PostAsync(_createOrderUrl, content);
                var responseContent = await response.Content.ReadAsStringAsync();

                _logger.LogInformation($"ZaloPay API response status: {response.StatusCode}");
                _logger.LogInformation($"ZaloPay API raw response: {responseContent}");

                // Check if response is valid JSON
                var responseData = JsonConvert.DeserializeObject<Dictionary<string, object>>(responseContent);
                if (responseData == null)
                {
                    _logger.LogError("Invalid response format from ZaloPay API");
                    throw new Exception("Invalid response format from ZaloPay API");
                }

                _logger.LogInformation($"Available keys in response: {string.Join(", ", responseData.Keys)}");

                // Check if the key exists before accessing - use lowercase names without underscores
                if (responseData.ContainsKey("returncode") && responseData["returncode"].ToString() == "1")
                {
                    if (responseData.ContainsKey("orderurl") && !string.IsNullOrEmpty(responseData["orderurl"].ToString()))
                    {
                        string orderUrl = responseData["orderurl"].ToString();
                        _logger.LogInformation($"Đã tạo URL thanh toán ZaloPay thành công cho đơn hàng {order.OrderId}: {orderUrl}");
                        return orderUrl;
                    }

                    _logger.LogError("Missing orderurl in successful response");
                    throw new Exception("ZaloPay payment creation failed: Missing orderurl in response");
                }

                // Try to extract the error message and code
                string errorCode = responseData.ContainsKey("returncode")
                    ? responseData["returncode"].ToString()
                    : "unknown";

                string errorMessage = responseData.ContainsKey("returnmessage")
                    ? responseData["returnmessage"].ToString()
                    : "Unknown error";

                // If error message is empty but we have an error code, use a more descriptive message
                if (string.IsNullOrEmpty(errorMessage) && errorCode == "-2")
                {
                    errorMessage = "Invalid request parameters or authentication failed";
                }

                _logger.LogError($"ZaloPay error: Code={errorCode}, Message={errorMessage}");
                throw new Exception($"ZaloPay payment creation failed: {errorMessage}");
            }
            catch (HttpRequestException httpEx)
            {
                _logger.LogError(httpEx, $"HTTP request error when calling ZaloPay API for order {order.OrderId}");
                throw new Exception($"Failed to connect to ZaloPay: {httpEx.Message}");
            }
            catch (JsonException jsonEx)
            {
                _logger.LogError(jsonEx, $"Invalid JSON in ZaloPay response");
                throw new Exception($"Invalid response format from ZaloPay: {jsonEx.Message}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Lỗi khi tạo URL thanh toán ZaloPay cho đơn hàng {order.OrderId}");
                throw;
            }
        }
        public bool VerifyCallback(Dictionary<string, string> data)
        {
            try
            {
                _logger.LogInformation("Xác thực callback từ ZaloPay");

                if (!data.ContainsKey("mac") || !data.ContainsKey("data"))
                {
                    _logger.LogWarning("Dữ liệu callback không hợp lệ: Thiếu tham số MAC hoặc data");
                    return false;
                }

                // Xác thực MAC từ ZaloPay
                var mac = data["mac"];
                var dataJson = data["data"];
                var expectedMac = HmacSHA256(dataJson, _key2);

                if (mac != expectedMac)
                {
                    _logger.LogWarning("Xác thực callback thất bại: MAC không khớp");
                    return false;
                }

                // Giải mã dữ liệu
                var callbackData = JsonConvert.DeserializeObject<Dictionary<string, object>>(dataJson);
                if (callbackData == null)
                {
                    _logger.LogWarning("Không thể phân tích dữ liệu callback");
                    return false;
                }

                // Kiểm tra trạng thái thanh toán
                if (callbackData.ContainsKey("status") && callbackData["status"].ToString() == "1")
                {
                    _logger.LogInformation("Xác thực callback thành công, thanh toán thành công");
                    return true;
                }
                else
                {
                    _logger.LogWarning("Thanh toán không thành công");
                    return false;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi xác thực callback từ ZaloPay");
                return false;
            }
        }

        private string HmacSHA256(string data, string key)
        {
            byte[] keyBytes = Encoding.UTF8.GetBytes(key);
            byte[] dataBytes = Encoding.UTF8.GetBytes(data);

            using (var hmac = new HMACSHA256(keyBytes))
            {
                byte[] hashBytes = hmac.ComputeHash(dataBytes);
                return BitConverter.ToString(hashBytes).Replace("-", "").ToLower();
            }
        }

        public Dictionary<string, object> ParseCallbackData(string dataJson)
        {
            try
            {
                return JsonConvert.DeserializeObject<Dictionary<string, object>>(dataJson);
            }
            catch
            {
                return null;
            }
        }

        public string GetAppTransId(Dictionary<string, object> callbackData)
        {
            if (callbackData != null && callbackData.ContainsKey("app_trans_id"))
            {
                return callbackData["app_trans_id"].ToString();
            }
            return null;
        }
    }
}
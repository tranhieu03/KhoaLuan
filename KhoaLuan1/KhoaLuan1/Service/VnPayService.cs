using KhoaLuan1.Models;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Web;

namespace KhoaLuan1.Service
{
    public class VNPayService : IVNPayService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<VNPayService> _logger;

        public VNPayService(IConfiguration configuration, ILogger<VNPayService> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        public string CreatePaymentUrl(PaymentRequest request, HttpContext context)
        {
            try
            {
                _logger.LogInformation("Bắt đầu tạo URL thanh toán VNPay cho đơn hàng {OrderId}", request.OrderId);

                // Chuyển đổi sang múi giờ Việt Nam
                var timeZoneById = TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");
                var timeNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, timeZoneById);

                var vnpay = new VnPayLibrary();
                var config = _configuration.GetSection("VNPay");

                // Thông tin cơ bản
                vnpay.AddRequestData("vnp_Version", config["Version"] ?? "2.1.0");
                vnpay.AddRequestData("vnp_Command", config["Command"] ?? "pay");
                vnpay.AddRequestData("vnp_TmnCode", config["TmnCode"]);

                // Chuyển đổi số tiền sang số nguyên (VND), nhân với 100 (để thành xu)
                long amountInCents = (long)Math.Round(request.Amount * 100);
                vnpay.AddRequestData("vnp_Amount", amountInCents.ToString());

                // Định dạng thời gian tạo giao dịch
                vnpay.AddRequestData("vnp_CreateDate", timeNow.ToString("yyyyMMddHHmmss"));
                vnpay.AddRequestData("vnp_CurrCode", string.IsNullOrEmpty(request.Currency) ? "VND" : request.Currency);

                // Lấy IP của khách hàng
                var ipAddress = context.Connection.RemoteIpAddress?.MapToIPv4().ToString() ?? "127.0.0.1";
                vnpay.AddRequestData("vnp_IpAddr", ipAddress);

                // Cài đặt ngôn ngữ
                vnpay.AddRequestData("vnp_Locale", config["Locale"] ?? "vn");

                // Xử lý thông tin đơn hàng, loại bỏ ký tự đặc biệt để tránh lỗi
                string orderInfo = string.IsNullOrEmpty(request.OrderDescription)
                    ? $"Thanh toan don hang {request.OrderId}"
                    : Regex.Replace(request.OrderDescription, @"[^\w\s]", "");

                vnpay.AddRequestData("vnp_OrderInfo", orderInfo);
                vnpay.AddRequestData("vnp_OrderType", "other");
                vnpay.AddRequestData("vnp_ReturnUrl", request.ReturnUrl ?? config["ReturnUrl"]);

                // Mã tham chiếu giao dịch - kết hợp ID đơn hàng và thời gian để tạo mã duy nhất
                string txnRef = $"{request.OrderId}_{DateTime.Now.Ticks.ToString().Substring(0, 10)}";
                vnpay.AddRequestData("vnp_TxnRef", txnRef);

                // Thông tin khách hàng nếu có
                if (!string.IsNullOrEmpty(request.CustomerName))
                {
                    vnpay.AddRequestData("vnp_Bill_FirstName", Regex.Replace(request.CustomerName, @"[^\w\s]", ""));
                }

                // Tạo URL với hash bảo mật
                string paymentUrl = vnpay.CreateRequestUrl(config["BaseUrl"], config["HashSecret"]);

                _logger.LogInformation("Đã tạo URL thanh toán VNPay thành công: {Url}", paymentUrl);

                return paymentUrl;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi tạo URL thanh toán VNPay cho đơn hàng {OrderId}", request.OrderId);
                throw new Exception("Không thể tạo URL thanh toán VNPay", ex);
            }
        }

        public bool ValidatePayment(IQueryCollection collection)
        {
            try
            {
                _logger.LogInformation("Bắt đầu xác thực kết quả thanh toán VNPay");

                // Kiểm tra sự tồn tại của chữ ký VNPay
                if (!collection.ContainsKey("vnp_SecureHash"))
                {
                    _logger.LogError("Không tìm thấy chữ ký bảo mật (vnp_SecureHash) trong dữ liệu trả về");
                    return false;
                }

                string vnpSecureHash = collection["vnp_SecureHash"].ToString();

                // Tạo danh sách tham số đã sắp xếp
                var vnpParams = new SortedList<string, string>(new VnPayLibrary.VnPayCompare());
                foreach (var key in collection.Keys)
                {
                    // Chỉ lấy các tham số của VNPay, loại trừ chữ ký
                    if (!string.IsNullOrEmpty(key) && key.StartsWith("vnp_") &&
                        key != "vnp_SecureHash" && key != "vnp_SecureHashType")
                    {
                        vnpParams.Add(key, collection[key].ToString());
                    }
                }

                // Tạo chuỗi dữ liệu để tính toán chữ ký
                var signData = new StringBuilder();
                foreach (var kv in vnpParams)
                {
                    signData.Append(WebUtility.UrlEncode(kv.Key) + "=" + WebUtility.UrlEncode(kv.Value) + "&");
                }

                // Loại bỏ ký tự '&' cuối cùng
                if (signData.Length > 0)
                {
                    signData.Length--;
                }

                // Tính toán chữ ký
                var hashSecret = _configuration["VNPay:HashSecret"];
                string computedHash = HmacSha512(hashSecret, signData.ToString());

                _logger.LogDebug("Chữ ký tính toán: {ComputedHash}", computedHash);
                _logger.LogDebug("Chữ ký nhận được: {ReceivedHash}", vnpSecureHash);

                // So sánh chữ ký
                bool isValid = computedHash.Equals(vnpSecureHash, StringComparison.InvariantCultureIgnoreCase);

                if (isValid)
                {
                    _logger.LogInformation("Xác thực chữ ký VNPay thành công");
                }
                else
                {
                    _logger.LogWarning("Xác thực chữ ký VNPay thất bại");
                }

                return isValid;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi trong quá trình xác thực kết quả thanh toán VNPay");
                return false;
            }
        }

        public string GetTransactionStatus(string responseCode)
        {
            switch (responseCode)
            {
                case "00":
                    return "Giao dịch thành công";
                case "01":
                    return "Giao dịch chưa hoàn tất";
                case "02":
                    return "Giao dịch bị lỗi";
                case "04":
                    return "Giao dịch đảo (Khách hàng đã bị trừ tiền tại Ngân hàng nhưng GD chưa thành công ở VNPAY)";
                case "05":
                    return "VNPAY đang xử lý giao dịch này (GD hoàn tiền)";
                case "06":
                    return "VNPAY đã gửi yêu cầu hoàn tiền sang Ngân hàng (GD hoàn tiền)";
                case "07":
                    return "Giao dịch bị nghi ngờ gian lận";
                case "09":
                    return "GD Hoàn trả bị từ chối";
                case "10":
                    return "Đã hết hạn chờ thanh toán";
                case "11":
                    return "GD đã bị hủy";
                case "24":
                    return "Khách hàng hủy giao dịch";
                default:
                    return "Lỗi giao dịch";
            }
        }

        private string HmacSha512(string key, string inputData)
        {
            var hash = new StringBuilder();
            var keyBytes = Encoding.UTF8.GetBytes(key);
            var inputBytes = Encoding.UTF8.GetBytes(inputData);

            using (var hmac = new HMACSHA512(keyBytes))
            {
                var hashValue = hmac.ComputeHash(inputBytes);
                foreach (var theByte in hashValue)
                {
                    hash.Append(theByte.ToString("x2"));
                }
            }

            return hash.ToString();
        }
    }
    public class PaymentRequest
    {
        public string OrderId { get; set; }
        public decimal Amount { get; set; }
        public string OrderDescription { get; set; }
        public string CustomerName { get; set; }
        public string ReturnUrl { get; set; }
        public string Currency { get; set; } = "VND";
    }
}

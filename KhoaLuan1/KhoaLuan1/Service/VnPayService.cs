using System;
using System.Collections.Specialized;
using System.Globalization;
using System.Linq;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using KhoaLuan1.Service;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

public class VNPayService : IVnPayService
{
    private readonly IConfiguration _configuration;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public VNPayService(IConfiguration configuration, IHttpContextAccessor httpContextAccessor)
    {
        _configuration = configuration;
        _httpContextAccessor = httpContextAccessor;
    }

    public string CreatePaymentUrl(PaymentInformationModel model, HttpContext context)
    {
        var timeZoneById = TimeZoneInfo.FindSystemTimeZoneById(_configuration["TimeZoneId"]);
        var timeNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, timeZoneById);
        var tick = DateTime.Now.Ticks.ToString();
        var pay = new VnPayLibrary();
        var urlCallBack = _configuration["Vnpay:PaymentBackReturnUrl"];

        pay.AddRequestData("vnp_Version", _configuration["Vnpay:Version"]);
        pay.AddRequestData("vnp_Command", _configuration["Vnpay:Command"]);
        pay.AddRequestData("vnp_TmnCode", _configuration["Vnpay:TmnCode"]);
        pay.AddRequestData("vnp_Amount", ((int)model.Total * 100).ToString());
        pay.AddRequestData("vnp_CreateDate", timeNow.ToString("yyyyMMddHHmmss"));
        pay.AddRequestData("vnp_CurrCode", _configuration["Vnpay:CurrCode"]);
        pay.AddRequestData("vnp_IpAddr", pay.GetIpAddress(context));
        pay.AddRequestData("vnp_Locale", _configuration["Vnpay:Locale"]);
        pay.AddRequestData("vnp_OrderInfo", $"{model.RoomName} {model.Total} {model.BillId}");
        pay.AddRequestData("vnp_OrderType", "other");
        pay.AddRequestData("vnp_ReturnUrl", urlCallBack);
        pay.AddRequestData("vnp_TxnRef", tick);

        var paymentUrl = pay.CreateRequestUrl(_configuration["Vnpay:BaseUrl"], _configuration["Vnpay:HashSecret"]);
        return paymentUrl;
    }

    public string CreatePaymentUrl(PaymentRequest request, HttpContext context)
    {
        // Validate request
        if (string.IsNullOrEmpty(request.OrderDescription))
        {
            request.OrderDescription = $"Thanh toán đơn hàng #{request.OrderId}";
        }

        var timeNow = DateTime.UtcNow;
        var pay = new VnPayLibrary();

        pay.AddRequestData("vnp_Version", _configuration["Vnpay:Version"]);
        pay.AddRequestData("vnp_Command", _configuration["Vnpay:Command"]);
        pay.AddRequestData("vnp_TmnCode", _configuration["Vnpay:TmnCode"]);
        pay.AddRequestData("vnp_Amount", ((int)request.Amount).ToString()); // Nhân 100 và chuyển thành chuỗi
        pay.AddRequestData("vnp_CreateDate", timeNow.ToString("yyyyMMddHHmmss"));
        pay.AddRequestData("vnp_CurrCode", _configuration["Vnpay:CurrCode"]);
        pay.AddRequestData("vnp_IpAddr", pay.GetIpAddress(context));
        pay.AddRequestData("vnp_Locale", _configuration["Vnpay:Locale"]);
        pay.AddRequestData("vnp_OrderInfo", request.OrderDescription);
        pay.AddRequestData("vnp_OrderType", "other");
        pay.AddRequestData("vnp_ReturnUrl", request.ReturnUrl);
        pay.AddRequestData("vnp_TxnRef", request.OrderId);

        // Thêm thông tin khách hàng (bắt buộc)
        pay.AddRequestData("vnp_Bill_FirstName", RemoveDiacritics(request.CustomerName).ToUpper());
        pay.AddRequestData("vnp_Bill_Email", _httpContextAccessor.HttpContext?.User.FindFirst("Email")?.Value ?? "customer@email.com");
        pay.AddRequestData("vnp_Bill_Mobile", _httpContextAccessor.HttpContext?.User.FindFirst("PhoneNumber")?.Value ?? "0900000000");
        pay.AddRequestData("vnp_Bill_Address", "Not Provided");
        pay.AddRequestData("vnp_Bill_City", "Not Provided");
        pay.AddRequestData("vnp_Bill_Country", "Viet Nam");

        var paymentUrl = pay.CreateRequestUrl(_configuration["Vnpay:BaseUrl"], _configuration["Vnpay:HashSecret"]);
        return paymentUrl;
    }

    // Hàm bỏ dấu tiếng Việt
    private string RemoveDiacritics(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return text;

        text = text.Normalize(NormalizationForm.FormD);
        var chars = text.Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark).ToArray();
        return new string(chars).Normalize(NormalizationForm.FormC);
    }

    public PaymentResponseModel PaymentExecute(IQueryCollection collections)
    {
        // Log tất cả tham số nhận được từ VNPay để debug
        foreach (var key in collections.Keys)
        {
            Console.WriteLine($"VNPay callback parameter: {key}={collections[key]}");
        }

        var pay = new VnPayLibrary();
        var response = pay.GetFullResponseData(collections, _configuration["Vnpay:HashSecret"]);

        // Kiểm tra mã trạng thái thanh toán từ VNPay
        if (collections.TryGetValue("vnp_ResponseCode", out var responseCode))
        {
            // VNPay chỉ trả về mã "00" khi thanh toán thành công
            // Mọi mã khác đều là thất bại hoặc bị hủy
            response.Success = responseCode.ToString() == "00";

            // Log kết quả
            Console.WriteLine($"VNPay payment result: ResponseCode={responseCode}, Success={response.Success}");
        }
        else
        {
            // Nếu không có mã phản hồi, đánh dấu là thất bại
            response.Success = false;
            Console.WriteLine("VNPay payment result: No ResponseCode found, marking as failed");
        }

        return response;
    }

    public class PaymentInformationModel
    {
        public decimal Total { get; set; }
        public string RoomName { get; set; }
        public string BillId { get; set; }
    }

    // PaymentResponseModel.cs
    public class PaymentResponseModel
    {
        public bool Success { get; set; }
        public string PaymentMethod { get; set; }
        public string OrderDescription { get; set; }
        public string OrderId { get; set; }
        public string PaymentId { get; set; }
        public string TransactionId { get; set; }
        public string Token { get; set; }
        public string VnPayResponseCode { get; set; }
        public string BillId { get; set; }
        public decimal Total { get; set; }
    }

    // PaymentRequest.cs
    public class PaymentRequest
    {
        public string OrderId { get; set; }
        public decimal Amount { get; set; }
        public string OrderDescription { get; set; }
        public string CustomerName { get; set; }
        public string ReturnUrl { get; set; }
    }
}
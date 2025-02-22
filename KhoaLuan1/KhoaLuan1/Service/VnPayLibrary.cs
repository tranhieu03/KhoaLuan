using System.Globalization;
using System.Net;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Http;
using System.Collections.Generic;
using System.Linq;

namespace KhoaLuan1.Service
{
    public class VnPayLibrary
    {
        private readonly SortedList<string, string> _requestData = new();
        private readonly SortedList<string, string> _responseData = new();

        public void AddRequestData(string key, string value)
        {
            if (!string.IsNullOrEmpty(key) && !string.IsNullOrEmpty(value))
            {
                _requestData[key] = value;
            }
        }

        public string CreateRequestUrl(string baseUrl, string hashSecret)
        {
            var data = string.Join("&", _requestData.Select(x => $"{x.Key}={Uri.EscapeDataString(x.Value)}"));
            var hash = HmacSHA256(hashSecret, data);
            return $"{baseUrl}?{data}&vnp_SecureHash={hash}";
        }

        public string GetIpAddress(HttpContext context)
        {
            try
            {
                var remoteIpAddress = context.Connection.RemoteIpAddress;
                if (remoteIpAddress != null)
                {
                    if (remoteIpAddress.AddressFamily == AddressFamily.InterNetworkV6)
                    {
                        remoteIpAddress = Dns.GetHostEntry(remoteIpAddress).AddressList
                            .FirstOrDefault(x => x.AddressFamily == AddressFamily.InterNetwork);
                    }
                    return remoteIpAddress?.ToString() ?? "127.0.0.1";
                }
            }
            catch
            {
                return "127.0.0.1";
            }
            return "127.0.0.1";
        }

        public PaymentResponseModel GetFullResponseData(IQueryCollection collections, string hashSecret)
        {
            foreach (var (key, value) in collections)
            {
                if (!string.IsNullOrEmpty(key) && key.StartsWith("vnp_"))
                {
                    _responseData[key] = value;
                }
            }

            var secureHash = collections["vnp_SecureHash"];
            var data = string.Join("&", _responseData.Where(x => x.Key != "vnp_SecureHash")
                .Select(x => $"{x.Key}={x.Value}"));
            var calculatedHash = HmacSHA256(hashSecret, data);

            var orderId = _responseData.ContainsKey("vnp_TxnRef") ? _responseData["vnp_TxnRef"] : "0";
            var transactionStatus = _responseData.ContainsKey("vnp_TransactionStatus") ? _responseData["vnp_TransactionStatus"] : null;
            var totalAmount = _responseData.ContainsKey("vnp_Amount") ? (decimal.Parse(_responseData["vnp_Amount"]) / 100) : 0;

            return new PaymentResponseModel
            {
                OrderId = int.TryParse(orderId, out var id) ? id : 0,
                vnp_TransactionStatus = transactionStatus,
                Success = secureHash == calculatedHash && transactionStatus == "00",
                Total = totalAmount
            };
        }

        private static string HmacSHA256(string key, string input)
        {
            var keyBytes = Encoding.UTF8.GetBytes(key);
            using var hmac = new HMACSHA256(keyBytes);
            var hashBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(input));
            return BitConverter.ToString(hashBytes).Replace("-", "").ToUpper();
        }

        public SortedList<string, string> GetRequestData()
        {
            return _requestData;
        }


    }


    public class PaymentResponseModel
    {
        public string vnp_TransactionStatus { get; set; }
        public string OrderDescription { get; set; }
        public string TransactionId { get; set; }
        public int OrderId { get; set; }
        public string PaymentMethod { get; set; }
        public string PaymentId { get; set; }
        public bool Success { get; set; }
        public string Token { get; set; }
        public string VnPayResponseCode { get; set; }
        public string BillId { get; set; }
        public decimal Total { get; set; }
    }
}

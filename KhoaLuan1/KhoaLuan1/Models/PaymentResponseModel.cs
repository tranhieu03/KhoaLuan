namespace KhoaLuan1.Models
{
    public class PaymentResponseModel
    {
        public string VnPayTranId { get; set; } // Mã giao dịch VNPAY
        public string OrderId { get; set; } // Mã đơn hàng
        public string TransactionStatus { get; set; } // Trạng thái giao dịch
        public string SecureHash { get; set; } // Chuỗi hash bảo mật
        public bool IsSuccess { get; set; } // Giao dịch thành công hay không
    }
}

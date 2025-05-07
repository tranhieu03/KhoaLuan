namespace KhoaLuan1.Service
{
    public interface IVNPayService
    {
        string CreatePaymentUrl(PaymentRequest request, HttpContext context);
        bool ValidatePayment(IQueryCollection collection);
        string GetTransactionStatus(string responseCode);
    }
}

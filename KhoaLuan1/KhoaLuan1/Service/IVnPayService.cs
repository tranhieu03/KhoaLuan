using static EmailService;
using static VNPayService;

namespace KhoaLuan1.Service
{
    public interface IVnPayService
    {
        string CreatePaymentUrl(PaymentInformationModel model, HttpContext context);
        string CreatePaymentUrl(PaymentRequest request, HttpContext context);
        PaymentResponseModel PaymentExecute(IQueryCollection collections);
    }
}

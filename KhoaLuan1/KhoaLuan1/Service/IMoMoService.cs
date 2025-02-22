using KhoaLuan1.Models;

namespace KhoaLuan1.Service
{
    public interface IMoMoService
    {
        Task<MomoCreatePaymentResponseModel> CreatePaymentMomo(OrderInfoModel model);
        MomoExecuteResponseModel PaymentExecuteAsync(IQueryCollection collection);
    }
}

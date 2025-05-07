namespace KhoaLuan1.Service
{
    public interface IEmailService
    {
        Task<bool> SendEmailAsync(string toEmail, string subject, string message);
        Task<bool> CanSendEmail(string toEmail);
        Task<int> GetRemainingEmailAttemptsAsync(string email);
        Task ResetEmailSendCountAsync(string email);
    }

}

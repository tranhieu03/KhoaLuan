using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using Microsoft.Extensions.Configuration;
using System;
using System.Threading.Tasks;
using KhoaLuan1.Models;
using Microsoft.EntityFrameworkCore;

public class EmailService
{
    private readonly IConfiguration _configuration;
    private readonly KhoaluantestContext _context;
    private readonly int _maxEmailSendAttempts;

    public EmailService(IConfiguration configuration, KhoaluantestContext context)
    {
        _configuration = configuration;

        // Đọc cấu hình số lần gửi email tối đa từ appsettings.json, mặc định là 5
        _maxEmailSendAttempts = _configuration.GetValue<int>("EmailSettings:MaxSendAttempts", 5);
        _context = context;
    }

    public async Task<bool> CanSendEmail(string toEmail)
    {
        var record = await _context.EmailSendRecords.FirstOrDefaultAsync(r => r.Email == toEmail);

        if (record == null)
            return true;

        // Kiểm tra nếu đã quá số lần gửi cho phép
        if (record.SendCount >= _maxEmailSendAttempts)
        {
            // Tự động reset số lần gửi sau 24 giờ
            if (record.LastSentTime.AddHours(24) < DateTime.UtcNow)
            {
                record.SendCount = 0;
                _context.EmailSendRecords.Update(record);
                await _context.SaveChangesAsync();
                return true;
            }
            return false;
        }

        return true;
    }

    // Lấy số lần còn lại có thể gửi email
    public async Task<int> GetRemainingEmailAttemptsAsync(string email)
    {
        var record = await _context.EmailSendRecords.FirstOrDefaultAsync(r => r.Email == email);

        if (record == null)
            return _maxEmailSendAttempts;

        // Reset nếu đã qua 24 giờ
        if (record.LastSentTime.AddHours(24) < DateTime.UtcNow)
        {
            record.SendCount = 0;
            _context.EmailSendRecords.Update(record);
            await _context.SaveChangesAsync();
            return _maxEmailSendAttempts;
        }

        return Math.Max(0, _maxEmailSendAttempts - record.SendCount);
    }

    // Reset số lần gửi email
    public async Task ResetEmailSendCountAsync(string email)
    {
        var record = await _context.EmailSendRecords.FirstOrDefaultAsync(r => r.Email == email);

        if (record != null)
        {
            record.SendCount = 0;
            _context.EmailSendRecords.Update(record);
            await _context.SaveChangesAsync();
        }
    }

    public async Task<bool> SendEmailAsync(string toEmail, string subject, string message)
    {
        // Kiểm tra xem có thể gửi email không
        if (!await CanSendEmail(toEmail))
        {
            Console.WriteLine($"Đã vượt quá giới hạn gửi email cho {toEmail}");
            return false;
        }

        try
        {
            var emailSettings = _configuration.GetSection("EmailSettings");
            var senderEmail = emailSettings["SenderEmail"];
            var senderPassword = emailSettings["SenderPassword"];
            var smtpServer = emailSettings["SmtpServer"];
            var smtpPort = int.Parse(emailSettings["SmtpPort"]);

            var email = new MimeMessage();
            email.From.Add(new MailboxAddress("HH FOOD", senderEmail));
            email.To.Add(new MailboxAddress("", toEmail));
            email.Subject = subject;
            email.Body = new TextPart("html") { Text = message };

            using var smtp = new SmtpClient();
            await smtp.ConnectAsync(smtpServer, smtpPort, SecureSocketOptions.StartTls);
            await smtp.AuthenticateAsync(senderEmail, senderPassword);
            await smtp.SendAsync(email);
            await smtp.DisconnectAsync(true);

            // Cập nhật số lần gửi email
            await UpdateEmailSendCount(toEmail);

            return true; // Gửi email thành công
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Lỗi gửi email: {ex.Message}");
            return false; // Gửi email thất bại
        }
    }

    // Phương thức cập nhật số lần gửi email
    private async Task UpdateEmailSendCount(string email)
    {
        var record = await _context.EmailSendRecords.FirstOrDefaultAsync(r => r.Email == email);

        if (record == null)
        {
            // Tạo bản ghi mới nếu chưa tồn tại
            record = new EmailSendRecord
            {
                Email = email,
                SendCount = 1,
                LastSentTime = DateTime.UtcNow
            };
            _context.EmailSendRecords.Add(record);
        }
        else
        {
            // Reset số lần gửi nếu đã qua 24 giờ
            if (record.LastSentTime.AddHours(24) < DateTime.UtcNow)
            {
                record.SendCount = 1;
            }
            else
            {
                record.SendCount++;
            }

            record.LastSentTime = DateTime.UtcNow;
            _context.EmailSendRecords.Update(record);
        }

        await _context.SaveChangesAsync();
    }

}


using System;
using System.Collections.Generic;

namespace KhoaLuan1.Models;

public partial class EmailSendRecord
{
    public int Id { get; set; }

    public string Email { get; set; } = null!;

    public int SendCount { get; set; }

    public DateTime LastSentTime { get; set; }
}

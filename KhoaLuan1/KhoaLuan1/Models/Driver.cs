using System;
using System.Collections.Generic;

namespace KhoaLuan1.Models;

public partial class Driver
{
    public int DriverId { get; set; }

    public int UserId { get; set; }

    public string LicensePlate { get; set; } = null!;

    public string Hometown { get; set; } = null!;

    public string? FrontIdCardImage { get; set; }

    public string? BackIdCardImage { get; set; }

    public DateTime? CreatedAt { get; set; }

    public string? Status { get; set; }

    public virtual User User { get; set; } = null!;
}

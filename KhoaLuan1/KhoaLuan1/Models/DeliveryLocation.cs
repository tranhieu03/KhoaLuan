using System;
using System.Collections.Generic;

namespace KhoaLuan1.Models;

public partial class DeliveryLocation
{
    public int LocationId { get; set; }

    public int DeliveryPersonId { get; set; }

    public int OrderId { get; set; }

    public DateTime UpdatedAt { get; set; }

    public string? Address { get; set; }

    public virtual User DeliveryPerson { get; set; } = null!;

    public virtual Order Order { get; set; } = null!;
}

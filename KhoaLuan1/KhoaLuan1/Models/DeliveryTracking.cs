using System;
using System.Collections.Generic;

namespace KhoaLuan1.Models;

public partial class DeliveryTracking
{
    public int TrackingId { get; set; }

    public int OrderId { get; set; }

    public int DeliveryPersonId { get; set; }

    public decimal Latitude { get; set; }

    public decimal Longitude { get; set; }

    public DateTime TrackingTime { get; set; }

    public string TrackingType { get; set; } = null!;

    public virtual User DeliveryPerson { get; set; } = null!;

    public virtual Order Order { get; set; } = null!;
}

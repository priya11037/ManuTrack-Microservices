namespace ComplianceService.Models;

public class AuditEntry
{
    public int      AuditID     { get; set; }
    public int      UserID      { get; set; }
    public string   UserName    { get; set; } = string.Empty;
    public string   Action      { get; set; } = string.Empty;
    public string   EntityType  { get; set; } = string.Empty;
    public string   EntityID    { get; set; } = string.Empty;
    public string   ServiceName { get; set; } = string.Empty;
    public string?  Details     { get; set; }
    public string   Severity    { get; set; } = "info";        // info / success / warning / error
    public string   IpAddress   { get; set; } = string.Empty;
    public DateTime Timestamp   { get; set; } = DateTime.UtcNow;
}

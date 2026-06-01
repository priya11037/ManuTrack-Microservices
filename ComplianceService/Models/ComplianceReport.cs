namespace ComplianceService.Models;

public class ComplianceReport
{
    public int      ReportID           { get; set; }
    public string   ReportNumber       { get; set; } = string.Empty;  // CR-0001
    public string   Title              { get; set; } = string.Empty;
    public string   Type               { get; set; } = string.Empty;  // Quality/Safety/Environmental/Production/Supplier
    public string   Priority           { get; set; } = "Medium";      // Low/Medium/High/Critical
    public string   Status             { get; set; } = "Draft";       // Draft/Under Review/Approved/Submitted/Rejected
    public string   Period             { get; set; } = string.Empty;  // e.g. "Q1 2025"
    public string   PreparedBy         { get; set; } = string.Empty;
    public string   ReviewedBy         { get; set; } = string.Empty;
    public DateTime SubmissionDeadline { get; set; }
    public DateTime? SubmittedDate     { get; set; }
    public int      Findings           { get; set; }
    public int      Actions            { get; set; }
    public string?  Notes              { get; set; }
    public DateTime  CreatedDate       { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedDate       { get; set; }
}

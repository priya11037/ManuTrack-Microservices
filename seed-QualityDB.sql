-- ============================================================
-- ManuTrack Seed Data — ManuTrackQualityDB
-- Run this in SQL Server Object Explorer after all services start
-- Right-click ManuTrackQualityDB → New Query → paste → Execute
-- ============================================================

USE ManuTrackQualityDB;
GO

-- ── Inspections ───────────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM Inspections)
BEGIN
    INSERT INTO Inspections (WorkOrderID, InspectionDate, InspectorID, InspectorName, Result, Status, Notes, CreatedDate)
    VALUES
        (1, DATEADD(day,-1,GETUTCDATE()), '4', 'Emily Clark',  'Passed',    'Passed',    'All dimensions within tolerance. Surface finish acceptable.',         GETUTCDATE()),
        (4, GETUTCDATE(),                 '8', 'Amy Zhang',    'In Review', 'In Review', 'Pressure test ongoing. 45 of 100 units inspected so far.',           GETUTCDATE()),
        (9, DATEADD(day,-1,GETUTCDATE()), '4', 'Emily Clark',  'Failed',    'Failed',    'Piston ring defect found on 3 units. Bore diameter out of tolerance.',GETUTCDATE()),
        (2, DATEADD(day,3,GETUTCDATE()),  '9', 'Carlos Ramos', 'Pending',   'Pending',   '',                                                                    GETUTCDATE()),
        (8, DATEADD(day,-8,GETUTCDATE()), '6', 'Linda Brown',  'Passed',    'Passed',    'QC passed — ready to dispatch.',                                      GETUTCDATE()),
        (5, DATEADD(day,6,GETUTCDATE()),  '8', 'Amy Zhang',    'Pending',   'Pending',   'Pending material clearance before production can begin.',             GETUTCDATE()),
        (3, DATEADD(day,-10,GETUTCDATE()),'9', 'Carlos Ramos', 'Passed',    'Passed',    'No defects found. All units pressure-tested successfully.',           GETUTCDATE()),
        (7, DATEADD(day,13,GETUTCDATE()), '4', 'Emily Clark',  'Pending',   'Pending',   '',                                                                    GETUTCDATE());
    PRINT 'Inspections seeded.';
END
GO

-- ── Defects ───────────────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM Defects)
BEGIN
    INSERT INTO Defects (InspectionID, Description, Severity, Status, ResolutionDescription, ResolvedDate, CreatedDate)
    VALUES
        (3, 'Piston ring does not meet pressure specification. 3 units failed pressure test.',    'Critical', 'Open',        NULL,                                                       NULL,          GETUTCDATE()),
        (3, 'Bore diameter out of tolerance by 0.3mm on 2 units. Sent for rework.',              'Major',    'In Progress', NULL,                                                       NULL,          GETUTCDATE()),
        (3, 'Minor surface scratch on housing. Accepted within cosmetic tolerance.',              'Minor',    'Resolved',    'Accepted under cosmetic tolerance — no functional impact.', GETUTCDATE(), GETUTCDATE()),
        (2, 'Valve seat not seated correctly on 4 units. Assembly error — sent for rework.',     'Major',    'Open',        NULL,                                                       NULL,          GETUTCDATE()),
        (2, 'Weld porosity detected on pressure vessel wall of 1 unit. Unit scrapped.',          'Critical', 'Open',        NULL,                                                       NULL,          GETUTCDATE());
    PRINT 'Defects seeded.';
END
GO

-- ── Compliance Reports ────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM ComplianceReports)
BEGIN
    INSERT INTO ComplianceReports (Title, Scope, Metrics, GeneratedDate, GeneratedByUserID, GeneratedBy, Status, ReportType, PeriodStart, PeriodEnd, ApprovedBy, ApprovedDate, CreatedDate)
    VALUES
        ('Q1 Annual Safety Review',             'Full site safety audit Q1 2025',               '{"findings":5,"actions":8}',  DATEADD(day,-65,GETUTCDATE()), 6, 'Linda Brown',  'Submitted',    'Safety',       '2025-01-01', '2025-03-31', 'Robert Chen', DATEADD(day,-60,GETUTCDATE()), DATEADD(day,-65,GETUTCDATE())),
        ('ISO 9001 Compliance Audit 2025',      'ISO 9001:2015 full clause audit',              '{"findings":8,"actions":12}', DATEADD(day,-30,GETUTCDATE()), 8, 'Amy Zhang',    'Rejected',     'Quality',      '2025-01-01', '2025-12-31', NULL,          NULL,                          DATEADD(day,-30,GETUTCDATE())),
        ('Q2 2025 Quality Compliance Review',   'Q2 quality metrics and inspection outcomes',   '{"findings":3,"actions":5}',  DATEADD(day,-7,GETUTCDATE()),  6, 'Linda Brown',  'Submitted',    'Quality',      '2025-04-01', '2025-06-30', 'Robert Chen', DATEADD(day,-2,GETUTCDATE()),  DATEADD(day,-7,GETUTCDATE())),
        ('May 2025 Safety Incident Report',     'Monthly safety incident tracking',             '{"findings":2,"actions":4}',  DATEADD(day,-5,GETUTCDATE()),  5, 'Robert Chen',  'Approved',     'Safety',       '2025-05-01', '2025-05-31', 'Linda Brown', NULL,                          DATEADD(day,-5,GETUTCDATE())),
        ('Environmental Impact Assessment H1',  'H1 environmental compliance review',          '{"findings":1,"actions":2}',  DATEADD(day,-3,GETUTCDATE()),  6, 'Linda Brown',  'Under Review', 'Environmental','2025-01-01', '2025-06-30', NULL,          NULL,                          DATEADD(day,-3,GETUTCDATE())),
        ('Production Efficiency Compliance Q2', 'Q2 production KPI compliance',                '{"findings":0,"actions":0}',  GETUTCDATE(),                  5, 'Robert Chen',  'Draft',        'Production',   '2025-04-01', '2025-06-30', NULL,          NULL,                          GETUTCDATE()),
        ('Supplier Audit — SteelCo Ltd',        'Annual supplier quality and delivery audit',   '{"findings":4,"actions":6}',  DATEADD(day,-6,GETUTCDATE()),  4, 'Emily Clark',  'Approved',     'Supplier',     '2025-05-01', '2025-05-31', 'Robert Chen', NULL,                          DATEADD(day,-6,GETUTCDATE()));
    PRINT 'Compliance Reports seeded.';
END
GO

PRINT '=== ManuTrackQualityDB seeding complete ===';

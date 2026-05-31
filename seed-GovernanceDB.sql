-- ============================================================
-- ManuTrack Seed Data — ManuTrackGovernanceDB
-- Run this AFTER AuthService has started (users are seeded by code)
-- Right-click ManuTrackGovernanceDB → New Query → paste → Execute
-- ============================================================

USE ManuTrackGovernanceDB;
GO

-- ── Audit Entries ─────────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM AuditEntries)
BEGIN
    INSERT INTO AuditEntries (UserID, UserName, Action, EntityType, EntityID, ServiceName, Details, Timestamp)
    VALUES
        (1, 'John Smith',   'Create',       'WorkOrder',     '1', 'WorkOrderService',  'Created Work Order WO-0001 for Shaft Assembly — Qty: 50, Line A',                  DATEADD(hour,-8,GETUTCDATE())),
        (4, 'Emily Clark',  'Update',       'Inspection',    '2', 'QualityService',    'Advanced Inspection INS-1002 from Pending to In Review — Control Valve, WO-0004',   DATEADD(hour,-7,GETUTCDATE())),
        (2, 'Sarah Lee',    'Update',       'WorkOrder',     '4', 'WorkOrderService',  'Updated Work Order WO-0004 status to In Progress — Control Valve, Line C',          DATEADD(hour,-7,GETUTCDATE())),
        (1, 'John Smith',   'Create',       'User',          '3', 'AuthService',       'Created new user account: Mike Johnson (ShopFloorOperator) — Invite sent',          DATEADD(hour,-6,GETUTCDATE())),
        (5, 'Robert Chen',  'Update',       'Inventory',     '2', 'InventoryService',  'Updated stock level for Steel Plate 6mm: 180 to 45 units after consumption',        DATEADD(hour,-5,GETUTCDATE())),
        (0, 'System',       'Failed Login', 'Auth',          '0', 'AuthService',       'Failed login attempt: unknown@external.com — 3 consecutive failures',               DATEADD(hour,-4,GETUTCDATE())),
        (6, 'Linda Brown',  'Submit',       'Report',        '3', 'ComplianceService', 'Submitted Q2 2025 Quality Compliance Review — 3 findings, 5 actions',               DATEADD(hour,-3,GETUTCDATE())),
        (8, 'Amy Zhang',    'Create',       'Defect',        '2', 'QualityService',    'Logged Defect on INS-1003 — Hydraulic Pump: Dimensional Error, 2 units',            DATEADD(hour,-3,GETUTCDATE())),
        (9, 'Carlos Ramos', 'Complete',     'WorkOrder',     '3', 'WorkOrderService',  'Marked WO-0003 as Completed — Hydraulic Pump, 10/10 units, QC passed',              DATEADD(hour,-2,GETUTCDATE())),
        (5, 'Robert Chen',  'Create',       'PurchaseOrder', '1', 'InventoryService',  'Raised PO-0001 — Steel Plate 6mm, 300kg, 960 GBP, SteelCo Ltd, Urgent',            DATEADD(hour,-2,GETUTCDATE())),
        (0, 'System',       'Generate',     'Report',        '0', 'AnalyticsService',  'Auto-generated monthly Inventory Consumption Report for May 2025',                  DATEADD(hour,-1,GETUTCDATE())),
        (4, 'Emily Clark',  'Fail',         'Inspection',    '3', 'QualityService',    'Marked INS-1003 as Failed — Hydraulic Pump: Piston ring defect, 3 units affected',  DATEADD(hour,-1,GETUTCDATE()));
    PRINT 'Audit Entries seeded.';
END
GO

-- ── Notifications ─────────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM Notifications)
BEGIN
    INSERT INTO Notifications (UserID, Title, Message, Category, Status, Priority, CreatedDate)
    VALUES
        -- Admin (UserID=1)
        (1, 'New user invitation accepted',    'Mike Johnson has set up his password and activated his ShopFloorOperator account.',       'Users',      'Unread', 'High',   DATEADD(minute,-5,GETUTCDATE())),
        (1, 'Login failure spike detected',    '5 consecutive failed login attempts from unknown@external.com in the last hour.',         'Auth',       'Unread', 'High',   DATEADD(minute,-22,GETUTCDATE())),
        (1, '2 users inactive for 30+ days',   'Tom Wilson and Nina Patel have not logged in for over 30 days.',                         'Users',      'Unread', 'Medium', DATEADD(hour,-2,GETUTCDATE())),
        (1, 'Pending invitation expiring',     'Nina Patel''s invite link expires in 24 hours. Resend if needed.',                       'Users',      'Read',   'Low',    DATEADD(hour,-5,GETUTCDATE())),
        -- Production Planner (UserID=2)
        (2, 'WO-0001 is overdue',              'Shaft Assembly — due today. Currently 64% complete on Line A.',                           'WorkOrders', 'Unread', 'High',   DATEADD(minute,-10,GETUTCDATE())),
        (2, 'WO-0004 flagged as critical',     'Control Valve — 45/100 units produced. Due tomorrow. Urgent attention required.',         'WorkOrders', 'Unread', 'High',   DATEADD(minute,-35,GETUTCDATE())),
        (2, 'WO-0003 completed successfully',  'Hydraulic Pump — 10/10 units completed. QC passed and ready to ship.',                   'WorkOrders', 'Unread', 'Medium', DATEADD(hour,-3,GETUTCDATE())),
        (2, 'Line B on hold — WO-0005',        'Mike Johnson flagged WO-0005: Waiting for steel plate stock from Inventory.',             'WorkOrders', 'Read',   'High',   DATEADD(hour,-6,GETUTCDATE())),
        -- Shop Floor (UserID=3)
        (3, 'New task assigned: WO-0002',      'Gear Box Unit — 20 units. Starts Jun 2 on Line A. Priority: Medium.',                    'WorkOrders', 'Unread', 'Medium', DATEADD(minute,-15,GETUTCDATE())),
        (3, 'WO-0001 progress reminder',       'Shaft Assembly is due today. Currently at 64%. 18 more units needed.',                   'WorkOrders', 'Unread', 'High',   DATEADD(minute,-45,GETUTCDATE())),
        (3, 'Flag acknowledged: WO-0005',      'Your issue flag on WO-0005 has been acknowledged by Sarah Lee.',                         'WorkOrders', 'Read',   'Low',    DATEADD(hour,-4,GETUTCDATE())),
        -- Quality Inspector (UserID=4)
        (4, 'INS-1002 assigned — urgent',      'Control Valve inspection assigned. Due tomorrow. Priority: Critical.',                   'Quality',    'Unread', 'High',   DATEADD(minute,-20,GETUTCDATE())),
        (4, 'INS-1003 failed — defects',       'Hydraulic Pump inspection failed. 3 defects logged, 2 open.',                            'Quality',    'Unread', 'High',   DATEADD(hour,-2,GETUTCDATE())),
        (4, 'INS-1001 passed',                 'All 50 units passed dimensional inspection. Ready for dispatch.',                        'Quality',    'Read',   'Low',    DATEADD(hour,-8,GETUTCDATE())),
        -- Inventory Manager (UserID=5)
        (5, 'Steel Plate 6mm critically low',  'Current stock: 45kg. Minimum: 100kg. WO-0005 Motor Mount is on hold.',                  'Inventory',  'Unread', 'High',   DATEADD(minute,-8,GETUTCDATE())),
        (5, 'Hydraulic Seal Kit below min',    'Current: 28 pcs. Minimum: 40 pcs. PO-0002 submitted — ETA 7 days.',                     'Inventory',  'Unread', 'High',   DATEADD(hour,-1,GETUTCDATE())),
        (5, 'PO-0001 approved',                'Steel Plate 6mm — 300kg from SteelCo Ltd. Expected delivery in 5 days.',                'Inventory',  'Unread', 'Medium', DATEADD(hour,-3,GETUTCDATE())),
        (5, 'PO received — Steel Rod',         '500 meters received from SteelCo Ltd. Stocked in Warehouse A.',                         'Inventory',  'Read',   'Low',    DATEADD(day,-1,GETUTCDATE())),
        -- Compliance Officer (UserID=6)
        (6, 'CR-0089 overdue',                 'May 2025 Safety Incident Report is approved but not submitted. Deadline: Jun 5.',        'Compliance', 'Unread', 'High',   DATEADD(minute,-30,GETUTCDATE())),
        (6, 'CR-0090 sent for review',         'Environmental Impact Assessment H1 2025 — prepared by Linda Brown. Please approve.',     'Compliance', 'Unread', 'Medium', DATEADD(hour,-1,GETUTCDATE())),
        (6, 'CR-0088 submitted successfully',  'Q2 2025 Quality Compliance Review submitted to regulatory authority.',                  'Compliance', 'Unread', 'Low',    DATEADD(hour,-5,GETUTCDATE())),
        (6, 'CR-0087 rejected',                'ISO 9001 Compliance Audit rejected. 3 clauses need evidence. Resubmit by Jun 15.',      'Compliance', 'Read',   'High',   DATEADD(day,-2,GETUTCDATE()));
    PRINT 'Notifications seeded.';
END
GO

PRINT '=== ManuTrackGovernanceDB seeding complete ===';

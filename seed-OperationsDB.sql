-- ============================================================
-- ManuTrack Seed Data — ManuTrackOperationsDB
-- Run this in SQL Server Object Explorer after all services start
-- Right-click ManuTrackOperationsDB → New Query → paste → Execute
-- ============================================================

USE ManuTrackOperationsDB;
GO

-- ── Products ─────────────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM Products)
BEGIN
    INSERT INTO Products (Name, Category, Version, Status, Description, CreatedDate)
    VALUES
        ('Shaft Assembly',    'Mechanical',   '1.0', 'Active', 'Primary drive shaft assembly for industrial machinery', GETUTCDATE()),
        ('Gear Box Unit',     'Mechanical',   '1.0', 'Active', 'Industrial gear box with 1:4 reduction ratio',          GETUTCDATE()),
        ('Hydraulic Pump',    'Hydraulic',    '1.0', 'Active', 'High pressure hydraulic pump, 3000 PSI rated',          GETUTCDATE()),
        ('Control Valve',     'Hydraulic',    '1.0', 'Active', 'Precision control valve for flow regulation',           GETUTCDATE()),
        ('Motor Mount',       'Structural',   '1.0', 'Active', 'Heavy duty motor mounting bracket, steel construction', GETUTCDATE()),
        ('Bracket Assembly',  'Structural',   '1.0', 'Active', 'Multi-purpose structural bracket assembly',             GETUTCDATE()),
        ('PCB Controller',    'Electronic',   '1.0', 'Active', 'Main PLC controller board for automation systems',      GETUTCDATE()),
        ('Steel Rod 12mm',    'Raw Material', '1.0', 'Active', '12mm diameter steel rod, grade S275',                  GETUTCDATE()),
        ('Bearing Unit 6205', 'Component',    '1.0', 'Active', 'Deep groove ball bearing, 6205-2RS',                   GETUTCDATE()),
        ('O-Ring 25mm',       'Component',    '1.0', 'Active', 'Nitrile rubber O-ring, 25mm ID',                       GETUTCDATE()),
        ('Seal Gasket',       'Component',    '1.0', 'Active', 'Compressed fibre gasket, high temperature rated',      GETUTCDATE()),
        ('Circlip 30mm',      'Component',    '1.0', 'Active', 'Internal circlip, 30mm bore',                          GETUTCDATE());
    PRINT 'Products seeded.';
END
GO

-- ── BOMs ─────────────────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM Boms)
BEGIN
    INSERT INTO Boms (ProductID, ComponentID, Quantity, Version, Status, Notes, CreatedDate)
    VALUES
        -- Shaft Assembly (1) components
        (1, 8,  1, '1.0', 'Active', 'Primary shaft rod',     GETUTCDATE()),
        (1, 9,  2, '1.0', 'Active', 'Support bearings',      GETUTCDATE()),
        (1, 12, 4, '1.0', 'Active', 'Retention circlips',    GETUTCDATE()),
        (1, 10, 2, '1.0', 'Active', 'Seal O-rings',          GETUTCDATE()),
        (1, 11, 1, '1.0', 'Active', 'End gasket',            GETUTCDATE()),
        -- Gear Box Unit (2) components
        (2, 9,  4, '1.0', 'Active', 'Input/output bearings', GETUTCDATE()),
        (2, 10, 3, '1.0', 'Active', 'Shaft seals',           GETUTCDATE()),
        (2, 11, 2, '1.0', 'Active', 'Housing gaskets',       GETUTCDATE()),
        -- Hydraulic Pump (3) components
        (3, 10, 4, '1.0', 'Active', 'High-pressure seals',   GETUTCDATE()),
        (3, 9,  2, '1.0', 'Active', 'Shaft bearings',        GETUTCDATE()),
        (3, 11, 3, '1.0', 'Active', 'Port gaskets',          GETUTCDATE());
    PRINT 'BOMs seeded.';
END
GO

-- ── Work Orders ───────────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM WorkOrders)
BEGIN
    INSERT INTO WorkOrders (WoNumber, ProductID, ProductName, Sku, Quantity, ProducedQty, Priority, ProductionLine, StartDate, EndDate, Status, AssignedTo, AssignedOperatorID, CreatedBy, Notes, CreatedDate)
    VALUES
        ('WO-0001', 1, 'Shaft Assembly',   'SA-1042', 50,  32, 'High',     'Line A', DATEADD(day,-5,GETUTCDATE()),  GETUTCDATE(),              'In Progress', 'Mike Johnson',  3, 'Sarah Lee', 'Rush order — client deadline strict.', GETUTCDATE()),
        ('WO-0002', 2, 'Gear Box Unit',    'GB-2088', 20,  0,  'Medium',   'Line B', DATEADD(day,2,GETUTCDATE()),   DATEADD(day,7,GETUTCDATE()), 'Planned',     'Tom Wilson',    7, 'Sarah Lee', '',                                    GETUTCDATE()),
        ('WO-0003', 3, 'Hydraulic Pump',   'HP-3301', 10,  10, 'Low',      'Line A', DATEADD(day,-20,GETUTCDATE()), DATEADD(day,-10,GETUTCDATE()),'Completed',  'Carlos Ramos',  9, 'Sarah Lee', 'QC passed — ready to ship.',           GETUTCDATE()),
        ('WO-0004', 4, 'Control Valve',    'CV-4410', 100, 45, 'Critical', 'Line C', DATEADD(day,-2,GETUTCDATE()),  DATEADD(day,1,GETUTCDATE()), 'In Progress', 'Amy Zhang',     8, 'Sarah Lee', 'Critical — overdue watch.',             GETUTCDATE()),
        ('WO-0005', 5, 'Motor Mount',      'MM-5501', 30,  0,  'High',     'Line B', DATEADD(day,1,GETUTCDATE()),   DATEADD(day,5,GETUTCDATE()), 'On Hold',     'Mike Johnson',  3, 'Sarah Lee', 'Waiting for steel plate stock.',        GETUTCDATE()),
        ('WO-0006', 6, 'Bracket Assembly', 'BA-6602', 200, 0,  'Low',      'Line D', DATEADD(day,10,GETUTCDATE()),  DATEADD(day,20,GETUTCDATE()),'Planned',     'Tom Wilson',    7, 'Sarah Lee', '',                                    GETUTCDATE()),
        ('WO-0007', 1, 'Shaft Assembly',   'SA-1042', 75,  0,  'Medium',   'Line C', DATEADD(day,5,GETUTCDATE()),   DATEADD(day,12,GETUTCDATE()),'Planned',     'Carlos Ramos',  9, 'Sarah Lee', '',                                    GETUTCDATE()),
        ('WO-0008', 2, 'Gear Box Unit',    'GB-2088', 15,  15, 'High',     'Line A', DATEADD(day,-15,GETUTCDATE()), DATEADD(day,-8,GETUTCDATE()), 'Completed',  'Tom Wilson',    7, 'Sarah Lee', '',                                    GETUTCDATE()),
        ('WO-0009', 3, 'Hydraulic Pump',   'HP-3301', 8,   3,  'Critical', 'Line B', DATEADD(day,-1,GETUTCDATE()),  DATEADD(day,3,GETUTCDATE()), 'On Hold',     'Amy Zhang',     8, 'Sarah Lee', 'QC hold — piston ring defect.',         GETUTCDATE()),
        ('WO-0010', 4, 'Control Valve',    'CV-4410', 50,  0,  'Medium',   'Line D', DATEADD(day,15,GETUTCDATE()),  DATEADD(day,22,GETUTCDATE()),'Planned',     'Mike Johnson',  3, 'Sarah Lee', '',                                    GETUTCDATE());
    PRINT 'Work Orders seeded.';
END
GO

-- ── Work Order Tasks ──────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM WorkOrderTasks)
BEGIN
    INSERT INTO WorkOrderTasks (WorkOrderID, Description, AssignedTo, Status, CompletedDate, CreatedDate)
    VALUES
        -- WO-0001 tasks
        (1, 'Machine setup & calibration',        'Mike Johnson', 'Completed',   DATEADD(day,-4,GETUTCDATE()), GETUTCDATE()),
        (1, 'Load raw material (Steel Rod 12mm)', 'Mike Johnson', 'Completed',   DATEADD(day,-4,GETUTCDATE()), GETUTCDATE()),
        (1, 'First piece quality check',          'Mike Johnson', 'Completed',   DATEADD(day,-3,GETUTCDATE()), GETUTCDATE()),
        (1, 'Continue full production run',       'Mike Johnson', 'In Progress', NULL,                         GETUTCDATE()),
        (1, 'Final count & dimensional check',    'Mike Johnson', 'To Do',       NULL,                         GETUTCDATE()),
        (1, 'Packaging & label application',      'Mike Johnson', 'To Do',       NULL,                         GETUTCDATE()),
        -- WO-0002 tasks
        (2, 'Machine setup & calibration',        'Tom Wilson',   'To Do',       NULL,                         GETUTCDATE()),
        (2, 'Load gearing components',            'Tom Wilson',   'To Do',       NULL,                         GETUTCDATE()),
        (2, 'Production run',                     'Tom Wilson',   'To Do',       NULL,                         GETUTCDATE()),
        -- WO-0003 tasks (Completed)
        (3, 'Machine setup & calibration',        'Carlos Ramos', 'Completed',   DATEADD(day,-12,GETUTCDATE()),GETUTCDATE()),
        (3, 'Pressure test all units',            'Carlos Ramos', 'Completed',   DATEADD(day,-11,GETUTCDATE()),GETUTCDATE()),
        (3, 'Packaging & dispatch',               'Carlos Ramos', 'Completed',   DATEADD(day,-10,GETUTCDATE()),GETUTCDATE());
    PRINT 'Work Order Tasks seeded.';
END
GO

-- ── Inventory Locations ───────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM InventoryLocations)
BEGIN
    INSERT INTO InventoryLocations (Name, Description, IsActive, CreatedDate)
    VALUES
        ('Warehouse A',  'Main raw material storage',    1, GETUTCDATE()),
        ('Warehouse B',  'Component & finished goods',   1, GETUTCDATE()),
        ('Hazmat Store', 'Chemicals & consumables',      1, GETUTCDATE()),
        ('Cold Store',   'Temperature-controlled store', 1, GETUTCDATE()),
        ('Line A Store', 'Line A staging area',          1, GETUTCDATE()),
        ('Line B Store', 'Line B staging area',          1, GETUTCDATE());
    PRINT 'Inventory Locations seeded.';
END
GO

-- ── Suppliers ─────────────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM Suppliers)
BEGIN
    INSERT INTO Suppliers (Name, ContactPerson, Phone, Email, Address, IsActive, CreatedDate)
    VALUES
        ('SteelCo Ltd',        'Mark Allen',   '0111000001', 'orders@steelco.com',      '12 Steel Way, Birmingham',   1, GETUTCDATE()),
        ('PrecisionParts Inc', 'Jane Doe',     '0111000002', 'sales@precisionparts.com','88 Parts Lane, Manchester',  1, GETUTCDATE()),
        ('GlobalSupply Co',    'Paul Harris',  '0111000003', 'info@globalsupply.com',   '5 Trade Park, Leeds',        1, GETUTCDATE()),
        ('FastenerWorld',      'Chris Bond',   '0111000004', 'buy@fastenerworld.com',   '3 Bolt Street, Sheffield',   1, GETUTCDATE()),
        ('ChemSupply Ltd',     'Lisa Moore',   '0111000005', 'chem@chemsupply.com',     '22 Chem Ave, Coventry',      1, GETUTCDATE()),
        ('PackagePro',         'Sam Wright',   '0111000006', 'pack@packagepro.com',     '9 Pack Road, Bristol',       1, GETUTCDATE());
    PRINT 'Suppliers seeded.';
END
GO

-- ── Inventory Items ───────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM InventoryItems)
BEGIN
    INSERT INTO InventoryItems (ProductID, ProductName, LocationID, QuantityOnHand, MinimumQuantity, Status, Notes, CreatedDate)
    VALUES
        (8,  'Steel Rod 12mm',       1, 840,  200, 'Active', 'Grade S275, 3m lengths',             GETUTCDATE()),
        (8,  'Steel Plate 6mm',      1, 45,   100, 'Low',    'Critical — needed for Motor Mount WO', GETUTCDATE()),
        (9,  'Bearing Unit 6205',    2, 320,  50,  'Active', '2RS sealed bearings',                GETUTCDATE()),
        (10, 'O-Ring 25mm',          2, 1200, 300, 'Active', 'Nitrile rubber, bulk pack',          GETUTCDATE()),
        (10, 'Hydraulic Seal Kit',   2, 28,   40,  'Low',    'High-pressure rated kit',            GETUTCDATE()),
        (12, 'Circlip 30mm',         1, 980,  200, 'Active', 'Internal circlips, bulk pack',       GETUTCDATE()),
        (4,  'Control Valve Body',   2, 15,   20,  'Low',    'Cast iron bodies, precision machined',GETUTCDATE()),
        (3,  'Cutting Oil 5L',       3, 60,   20,  'Active', 'CNC cutting fluid, 5L containers',   GETUTCDATE()),
        (3,  'Welding Wire 0.8mm',   1, 8,    10,  'Low',    'ER70S-6 MIG wire, 15kg reels',       GETUTCDATE()),
        (6,  'Cardboard Box (Large)',1, 450,  100, 'Active', '400x300x250mm, double-walled',       GETUTCDATE()),
        (6,  'Bubble Wrap Roll',     1, 12,   15,  'Low',    '50m rolls, 500mm wide',              GETUTCDATE()),
        (8,  'Aluminium Sheet 3mm',  1, 220,  80,  'Active', 'Grade 6061-T6, 2mx1m sheets',        GETUTCDATE());
    PRINT 'Inventory Items seeded.';
END
GO

-- ── Purchase Orders ───────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM PurchaseOrders)
BEGIN
    INSERT INTO PurchaseOrders (SupplierID, SupplierName, OrderDate, ExpectedDeliveryDate, Status, TotalAmount, Notes, CreatedDate)
    VALUES
        ('1', 'SteelCo Ltd',        DATEADD(day,-2,GETUTCDATE()), DATEADD(day,5,GETUTCDATE()),  'Approved',  960.00,  'Urgent — needed for WO-0005.',     GETUTCDATE()),
        ('2', 'PrecisionParts Inc', DATEADD(day,-1,GETUTCDATE()), DATEADD(day,7,GETUTCDATE()),  'Submitted', 1850.00, 'Low stock alert triggered.',       GETUTCDATE()),
        ('2', 'PrecisionParts Inc', DATEADD(day,-4,GETUTCDATE()), DATEADD(day,10,GETUTCDATE()), 'Ordered',   4750.00, '',                                 GETUTCDATE()),
        ('1', 'SteelCo Ltd',        DATEADD(day,-15,GETUTCDATE()),DATEADD(day,-8,GETUTCDATE()), 'Received',  2250.00, 'Received in full. Stocked in Warehouse A.', GETUTCDATE());

    -- Purchase Order Items
    INSERT INTO PurchaseOrderItems (POID, InventoryID, ProductID, ProductName, Quantity, UnitPrice, TotalPrice, ReceivedQty, CreatedDate)
    VALUES
        (1, 2, 8,  'Steel Plate 6mm',    300, 3.20,  960.00,  0,   GETUTCDATE()),
        (2, 5, 10, 'Hydraulic Seal Kit', 100, 18.50, 1850.00, 0,   GETUTCDATE()),
        (3, 7, 4,  'Control Valve Body', 50,  95.00, 4750.00, 0,   GETUTCDATE()),
        (4, 1, 8,  'Steel Rod 12mm',     500, 4.50,  2250.00, 500, GETUTCDATE());
    PRINT 'Purchase Orders seeded.';
END
GO

PRINT '=== ManuTrackOperationsDB seeding complete ===';

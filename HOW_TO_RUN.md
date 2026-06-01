# ManuTrack ERP — How to Run (Fresh Machine Setup)

> Follow every step in order. Do not skip any step.

---

## Prerequisites — Install These First

| Tool | Download Link | Required Version |
|------|--------------|-----------------|
| **.NET SDK** | https://dotnet.microsoft.com/download | 9.0 or 10.0 |
| **Node.js** | https://nodejs.org | 18 LTS or 20 LTS (**NOT v25**) |
| **SQL Server LocalDB** | Comes with Visual Studio — or https://www.microsoft.com/sql-server/sql-server-downloads | Any |
| **Git** | https://git-scm.com | Latest |
| **Angular CLI** | Run: `npm install -g @angular/cli@21` | 21 |

### Verify everything is installed

Open a terminal and run these commands:

```bash
dotnet --version        # should show 9.x or 10.x
node --version          # should show v18.x or v20.x
npm --version           # should show 9.x or 10.x
ng version              # should show Angular CLI: 21.x
sqllocaldb info         # should list MSSQLLocalDB
```

---

## Step 1 — Clone the Repository

```bash
git clone https://github.com/darshanvdevamane-pixel/ManuTrack_Updated.git
cd ManuTrack_Updated
```

---

## Step 2 — Start LocalDB

```bash
sqllocaldb start MSSQLLocalDB
```

You should see: `LocalDB instance "MSSQLLocalDB" started.`

---

## Step 3 — Create the 3 Databases in SSMS

Open **SQL Server Management Studio (SSMS)** and connect with:

```
Server:         (localdb)\MSSQLLocalDB
Authentication: Windows Authentication
```

Right-click **Databases** → **New Database** → create these **one by one**:

- `ManuTrackGovernanceDB`
- `ManuTrackOperationsDB`
- `ManuTrackQualityDB`

---

## Step 4 — Run SQL Scripts

For each database below: click the database → click **New Query** → paste the script → press **F5**.

---

### Script A — Run on `ManuTrackGovernanceDB`

```sql
USE ManuTrackGovernanceDB;

CREATE TABLE dbo.AuditEntries (
    AuditID     INT            IDENTITY(1,1) NOT NULL PRIMARY KEY,
    UserID      INT            NOT NULL DEFAULT 0,
    UserName    NVARCHAR(200)  NOT NULL DEFAULT '',
    Action      NVARCHAR(200)  NOT NULL,
    EntityType  NVARCHAR(100)  NOT NULL,
    EntityID    NVARCHAR(100)  NOT NULL,
    ServiceName NVARCHAR(100)  NOT NULL DEFAULT '',
    Details     NVARCHAR(MAX)  NULL,
    Severity    NVARCHAR(20)   NOT NULL DEFAULT 'info',
    IpAddress   NVARCHAR(45)   NOT NULL DEFAULT '',
    Timestamp   DATETIME2      NOT NULL DEFAULT GETUTCDATE()
);

CREATE TABLE dbo.ComplianceReports (
    ReportID           INT            IDENTITY(1,1) NOT NULL PRIMARY KEY,
    ReportNumber       NVARCHAR(20)   NOT NULL DEFAULT '',
    Title              NVARCHAR(200)  NOT NULL,
    Type               NVARCHAR(50)   NOT NULL DEFAULT '',
    Priority           NVARCHAR(20)   NOT NULL DEFAULT 'Medium',
    Status             NVARCHAR(50)   NOT NULL DEFAULT 'Draft',
    Period             NVARCHAR(100)  NOT NULL DEFAULT '',
    PreparedBy         NVARCHAR(200)  NOT NULL DEFAULT '',
    ReviewedBy         NVARCHAR(200)  NOT NULL DEFAULT '',
    SubmissionDeadline DATETIME2      NOT NULL,
    SubmittedDate      DATETIME2      NULL,
    Findings           INT            NOT NULL DEFAULT 0,
    Actions            INT            NOT NULL DEFAULT 0,
    Notes              NVARCHAR(1000) NULL,
    CreatedDate        DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
    UpdatedDate        DATETIME2      NULL
);
```

---

### Script B — Run on `ManuTrackOperationsDB`

```sql
USE ManuTrackOperationsDB;

CREATE TABLE dbo.InventoryItems (
    InventoryID     INT            IDENTITY(1,1) NOT NULL PRIMARY KEY,
    Sku             NVARCHAR(50)   NOT NULL DEFAULT '',
    Name            NVARCHAR(200)  NOT NULL,
    Category        NVARCHAR(100)  NOT NULL DEFAULT '',
    Unit            NVARCHAR(20)   NOT NULL DEFAULT 'pcs',
    Location        NVARCHAR(200)  NOT NULL DEFAULT '',
    QuantityOnHand  DECIMAL(18,4)  NOT NULL DEFAULT 0,
    MinimumQuantity DECIMAL(18,4)  NOT NULL DEFAULT 0,
    MaximumQuantity DECIMAL(18,4)  NOT NULL DEFAULT 9999,
    UnitCost        DECIMAL(18,4)  NOT NULL DEFAULT 0,
    Supplier        NVARCHAR(200)  NOT NULL DEFAULT '',
    Status          NVARCHAR(50)   NOT NULL DEFAULT 'InStock',
    Notes           NVARCHAR(500)  NULL,
    CreatedDate     DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
    ModifiedDate    DATETIME2      NULL
);

CREATE TABLE dbo.StockMovements (
    MovementID   INT           IDENTITY(1,1) NOT NULL PRIMARY KEY,
    InventoryID  INT           NOT NULL,
    MovementType NVARCHAR(50)  NOT NULL,
    Quantity     DECIMAL(18,4) NOT NULL,
    Reason       NVARCHAR(500) NOT NULL,
    ReferenceID  NVARCHAR(100) NULL,
    PerformedBy  INT           NOT NULL DEFAULT 0,
    CreatedDate  DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_StockMovements_Inventory
        FOREIGN KEY (InventoryID) REFERENCES dbo.InventoryItems(InventoryID) ON DELETE CASCADE
);

CREATE TABLE dbo.PurchaseOrders (
    POID         INT            IDENTITY(1,1) NOT NULL PRIMARY KEY,
    PONumber     NVARCHAR(50)   NOT NULL DEFAULT '',
    SupplierName NVARCHAR(200)  NOT NULL DEFAULT '',
    ItemName     NVARCHAR(200)  NOT NULL DEFAULT '',
    ItemSku      NVARCHAR(50)   NOT NULL DEFAULT '',
    Quantity     DECIMAL(18,4)  NOT NULL DEFAULT 0,
    UnitCost     DECIMAL(18,4)  NOT NULL DEFAULT 0,
    TotalCost    DECIMAL(18,4)  NOT NULL DEFAULT 0,
    Priority     NVARCHAR(20)   NOT NULL DEFAULT 'Medium',
    Status       NVARCHAR(50)   NOT NULL DEFAULT 'Draft',
    OrderDate    DATETIME2      NOT NULL,
    ExpectedDate DATETIME2      NOT NULL,
    Notes        NVARCHAR(1000) NULL,
    CreatedDate  DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
    ModifiedDate DATETIME2      NULL
);

CREATE TABLE dbo.BomItems (
    BomItemID   INT            IDENTITY(1,1) NOT NULL PRIMARY KEY,
    ProductID   INT            NOT NULL,
    ParentID    INT            NULL,
    Name        NVARCHAR(200)  NOT NULL,
    Quantity    DECIMAL(18,4)  NOT NULL,
    Unit        NVARCHAR(20)   NOT NULL DEFAULT 'pcs',
    Type        NVARCHAR(50)   NOT NULL DEFAULT 'raw-material',
    CreatedDate DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_BomItems_Products
        FOREIGN KEY (ProductID) REFERENCES dbo.Products(ProductID) ON DELETE CASCADE,
    CONSTRAINT FK_BomItems_Parent
        FOREIGN KEY (ParentID) REFERENCES dbo.BomItems(BomItemID) ON DELETE NO ACTION
);

-- Seed inventory with sample data
INSERT INTO dbo.InventoryItems
    (Sku, Name, Category, Unit, Location, QuantityOnHand, MinimumQuantity, MaximumQuantity, UnitCost, Supplier, Status)
VALUES
('RM-001', 'Steel Rod 12mm',     'Raw Material', 'kg',  'Warehouse A', 250, 50,  500,  2.40, 'SteelCo Ltd',        'InStock'),
('RM-002', 'Steel Plate 6mm',    'Raw Material', 'kg',  'Warehouse A',  30, 50,  300,  3.80, 'SteelCo Ltd',        'LowStock'),
('CP-001', 'Bearings 6205',      'Component',   'pcs', 'Warehouse B', 120, 20,  200,  8.50, 'PrecisionParts Inc', 'InStock'),
('CP-002', 'O-Ring 25mm',        'Component',   'pcs', 'Warehouse B',   5, 100, 1000, 0.35, 'FastenerWorld',      'LowStock'),
('CS-001', 'Cutting Oil 5L',     'Consumable',  'L',   'Line A Store',  40, 10,  100, 12.00, 'ChemSupply Ltd',    'InStock'),
('PK-001', 'Cardboard Box (L)',  'Packaging',   'pcs', 'Warehouse B', 200, 50,  500,  0.90, 'PackagePro',         'InStock');
```

---

### Script C — Run on `ManuTrackQualityDB`

```sql
USE ManuTrackQualityDB;

CREATE TABLE dbo.Inspections (
    InspectionID  INT            IDENTITY(1,1) NOT NULL PRIMARY KEY,
    WorkOrderID   INT            NOT NULL,
    ProductName   NVARCHAR(200)  NOT NULL DEFAULT '',
    Sku           NVARCHAR(50)   NOT NULL DEFAULT '',
    Quantity      INT            NOT NULL DEFAULT 1,
    Priority      NVARCHAR(20)   NOT NULL DEFAULT 'Medium',
    InspectorName NVARCHAR(200)  NOT NULL,
    ScheduledDate DATETIME2      NOT NULL,
    CompletedDate DATETIME2      NULL,
    Status        NVARCHAR(50)   NOT NULL DEFAULT 'Pending',
    Notes         NVARCHAR(1000) NULL,
    CreatedDate   DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
    UpdatedDate   DATETIME2      NULL
);

CREATE TABLE dbo.Defects (
    DefectID       INT            IDENTITY(1,1) NOT NULL PRIMARY KEY,
    InspectionID   INT            NOT NULL,
    WorkOrderID    INT            NOT NULL DEFAULT 0,
    ProductName    NVARCHAR(200)  NOT NULL DEFAULT '',
    Severity       NVARCHAR(50)   NOT NULL,
    DefectType     NVARCHAR(200)  NOT NULL DEFAULT '',
    DefectiveUnits INT            NOT NULL DEFAULT 1,
    RootCause      NVARCHAR(300)  NOT NULL DEFAULT '',
    ActionTaken    NVARCHAR(50)   NOT NULL DEFAULT 'Rework',
    Status         NVARCHAR(50)   NOT NULL DEFAULT 'Open',
    ReportedBy     NVARCHAR(200)  NOT NULL DEFAULT '',
    ReportedDate   DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
    Notes          NVARCHAR(500)  NULL,
    CreatedDate    DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
    UpdatedDate    DATETIME2      NULL,
    CONSTRAINT FK_Defects_Inspections
        FOREIGN KEY (InspectionID) REFERENCES dbo.Inspections(InspectionID) ON DELETE CASCADE
);
```

---

## Step 5 — Start All 9 Backend Services

Open **9 separate terminals** inside the `ManuTrack_Updated` folder.

Run **one command per terminal** in this exact order. Wait ~3 seconds between each.

```bash
# Terminal 1
cd AuthService && dotnet run --launch-profile http
```
Wait for: `Now listening on: http://localhost:5100`

```bash
# Terminal 2
cd ComplianceService && dotnet run --launch-profile http
```
Wait for: `Now listening on: http://localhost:5105`

```bash
# Terminal 3
cd NotificationService && dotnet run --launch-profile http
```
Wait for: `Now listening on: http://localhost:5107`

```bash
# Terminal 4
cd ProductService && dotnet run --launch-profile http
```
Wait for: `Now listening on: http://localhost:5101`

```bash
# Terminal 5
cd WorkOrderService && dotnet run --launch-profile http
```
Wait for: `Now listening on: http://localhost:5102`

```bash
# Terminal 6
cd InventoryService && dotnet run --launch-profile http
```
Wait for: `Now listening on: http://localhost:5103`

```bash
# Terminal 7
cd QualityService && dotnet run --launch-profile http
```
Wait for: `Now listening on: http://localhost:5104`

```bash
# Terminal 8
cd AnalyticsService && dotnet run --launch-profile http
```
Wait for: `Now listening on: http://localhost:5106`

```bash
# Terminal 9 — START LAST
cd ApiGateway && dotnet run --launch-profile http
```
Wait for: `Now listening on: http://localhost:5000`

---

## Step 6 — Start the Frontend

Open a **10th terminal**:

```bash
cd ManuTrack.UI2
npm install
ng serve
```

Wait until you see:
```
Application bundle generation complete.
```

Open your browser and go to:

```
http://localhost:4200
```

---

## Login Credentials

| Role | Email | Password | Note |
|------|-------|----------|------|
| **Admin** | admin@manutrack.com | Admin@1234 | Full access, no forced change |
| **Production Planner** | planner@manutrack.com | Planner@1234 | Change password on first login |
| **Shop Floor Operator** | operator@manutrack.com | Operator@1234 | Change password on first login |
| **Quality Inspector** | quality@manutrack.com | Quality@1234 | Change password on first login |
| **Inventory Manager** | inventory@manutrack.com | Inventory@1234 | Change password on first login |
| **Compliance Officer** | compliance@manutrack.com | Compliance@1234 | Change password on first login |

> **First Login:** Non-admin accounts are forced to set a new password on first login.
> New password must have: 8+ characters, 1 uppercase, 1 lowercase, 1 number, 1 special character (`@$!%*?&`)

---

## Service Port Reference

| Service | URL |
|---------|-----|
| API Gateway | http://localhost:5000 |
| AuthService | http://localhost:5100 |
| ProductService | http://localhost:5101 |
| WorkOrderService | http://localhost:5102 |
| InventoryService | http://localhost:5103 |
| QualityService | http://localhost:5104 |
| ComplianceService | http://localhost:5105 |
| AnalyticsService | http://localhost:5106 |
| NotificationService | http://localhost:5107 |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Invalid object name 'Users'` | Services started out of order. Stop all, wait 5 seconds, restart in order from Step 5 |
| `Cannot connect to (localdb)\MSSQLLocalDB` | Run `sqllocaldb start MSSQLLocalDB` in terminal |
| `Port already in use` | Something else is using that port. Run `netstat -ano | findstr :5100` and kill that process |
| `ng serve` not found | Run `npm install -g @angular/cli@21` and try again |
| `npm install` fails or takes forever | Make sure Node.js is v18 or v20. Check with `node --version` |
| Blank white page in browser | Press F12 → Console tab — check which service has an error |
| `401 Unauthorized` on all requests | Gateway isn't running. Make sure Terminal 9 (ApiGateway) started last |
| `403 Access Denied` | You are logged in as the wrong role. Check the role-feature table in README.md |
| My Tasks empty (Shop Floor Operator) | Work orders must be assigned to the operator's name by Production Planner first |

---

## What Each Role Can Do

| Feature | Admin | Planner | Operator | Inspector | Inventory | Compliance |
|---------|:-----:|:-------:|:--------:|:---------:|:---------:|:----------:|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| User Management | ✓ | | | | | |
| Audit Logs (live) | ✓ | | | | | |
| Work Orders (view) | ✓ | ✓ | | | | |
| Work Orders (create/edit) | | ✓ | | | | |
| Production Schedule (Gantt) | ✓ | ✓ | | | | |
| Product Catalog + BOM | | ✓ | | | | |
| My Tasks (Kanban) | | | ✓ | | | |
| Inspection Queue | | | | ✓ | | |
| Defect Log | | | | ✓ | | |
| Stock Dashboard | | | | | ✓ | |
| Purchase Orders | | | | | ✓ | |
| Compliance Reports | | | | | | ✓ |
| Audit Trail | | | | | | ✓ |
| Analytics | | ✓ | | ✓ | ✓ | ✓ |
| My Profile | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

---

*ManuTrack ERP — Enterprise Internship Project*

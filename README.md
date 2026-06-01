# ManuTrack ERP — Complete Setup Guide

> Enterprise Resource Planning system for manufacturing operations.  
> **Angular 21** frontend · **.NET 10 Microservices** backend · **SQL Server LocalDB**

---

## Table of Contents

1. [Architecture](#architecture)
2. [Prerequisites](#prerequisites)
3. [Clone the Repository](#1-clone-the-repository)
4. [Database Setup](#2-database-setup)
5. [Run the Backend](#3-run-the-backend)
6. [Run the Frontend](#4-run-the-frontend)
7. [Login Credentials](#login-credentials)
8. [Roles & Permissions](#roles--permissions)
9. [Troubleshooting](#troubleshooting)

---

## Architecture

```
Browser  ──►  Angular 21 (localhost:4200)
                    │
                    ▼  all API calls
         Ocelot API Gateway  (localhost:5000)
         JWT validation + audit logging
                    │
     ┌──────────────┼──────────────────────┐
     ▼              ▼                      ▼
AuthService    ProductService         WorkOrderService
 :5100          :5101                   :5102
     │              │                      │
GovernanceDB   OperationsDB           OperationsDB

InventoryService  QualityService  ComplianceService
    :5103             :5104            :5105
       │                 │                │
  OperationsDB       QualityDB        Both DBs

AnalyticsService   NotificationService
    :5106                :5107
       │                    │
   QualityDB           GovernanceDB
```

### Databases

| Database | Owner Service | Shared With |
|----------|--------------|-------------|
| `ManuTrackGovernanceDB` | AuthService | ComplianceService, NotificationService |
| `ManuTrackOperationsDB` | ProductService | WorkOrderService, InventoryService |
| `ManuTrackQualityDB` | QualityService | ComplianceService, AnalyticsService |

---

## Prerequisites

Install **all** of these before starting:

| Tool | Version Required | Download |
|------|-----------------|----------|
| **.NET SDK** | 9.0 or 10.0 | https://dotnet.microsoft.com/download |
| **Node.js** | 18 LTS or 20 LTS *(not v25)* | https://nodejs.org |
| **SQL Server LocalDB** | Any | Ships with Visual Studio — or download [SQL Server Express](https://www.microsoft.com/sql-server/sql-server-downloads) |
| **Git** | Latest | https://git-scm.com |
| **Angular CLI** | 21 | `npm install -g @angular/cli@21` |

### Verify everything is installed

```bash
dotnet --version      # 9.x.x or 10.x.x
node --version        # v18.x or v20.x  (NOT v25)
npm --version         # 9.x or 10.x
ng version            # Angular CLI: 21.x
sqllocaldb info       # should list MSSQLLocalDB
```

---

## 1. Clone the Repository

```bash
git clone https://github.com/darshanvdevamane-pixel/ManuTrack_Updated.git
cd ManuTrack_Updated
```

---

## 2. Database Setup

### Step 1 — Start LocalDB

```bash
sqllocaldb start MSSQLLocalDB
```

### Step 2 — Connect with SSMS

Open **SQL Server Management Studio (SSMS)** and connect with:

```
Server name:  (localdb)\MSSQLLocalDB
Auth:         Windows Authentication
```

> **No SSMS?** Use `sqlcmd -S "(localdb)\MSSQLLocalDB" -E` in a terminal.

### Step 3 — Create the 3 databases

In SSMS: right-click **Databases** → **New Database** — create these three:

- `ManuTrackGovernanceDB`
- `ManuTrackOperationsDB`  
- `ManuTrackQualityDB`

### Step 4 — Run the seed SQL files

The repo contains 3 ready-to-run SQL files. Run each one in SSMS (**File → Open → File**, then **Execute**):

| File | Run against |
|------|------------|
| `seed-GovernanceDB.sql` | `ManuTrackGovernanceDB` |
| `seed-OperationsDB.sql` | `ManuTrackOperationsDB` |
| `seed-QualityDB.sql` | `ManuTrackQualityDB` |

### Step 5 — Create the BomItems table

Run this in SSMS against **`ManuTrackOperationsDB`**:

```sql
USE ManuTrackOperationsDB;

-- Drop old Boms table (incompatible schema)
IF OBJECT_ID('dbo.Boms', 'U') IS NOT NULL
    DROP TABLE dbo.Boms;

-- Create new BomItems table
IF OBJECT_ID('dbo.BomItems', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.BomItems (
        BomItemID   INT           IDENTITY(1,1) NOT NULL PRIMARY KEY,
        ProductID   INT           NOT NULL,
        ParentID    INT           NULL,
        Name        NVARCHAR(200) NOT NULL,
        Quantity    DECIMAL(18,4) NOT NULL,
        Unit        NVARCHAR(20)  NOT NULL CONSTRAINT DF_BomItems_Unit DEFAULT 'pcs',
        Type        NVARCHAR(50)  NOT NULL CONSTRAINT DF_BomItems_Type DEFAULT 'raw-material',
        CreatedDate DATETIME2     NOT NULL CONSTRAINT DF_BomItems_CreatedDate DEFAULT GETUTCDATE(),
        CONSTRAINT FK_BomItems_Products FOREIGN KEY (ProductID)
            REFERENCES dbo.Products(ProductID) ON DELETE CASCADE,
        CONSTRAINT FK_BomItems_Parent FOREIGN KEY (ParentID)
            REFERENCES dbo.BomItems(BomItemID) ON DELETE NO ACTION
    );
    CREATE INDEX IX_BomItems_ProductID ON dbo.BomItems(ProductID);
    CREATE INDEX IX_BomItems_ParentID  ON dbo.BomItems(ParentID);
    PRINT 'BomItems table created successfully.';
END
ELSE
    PRINT 'BomItems table already exists.';
```

> **Why?** The BOM system was redesigned from a product-to-product FK model to a free-form tree model. This migration step is required.

---

## 3. Run the Backend

You need **9 terminals** open — one per service.

> **Tip:** Use Windows Terminal with 9 tabs, or VS Code integrated terminals.

### ⚠️ Startup Order (CRITICAL)

Services share databases. Start them **in this exact order** and wait ~3 seconds between each. Starting out of order causes "Invalid object name" errors.

```
Step 1  →  AuthService          (creates GovernanceDB tables)
Step 2  →  ComplianceService    (shares GovernanceDB)
Step 3  →  NotificationService  (shares GovernanceDB)
Step 4  →  ProductService       (creates OperationsDB tables)
Step 5  →  WorkOrderService     (shares OperationsDB)
Step 6  →  InventoryService     (shares OperationsDB)
Step 7  →  QualityService       (creates QualityDB tables)
Step 8  →  AnalyticsService     (reads QualityDB)
Step 9  →  ApiGateway           ← START LAST
```

### Terminal commands

Open a separate terminal for each service, `cd` into the project root first:

```bash
# Terminal 1
cd AuthService && dotnet run --launch-profile http

# Terminal 2
cd ComplianceService && dotnet run --launch-profile http

# Terminal 3
cd NotificationService && dotnet run --launch-profile http

# Terminal 4
cd ProductService && dotnet run --launch-profile http

# Terminal 5
cd WorkOrderService && dotnet run --launch-profile http

# Terminal 6
cd InventoryService && dotnet run --launch-profile http

# Terminal 7
cd QualityService && dotnet run --launch-profile http

# Terminal 8
cd AnalyticsService && dotnet run --launch-profile http

# Terminal 9 — Gateway LAST
cd ApiGateway && dotnet run --launch-profile http
```

### Port Reference

| Service | URL |
|---------|-----|
| **API Gateway** | http://localhost:5000 |
| AuthService | http://localhost:5100 |
| ProductService | http://localhost:5101 |
| WorkOrderService | http://localhost:5102 |
| InventoryService | http://localhost:5103 |
| QualityService | http://localhost:5104 |
| ComplianceService | http://localhost:5105 |
| AnalyticsService | http://localhost:5106 |
| NotificationService | http://localhost:5107 |

### Verify services are up

Open each Swagger URL — you should see the API docs page:

```
http://localhost:5100/swagger   ← Auth
http://localhost:5101/swagger   ← Products
http://localhost:5102/swagger   ← Work Orders
... and so on
```

---

## 4. Run the Frontend

Open a **10th terminal**:

```bash
cd ManuTrack.UI2

# First time only — install packages
npm install

# Start development server
ng serve

# App opens at:
# http://localhost:4200
```

---

## Login Credentials

| Role | Email | Password | Notes |
|------|-------|----------|-------|
| **System Admin** | `admin@manutrack.com` | `Admin@1234` | Full access, no forced change |
| **Production Planner** | `planner@manutrack.com` | `Planner@1234` | Must change password on first login |
| **Shop Floor Operator** | `operator@manutrack.com` | `Operator@1234` | Must change password on first login |
| **Quality Inspector** | `quality@manutrack.com` | `Quality@1234` | Must change password on first login |
| **Inventory Manager** | `inventory@manutrack.com` | `Inventory@1234` | Must change password on first login |
| **Compliance Officer** | `compliance@manutrack.com` | `Compliance@1234` | Must change password on first login |

> **First login flow:** Non-admin users are forced to set a new password on first login.  
> New password must contain: 8+ characters, uppercase, lowercase, number, special character (`@$!%*?&`).

### Creating new users (Admin only)

1. Login as Admin → **Admin Panel** → **User Management**
2. Click **Invite User** → fill in name, email, role
3. The new user's temporary password is: `Welcome@123`
4. They must change it on first login

---

## Roles & Permissions

| Feature | Admin | Planner | Operator | Inspector | Inventory | Compliance |
|---------|:-----:|:-------:|:--------:|:---------:|:---------:|:----------:|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| User Management | ✓ | | | | | |
| Audit Logs (live) | ✓ | | | | | |
| Work Orders (view) | ✓ | ✓ | | | | |
| Work Orders (create/edit) | | ✓ | | | | |
| Work Order status change | | ✓ | ✓ | | | |
| Production Schedule (Gantt) | ✓ | ✓ | | | | |
| Product Catalog + BOM | | ✓ | | | | |
| My Tasks (Kanban + checklist) | | | ✓ | | | |
| Inspection Queue | | | | ✓ | | |
| Defect Log | | | | ✓ | | |
| Inventory & Stock | | | | | ✓ | |
| Purchase Orders | | | | | ✓ | |
| Compliance Reports | | | | | | ✓ |
| Audit Trail | | | | | | ✓ |
| Analytics & KPIs | | ✓ | | ✓ | ✓ | ✓ |
| My Profile (edit) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## Troubleshooting

### ❌ `Invalid object name 'Users'` or `'WorkOrders'` etc.

A service started before the database tables were created.

**Fix:** Stop all services. Run the seed SQL files in SSMS. Restart services **in the startup order above**.

---

### ❌ `There is already an object named 'X' in the database`

The tables already exist. This is fine — `EnsureCreated` only creates if missing.

**Fix:** No action needed. If schema is wrong, delete the DB and re-run the seed scripts.

---

### ❌ Cannot connect to `(localdb)\MSSQLLocalDB`

```bash
# Start LocalDB
sqllocaldb start MSSQLLocalDB

# Verify it's running
sqllocaldb info MSSQLLocalDB    # should show State: Running
```

---

### ❌ Port already in use (e.g. `EADDRINUSE :5102`)

```bash
# Windows — find what's using the port
netstat -ano | findstr :5102

# Kill the process (replace 1234 with actual PID)
taskkill /PID 1234 /F
```

---

### ❌ `403 Forbidden` on API calls

You're logged in as the wrong role. Check the Roles & Permissions table.  
Example: Shop Floor Operators cannot create Work Orders (that's the Planner's job).

---

### ❌ `401 Unauthorized`

JWT token expired (tokens last 60 minutes). Log out and log back in.

---

### ❌ My Tasks page empty (Shop Floor Operator)

Work orders must be **assigned to the operator by name** in the Assigned To field.  
The Production Planner creates WOs via **Production Schedule → Schedule WO** and selects the operator from the dropdown. The name must match the SFO's account name exactly.

---

### ❌ Angular `ng serve` not found

```bash
npm install -g @angular/cli@21
```

---

### ❌ `npm install` fails or takes very long

Make sure Node.js version is **18 or 20 LTS** (not 25):

```bash
node --version   # should be v18.x or v20.x
```

If you have the wrong version, use [nvm-windows](https://github.com/coreybutler/nvm-windows) to switch.

---

### ❌ Angular compilation errors after pull

```bash
cd ManuTrack.UI2
Remove-Item -Recurse -Force node_modules   # Windows PowerShell
npm install
ng build
```

---

### ❌ Services can't talk to each other (audit logs, notifications not working)

The `ServiceUrls` in each `appsettings.json` must point to `http://localhost:{port}`.  
These are already configured correctly in the repo. Don't change them unless you change service ports.

---

## Project Structure

```
ManuTrack_Updated/
├── ApiGateway/             # Ocelot routing + JWT validation + audit middleware
├── AuthService/            # User accounts, login, JWT tokens, password management
├── ProductService/         # Product catalog, Bill of Materials (tree structure)
├── WorkOrderService/       # Work orders, production tasks, status tracking
├── InventoryService/       # Stock management, purchase orders
├── QualityService/         # Inspection queue, defect logging
├── ComplianceService/      # Compliance reports, audit trail with CSV export
├── AnalyticsService/       # KPI aggregation, production metrics
├── NotificationService/    # Real-time alerts and notifications
├── ManuTrack.SharedKernel/ # Shared: ApiResponse<T>, exceptions, filters, helpers
├── ManuTrack.UI2/          # Angular 21 frontend
│   ├── src/app/
│   │   ├── core/           # Services, interceptors, auth guards
│   │   ├── features/       # One folder per page/role
│   │   ├── layout/         # Shell, navbar, sidebar
│   │   └── shared/         # Reusable components
│   └── src/environments/   # API base URLs
├── seed-GovernanceDB.sql   # Demo data for ManuTrackGovernanceDB
├── seed-OperationsDB.sql   # Demo data for ManuTrackOperationsDB
├── seed-QualityDB.sql      # Demo data for ManuTrackQualityDB
└── README.md               # This file
```

---

*ManuTrack ERP — Enterprise Internship Project*

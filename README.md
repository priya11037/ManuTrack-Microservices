# 🏭 ManuTrack ERP — Manufacturing Operations & Production Management

A full-stack Enterprise Resource Planning (ERP) system built with **Angular 21** (frontend) and **.NET 9 Microservices** (backend), designed for manufacturing operations management across 6 user roles.

---

## 📋 Table of Contents

- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [User Roles](#-user-roles)
- [Prerequisites](#-prerequisites)
- [Getting Started](#-getting-started)
- [Running the Project](#-running-the-project)
- [Login Credentials](#-login-credentials)
- [Troubleshooting](#-troubleshooting)

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| Angular 21 (Standalone, Zoneless) | UI Framework |
| Angular Material | UI Components |
| PrimeNG | Charts & Data Visualization |
| Angular CDK Drag & Drop | Kanban & DnD Features |
| Angular Signals | State Management |

### Backend
| Technology | Purpose |
|---|---|
| .NET 9 | Backend Framework |
| ASP.NET Core Web API | REST API |
| Ocelot API Gateway | Request Routing |
| Entity Framework Core | ORM |
| SQL Server LocalDB | Database |
| BCrypt.Net | Password Hashing |
| JWT Bearer | Authentication |
| Swagger | API Documentation |

---

## 🏗 Architecture

```
Angular Frontend (Port 4200)
        ↓
Ocelot API Gateway (Port 5000)
        ↓
┌──────────────────────────────────────────┐
│  AuthService        :5100  (GovernanceDB) │
│  ProductService     :5101  (OperationsDB) │
│  WorkOrderService   :5102  (OperationsDB) │
│  InventoryService   :5103  (OperationsDB) │
│  QualityService     :5104  (QualityDB)    │
│  ComplianceService  :5105  (Both DBs)     │
│  AnalyticsService   :5106  (QualityDB)    │
│  NotificationService:5107  (GovernanceDB) │
└──────────────────────────────────────────┘
```

### Databases
| Database | Services |
|---|---|
| `ManuTrackGovernanceDB` | AuthService, ComplianceService (Audit), NotificationService |
| `ManuTrackOperationsDB` | WorkOrderService, ProductService, InventoryService |
| `ManuTrackQualityDB` | QualityService, ComplianceService (Reports), AnalyticsService |

---

## 👥 User Roles

| Role | Key Features |
|---|---|
| **Admin** | User management (invite flow), audit logs, system overview |
| **Production Planner** | Work orders (Kanban DnD), production schedule, products & BOM |
| **Shop Floor Operator** | Personal task queue (DnD), step checklist, issue flagging |
| **Quality Inspector** | Inspection queue (Kanban DnD), defect logging |
| **Inventory Manager** | Stock dashboard, purchase orders (priority DnD) |
| **Compliance Officer** | Compliance reports (workflow), audit trail with CSV export |

---

## ✅ Prerequisites

Install the following before cloning:

| Tool | Download Link | Version |
|---|---|---|
| Visual Studio 2022 | [visualstudio.microsoft.com](https://visualstudio.microsoft.com/downloads/) | Community or higher |
| .NET 9 SDK | [dotnet.microsoft.com](https://dotnet.microsoft.com/download/dotnet/9.0) | 9.0+ |
| SQL Server LocalDB | Included with Visual Studio | — |
| Node.js | [nodejs.org](https://nodejs.org) | 20+ (LTS) |
| Angular CLI | `npm install -g @angular/cli` | 18+ |
| EF Core Tools | `dotnet tool install --global dotnet-ef` | — |
| Git | [git-scm.com](https://git-scm.com) | — |

> **Visual Studio Workloads required:** ASP.NET and web development, Data storage and processing

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/darshanvdevamane-pixel/ManuTrack_Updated.git
cd ManuTrack_Updated
```

---

### 2. Backend Setup

#### 2a. Restore NuGet Packages

Open `ManuTrack.slnx` in Visual Studio — packages restore automatically.

Or via terminal:
```powershell
dotnet restore
```

#### 2b. Generate Table Creation Scripts

Open **Developer PowerShell** in Visual Studio and run:

```powershell
$base = (Get-Location).Path

cd "$base\AuthService";         dotnet ef migrations script --output "$base\create-Auth.sql"             --context AuthDbContext             --idempotent
cd "$base\NotificationService"; dotnet ef migrations script --output "$base\create-Notification.sql"     --context NotificationDbContext     --idempotent
cd "$base\ComplianceService";   dotnet ef migrations script --output "$base\create-Audit.sql"             --context AuditDbContext            --idempotent
cd "$base\WorkOrderService";    dotnet ef migrations script --output "$base\create-WorkOrder.sql"         --context WorkOrderDbContext        --idempotent
cd "$base\ProductService";      dotnet ef migrations script --output "$base\create-Product.sql"           --context ProductDbContext          --idempotent
cd "$base\InventoryService";    dotnet ef migrations script --output "$base\create-Inventory.sql"         --context InventoryDbContext        --idempotent
cd "$base\QualityService";      dotnet ef migrations script --output "$base\create-Quality.sql"           --context QualityDbContext          --idempotent
cd "$base\ComplianceService";   dotnet ef migrations script --output "$base\create-ComplianceReport.sql"  --context ComplianceReportDbContext --idempotent
cd "$base\AnalyticsService";    dotnet ef migrations script --output "$base\create-Analytics.sql"         --context AnalyticsDbContext        --idempotent
```

#### 2c. Create Databases

In Visual Studio → **View → SQL Server Object Explorer** → expand `(localdb)\MSSQLLocalDB` → right-click **Databases** → **Add New Database**

Create these 3 databases one by one:
- `ManuTrackGovernanceDB`
- `ManuTrackOperationsDB`
- `ManuTrackQualityDB`

#### 2d. Create Tables

For each database: right-click the database → **New Query** → **File → Open File** → select the script → press **Ctrl+Shift+E** to execute.

| Database | Run These Scripts (in order) |
|---|---|
| `ManuTrackGovernanceDB` | `create-Auth.sql` → `create-Audit.sql` → `create-Notification.sql` |
| `ManuTrackOperationsDB` | `create-WorkOrder.sql` → `create-Product.sql` → `create-Inventory.sql` |
| `ManuTrackQualityDB` | `create-Quality.sql` → `create-ComplianceReport.sql` → `create-Analytics.sql` |

#### 2e. Seed Data

Run the seed scripts the same way (New Query → open file → execute):

| Database | Seed File |
|---|---|
| `ManuTrackGovernanceDB` | `seed-GovernanceDB.sql` |
| `ManuTrackOperationsDB` | `seed-OperationsDB.sql` |
| `ManuTrackQualityDB` | `seed-QualityDB.sql` |

> **Note:** User accounts with hashed passwords are seeded automatically when **AuthService** starts for the first time. No SQL required for users.

---

### 3. Frontend Setup

```powershell
cd ManuTrack.UI2
npm install
```

---

## ▶ Running the Project

### Start Backend

1. Open `ManuTrack.slnx` in Visual Studio
2. The startup profile **"New Profile"** has all 9 services pre-configured
3. Press **F5** or click **▶ Start**

All services will start in separate console windows.

| Service | Port |
|---|---|
| API Gateway | `http://localhost:5000` |
| AuthService | `http://localhost:5100` |
| ProductService | `http://localhost:5101` |
| WorkOrderService | `http://localhost:5102` |
| InventoryService | `http://localhost:5103` |
| QualityService | `http://localhost:5104` |
| ComplianceService | `http://localhost:5105` |
| AnalyticsService | `http://localhost:5106` |
| NotificationService | `http://localhost:5107` |

### Start Frontend

Open a new terminal:

```bash
cd ManuTrack.UI2
ng serve --open
```

Browser opens automatically at **`http://localhost:4200`**

---

## 🔐 Login Credentials

All accounts use the same password: **`Admin@1234!`**

| Role | Email | Password |
|---|---|---|
| Admin | `john.smith@manutrack.com` | `Admin@1234!` |
| Production Planner | `sarah.lee@manutrack.com` | `Admin@1234!` |
| Shop Floor Operator | `mike.j@manutrack.com` | `Admin@1234!` |
| Quality Inspector | `emily.c@manutrack.com` | `Admin@1234!` |
| Inventory Manager | `robert.c@manutrack.com` | `Admin@1234!` |
| Compliance Officer | `linda.b@manutrack.com` | `Admin@1234!` |

> 💡 **Quick Demo Access** — On the login page, click **⚡ Quick Demo Access** to sign in as any role instantly without typing credentials.

---

## 🔧 Troubleshooting

| Problem | Solution |
|---|---|
| `Invalid object name 'Users'` | Tables not created yet — run the SQL create scripts first, then start services |
| `There is already an object named 'X'` | Delete the database from SQL Server Object Explorer and recreate from scripts |
| `Build failed` | Run `dotnet restore` in the project root |
| Frontend shows blank screen | Run `npm install` inside `ManuTrack.UI2` folder |
| `401 Unauthorized` on API calls | JWT token expired — log out and log back in |
| Port already in use | Kill the process using that port or restart your machine |
| Services can't communicate | Ensure ApiGateway is running on port `5000` |
| `ng serve` command not found | Run `npm install -g @angular/cli` first |
| `dotnet ef` not recognized | Run `dotnet tool install --global dotnet-ef` |

---

## 📁 Project Structure

```
ManuTrack_Updated/
├── ApiGateway/               # Ocelot gateway — routes all frontend requests
├── AuthService/              # User management, JWT authentication
├── WorkOrderService/         # Work orders, production tasks
├── ProductService/           # Product catalog, Bill of Materials
├── InventoryService/         # Stock management, purchase orders
├── QualityService/           # Inspections, defect logging
├── ComplianceService/        # Reports, audit trail
├── AnalyticsService/         # KPI reports, production metrics
├── NotificationService/      # Real-time notifications
├── ManuTrack.SharedKernel/   # Shared models, middleware, filters
├── ManuTrack.UI2/            # Angular 21 frontend
├── seed-GovernanceDB.sql     # Seed data — ManuTrackGovernanceDB
├── seed-OperationsDB.sql     # Seed data — ManuTrackOperationsDB
├── seed-QualityDB.sql        # Seed data — ManuTrackQualityDB
└── ManuTrack.slnx            # Visual Studio solution file
```

---

## 🌐 API Documentation (Swagger)

Once services are running, access Swagger UI:

| Service | URL |
|---|---|
| Auth | http://localhost:5100/swagger |
| Product | http://localhost:5101/swagger |
| WorkOrder | http://localhost:5102/swagger |
| Inventory | http://localhost:5103/swagger |
| Quality | http://localhost:5104/swagger |
| Compliance | http://localhost:5105/swagger |
| Analytics | http://localhost:5106/swagger |
| Notifications | http://localhost:5107/swagger |

---

*Built with ❤️ as part of an enterprise ERP internship project.*

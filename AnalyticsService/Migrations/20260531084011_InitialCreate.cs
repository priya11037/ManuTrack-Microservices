using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AnalyticsService.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "KpiReports",
                columns: table => new
                {
                    ReportID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ReportType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Scope = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Metrics = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    GeneratedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    GeneratedBy = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    PeriodStart = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PeriodEnd = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KpiReports", x => x.ReportID);
                });

            migrationBuilder.CreateTable(
                name: "ProductionMetrics",
                columns: table => new
                {
                    MetricID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MetricType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    MetricName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Value = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    Unit = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ServiceSource = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    EntityID = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    RecordedDate = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductionMetrics", x => x.MetricID);
                });

            migrationBuilder.CreateIndex(
                name: "IX_KpiReports_GeneratedDate",
                table: "KpiReports",
                column: "GeneratedDate");

            migrationBuilder.CreateIndex(
                name: "IX_KpiReports_ReportType",
                table: "KpiReports",
                column: "ReportType");

            migrationBuilder.CreateIndex(
                name: "IX_ProductionMetrics_MetricType",
                table: "ProductionMetrics",
                column: "MetricType");

            migrationBuilder.CreateIndex(
                name: "IX_ProductionMetrics_RecordedDate",
                table: "ProductionMetrics",
                column: "RecordedDate");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "KpiReports");

            migrationBuilder.DropTable(
                name: "ProductionMetrics");
        }
    }
}

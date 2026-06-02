using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ComplianceService.Migrations
{
    /// <inheritdoc />
    public partial class AddComplianceReportUpdates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ComplianceReports_GeneratedDate",
                table: "ComplianceReports");

            migrationBuilder.DropIndex(
                name: "IX_ComplianceReports_ReportType",
                table: "ComplianceReports");

            migrationBuilder.DropColumn(
                name: "ApprovedBy",
                table: "ComplianceReports");

            migrationBuilder.DropColumn(
                name: "ApprovedDate",
                table: "ComplianceReports");

            migrationBuilder.DropColumn(
                name: "GeneratedBy",
                table: "ComplianceReports");

            migrationBuilder.DropColumn(
                name: "GeneratedByUserID",
                table: "ComplianceReports");

            migrationBuilder.DropColumn(
                name: "Metrics",
                table: "ComplianceReports");

            migrationBuilder.DropColumn(
                name: "PeriodEnd",
                table: "ComplianceReports");

            migrationBuilder.DropColumn(
                name: "ReportType",
                table: "ComplianceReports");

            migrationBuilder.DropColumn(
                name: "Scope",
                table: "ComplianceReports");

            migrationBuilder.RenameColumn(
                name: "PeriodStart",
                table: "ComplianceReports",
                newName: "SubmittedDate");

            migrationBuilder.RenameColumn(
                name: "GeneratedDate",
                table: "ComplianceReports",
                newName: "SubmissionDeadline");

            migrationBuilder.AddColumn<int>(
                name: "Actions",
                table: "ComplianceReports",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Findings",
                table: "ComplianceReports",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "ComplianceReports",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Period",
                table: "ComplianceReports",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "PreparedBy",
                table: "ComplianceReports",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Priority",
                table: "ComplianceReports",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Medium");

            migrationBuilder.AddColumn<string>(
                name: "ReportNumber",
                table: "ComplianceReports",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ReviewedBy",
                table: "ComplianceReports",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Type",
                table: "ComplianceReports",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_ComplianceReports_Status",
                table: "ComplianceReports",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_ComplianceReports_Type",
                table: "ComplianceReports",
                column: "Type");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ComplianceReports_Status",
                table: "ComplianceReports");

            migrationBuilder.DropIndex(
                name: "IX_ComplianceReports_Type",
                table: "ComplianceReports");

            migrationBuilder.DropColumn(
                name: "Actions",
                table: "ComplianceReports");

            migrationBuilder.DropColumn(
                name: "Findings",
                table: "ComplianceReports");

            migrationBuilder.DropColumn(
                name: "Notes",
                table: "ComplianceReports");

            migrationBuilder.DropColumn(
                name: "Period",
                table: "ComplianceReports");

            migrationBuilder.DropColumn(
                name: "PreparedBy",
                table: "ComplianceReports");

            migrationBuilder.DropColumn(
                name: "Priority",
                table: "ComplianceReports");

            migrationBuilder.DropColumn(
                name: "ReportNumber",
                table: "ComplianceReports");

            migrationBuilder.DropColumn(
                name: "ReviewedBy",
                table: "ComplianceReports");

            migrationBuilder.DropColumn(
                name: "Type",
                table: "ComplianceReports");

            migrationBuilder.RenameColumn(
                name: "SubmittedDate",
                table: "ComplianceReports",
                newName: "PeriodStart");

            migrationBuilder.RenameColumn(
                name: "SubmissionDeadline",
                table: "ComplianceReports",
                newName: "GeneratedDate");

            migrationBuilder.AddColumn<string>(
                name: "ApprovedBy",
                table: "ComplianceReports",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ApprovedDate",
                table: "ComplianceReports",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GeneratedBy",
                table: "ComplianceReports",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "GeneratedByUserID",
                table: "ComplianceReports",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Metrics",
                table: "ComplianceReports",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "PeriodEnd",
                table: "ComplianceReports",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReportType",
                table: "ComplianceReports",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Scope",
                table: "ComplianceReports",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_ComplianceReports_GeneratedDate",
                table: "ComplianceReports",
                column: "GeneratedDate");

            migrationBuilder.CreateIndex(
                name: "IX_ComplianceReports_ReportType",
                table: "ComplianceReports",
                column: "ReportType");
        }
    }
}

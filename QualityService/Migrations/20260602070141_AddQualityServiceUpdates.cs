using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QualityService.Migrations
{
    /// <inheritdoc />
    public partial class AddQualityServiceUpdates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "InspectorID",
                table: "Inspections");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "Defects");

            migrationBuilder.DropColumn(
                name: "ResolutionDescription",
                table: "Defects");

            migrationBuilder.DropColumn(
                name: "ResolvedDate",
                table: "Defects");

            migrationBuilder.RenameColumn(
                name: "Result",
                table: "Inspections",
                newName: "Sku");

            migrationBuilder.RenameColumn(
                name: "InspectionDate",
                table: "Inspections",
                newName: "ScheduledDate");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "Inspections",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "Pending",
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50,
                oldDefaultValue: "Scheduled");

            migrationBuilder.AddColumn<DateTime>(
                name: "CompletedDate",
                table: "Inspections",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Priority",
                table: "Inspections",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Medium");

            migrationBuilder.AddColumn<string>(
                name: "ProductName",
                table: "Inspections",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "Quantity",
                table: "Inspections",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "ActionTaken",
                table: "Defects",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "Rework");

            migrationBuilder.AddColumn<string>(
                name: "DefectType",
                table: "Defects",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "DefectiveUnits",
                table: "Defects",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "Defects",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProductName",
                table: "Defects",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ReportedBy",
                table: "Defects",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "ReportedDate",
                table: "Defects",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "RootCause",
                table: "Defects",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "WorkOrderID",
                table: "Defects",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_Defects_WorkOrderID",
                table: "Defects",
                column: "WorkOrderID");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Defects_WorkOrderID",
                table: "Defects");

            migrationBuilder.DropColumn(
                name: "CompletedDate",
                table: "Inspections");

            migrationBuilder.DropColumn(
                name: "Priority",
                table: "Inspections");

            migrationBuilder.DropColumn(
                name: "ProductName",
                table: "Inspections");

            migrationBuilder.DropColumn(
                name: "Quantity",
                table: "Inspections");

            migrationBuilder.DropColumn(
                name: "ActionTaken",
                table: "Defects");

            migrationBuilder.DropColumn(
                name: "DefectType",
                table: "Defects");

            migrationBuilder.DropColumn(
                name: "DefectiveUnits",
                table: "Defects");

            migrationBuilder.DropColumn(
                name: "Notes",
                table: "Defects");

            migrationBuilder.DropColumn(
                name: "ProductName",
                table: "Defects");

            migrationBuilder.DropColumn(
                name: "ReportedBy",
                table: "Defects");

            migrationBuilder.DropColumn(
                name: "ReportedDate",
                table: "Defects");

            migrationBuilder.DropColumn(
                name: "RootCause",
                table: "Defects");

            migrationBuilder.DropColumn(
                name: "WorkOrderID",
                table: "Defects");

            migrationBuilder.RenameColumn(
                name: "Sku",
                table: "Inspections",
                newName: "Result");

            migrationBuilder.RenameColumn(
                name: "ScheduledDate",
                table: "Inspections",
                newName: "InspectionDate");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "Inspections",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "Scheduled",
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50,
                oldDefaultValue: "Pending");

            migrationBuilder.AddColumn<string>(
                name: "InspectorID",
                table: "Inspections",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "Defects",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ResolutionDescription",
                table: "Defects",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ResolvedDate",
                table: "Defects",
                type: "datetime2",
                nullable: true);
        }
    }
}

using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkOrderService.Migrations
{
    /// <inheritdoc />
    public partial class AddFlagsStepsAndProductionLines : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ProductionLineID",
                table: "WorkOrders",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ProductionLines",
                columns: table => new
                {
                    LineID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    LineName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Capacity = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false, defaultValue: "Active"),
                    Location = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductionLines", x => x.LineID);
                });

            migrationBuilder.CreateTable(
                name: "WorkOrderFlags",
                columns: table => new
                {
                    WorkOrderFlagID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    WorkOrderID = table.Column<int>(type: "int", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    FlaggedBy = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    FlaggedByUserID = table.Column<int>(type: "int", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false, defaultValue: "Open"),
                    Resolution = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    FlaggedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ResolvedDate = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkOrderFlags", x => x.WorkOrderFlagID);
                    table.ForeignKey(
                        name: "FK_WorkOrderFlags_WorkOrders_WorkOrderID",
                        column: x => x.WorkOrderID,
                        principalTable: "WorkOrders",
                        principalColumn: "WorkOrderID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WorkOrderSteps",
                columns: table => new
                {
                    StepID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    WorkOrderID = table.Column<int>(type: "int", nullable: false),
                    Sequence = table.Column<int>(type: "int", nullable: false),
                    Label = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    IsCompleted = table.Column<bool>(type: "bit", nullable: false),
                    CompletedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CompletedBy = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    CompletedByUserID = table.Column<int>(type: "int", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkOrderSteps", x => x.StepID);
                    table.ForeignKey(
                        name: "FK_WorkOrderSteps_WorkOrders_WorkOrderID",
                        column: x => x.WorkOrderID,
                        principalTable: "WorkOrders",
                        principalColumn: "WorkOrderID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WorkOrders_ProductionLineID",
                table: "WorkOrders",
                column: "ProductionLineID");

            migrationBuilder.CreateIndex(
                name: "IX_ProductionLines_LineName",
                table: "ProductionLines",
                column: "LineName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WorkOrderFlags_Status",
                table: "WorkOrderFlags",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_WorkOrderFlags_WorkOrderID",
                table: "WorkOrderFlags",
                column: "WorkOrderID");

            migrationBuilder.CreateIndex(
                name: "IX_WorkOrderSteps_WorkOrderID",
                table: "WorkOrderSteps",
                column: "WorkOrderID");

            migrationBuilder.AddForeignKey(
                name: "FK_WorkOrders_ProductionLines_ProductionLineID",
                table: "WorkOrders",
                column: "ProductionLineID",
                principalTable: "ProductionLines",
                principalColumn: "LineID",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_WorkOrders_ProductionLines_ProductionLineID",
                table: "WorkOrders");

            migrationBuilder.DropTable(
                name: "ProductionLines");

            migrationBuilder.DropTable(
                name: "WorkOrderFlags");

            migrationBuilder.DropTable(
                name: "WorkOrderSteps");

            migrationBuilder.DropIndex(
                name: "IX_WorkOrders_ProductionLineID",
                table: "WorkOrders");

            migrationBuilder.DropColumn(
                name: "ProductionLineID",
                table: "WorkOrders");
        }
    }
}

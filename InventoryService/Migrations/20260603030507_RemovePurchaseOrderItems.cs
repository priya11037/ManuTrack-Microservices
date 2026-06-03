using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InventoryService.Migrations
{
    /// <inheritdoc />
    public partial class RemovePurchaseOrderItems : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PurchaseOrderItems");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PurchaseOrderItems",
                columns: table => new
                {
                    POItemID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    InventoryItemInventoryID = table.Column<int>(type: "int", nullable: true),
                    POID = table.Column<int>(type: "int", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    InventoryID = table.Column<int>(type: "int", nullable: false),
                    ProductID = table.Column<int>(type: "int", nullable: false),
                    ProductName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Quantity = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    ReceivedQty = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    TotalPrice = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "decimal(18,4)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseOrderItems", x => x.POItemID);
                    table.ForeignKey(
                        name: "FK_PurchaseOrderItems_InventoryItems_InventoryItemInventoryID",
                        column: x => x.InventoryItemInventoryID,
                        principalTable: "InventoryItems",
                        principalColumn: "InventoryID");
                    table.ForeignKey(
                        name: "FK_PurchaseOrderItems_PurchaseOrders_POID",
                        column: x => x.POID,
                        principalTable: "PurchaseOrders",
                        principalColumn: "POID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrderItems_InventoryID",
                table: "PurchaseOrderItems",
                column: "InventoryID");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrderItems_InventoryItemInventoryID",
                table: "PurchaseOrderItems",
                column: "InventoryItemInventoryID");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrderItems_POID",
                table: "PurchaseOrderItems",
                column: "POID");
        }
    }
}

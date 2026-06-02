using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InventoryService.Migrations
{
    /// <inheritdoc />
    public partial class AddSuppliersLocationsAndPOItems : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_InventoryItems_InventoryLocations_LocationID",
                table: "InventoryItems");

            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseOrderItems_InventoryItems_InventoryID",
                table: "PurchaseOrderItems");

            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseOrders_Suppliers_SupplierRefID",
                table: "PurchaseOrders");

            migrationBuilder.DropIndex(
                name: "IX_PurchaseOrders_SupplierRefID",
                table: "PurchaseOrders");

            migrationBuilder.DropIndex(
                name: "IX_InventoryLocations_IsActive",
                table: "InventoryLocations");

            migrationBuilder.DropIndex(
                name: "IX_InventoryLocations_Name",
                table: "InventoryLocations");

            migrationBuilder.DropIndex(
                name: "IX_InventoryItems_ProductID",
                table: "InventoryItems");

            migrationBuilder.DropColumn(
                name: "SupplierRefID",
                table: "PurchaseOrders");

            migrationBuilder.DropColumn(
                name: "TotalAmount",
                table: "PurchaseOrders");

            migrationBuilder.DropColumn(
                name: "ProductID",
                table: "InventoryItems");

            migrationBuilder.RenameColumn(
                name: "ExpectedDeliveryDate",
                table: "PurchaseOrders",
                newName: "ExpectedDate");

            migrationBuilder.RenameColumn(
                name: "ProductName",
                table: "InventoryItems",
                newName: "Supplier");

            migrationBuilder.RenameColumn(
                name: "LocationID",
                table: "InventoryItems",
                newName: "InventoryLocationLocationID");

            migrationBuilder.RenameIndex(
                name: "IX_InventoryItems_LocationID",
                table: "InventoryItems",
                newName: "IX_InventoryItems_InventoryLocationLocationID");

            migrationBuilder.AlterColumn<bool>(
                name: "IsActive",
                table: "Suppliers",
                type: "bit",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "bit",
                oldDefaultValue: true);

            migrationBuilder.AlterColumn<int>(
                name: "SupplierID",
                table: "PurchaseOrders",
                type: "int",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100,
                oldDefaultValue: "");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "PurchaseOrders",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "Draft",
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50,
                oldDefaultValue: "Pending");

            migrationBuilder.AddColumn<string>(
                name: "ItemName",
                table: "PurchaseOrders",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ItemSku",
                table: "PurchaseOrders",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "PONumber",
                table: "PurchaseOrders",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Priority",
                table: "PurchaseOrders",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Medium");

            migrationBuilder.AddColumn<decimal>(
                name: "Quantity",
                table: "PurchaseOrders",
                type: "decimal(18,4)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "TotalCost",
                table: "PurchaseOrders",
                type: "decimal(18,4)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "UnitCost",
                table: "PurchaseOrders",
                type: "decimal(18,4)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AlterColumn<decimal>(
                name: "UnitPrice",
                table: "PurchaseOrderItems",
                type: "decimal(18,4)",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,2)");

            migrationBuilder.AlterColumn<decimal>(
                name: "TotalPrice",
                table: "PurchaseOrderItems",
                type: "decimal(18,4)",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,2)");

            migrationBuilder.AddColumn<int>(
                name: "InventoryItemInventoryID",
                table: "PurchaseOrderItems",
                type: "int",
                nullable: true);

            migrationBuilder.AlterColumn<bool>(
                name: "IsActive",
                table: "InventoryLocations",
                type: "bit",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "bit",
                oldDefaultValue: true);

            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "InventoryItems",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Location",
                table: "InventoryItems",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "MaximumQuantity",
                table: "InventoryItems",
                type: "decimal(18,4)",
                nullable: false,
                defaultValue: 9999m);

            migrationBuilder.AddColumn<string>(
                name: "Name",
                table: "InventoryItems",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Sku",
                table: "InventoryItems",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Unit",
                table: "InventoryItems",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "pcs");

            migrationBuilder.AddColumn<decimal>(
                name: "UnitCost",
                table: "InventoryItems",
                type: "decimal(18,4)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.CreateIndex(
                name: "IX_Suppliers_Name",
                table: "Suppliers",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrders_Priority",
                table: "PurchaseOrders",
                column: "Priority");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrders_Status",
                table: "PurchaseOrders",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrders_SupplierID",
                table: "PurchaseOrders",
                column: "SupplierID");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrderItems_InventoryItemInventoryID",
                table: "PurchaseOrderItems",
                column: "InventoryItemInventoryID");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryLocations_Name",
                table: "InventoryLocations",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryItems_Sku",
                table: "InventoryItems",
                column: "Sku");

            migrationBuilder.AddForeignKey(
                name: "FK_InventoryItems_InventoryLocations_InventoryLocationLocationID",
                table: "InventoryItems",
                column: "InventoryLocationLocationID",
                principalTable: "InventoryLocations",
                principalColumn: "LocationID");

            migrationBuilder.AddForeignKey(
                name: "FK_PurchaseOrderItems_InventoryItems_InventoryItemInventoryID",
                table: "PurchaseOrderItems",
                column: "InventoryItemInventoryID",
                principalTable: "InventoryItems",
                principalColumn: "InventoryID");

            migrationBuilder.AddForeignKey(
                name: "FK_PurchaseOrders_Suppliers_SupplierID",
                table: "PurchaseOrders",
                column: "SupplierID",
                principalTable: "Suppliers",
                principalColumn: "SupplierID");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_InventoryItems_InventoryLocations_InventoryLocationLocationID",
                table: "InventoryItems");

            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseOrderItems_InventoryItems_InventoryItemInventoryID",
                table: "PurchaseOrderItems");

            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseOrders_Suppliers_SupplierID",
                table: "PurchaseOrders");

            migrationBuilder.DropIndex(
                name: "IX_Suppliers_Name",
                table: "Suppliers");

            migrationBuilder.DropIndex(
                name: "IX_PurchaseOrders_Priority",
                table: "PurchaseOrders");

            migrationBuilder.DropIndex(
                name: "IX_PurchaseOrders_Status",
                table: "PurchaseOrders");

            migrationBuilder.DropIndex(
                name: "IX_PurchaseOrders_SupplierID",
                table: "PurchaseOrders");

            migrationBuilder.DropIndex(
                name: "IX_PurchaseOrderItems_InventoryItemInventoryID",
                table: "PurchaseOrderItems");

            migrationBuilder.DropIndex(
                name: "IX_InventoryLocations_Name",
                table: "InventoryLocations");

            migrationBuilder.DropIndex(
                name: "IX_InventoryItems_Sku",
                table: "InventoryItems");

            migrationBuilder.DropColumn(
                name: "ItemName",
                table: "PurchaseOrders");

            migrationBuilder.DropColumn(
                name: "ItemSku",
                table: "PurchaseOrders");

            migrationBuilder.DropColumn(
                name: "PONumber",
                table: "PurchaseOrders");

            migrationBuilder.DropColumn(
                name: "Priority",
                table: "PurchaseOrders");

            migrationBuilder.DropColumn(
                name: "Quantity",
                table: "PurchaseOrders");

            migrationBuilder.DropColumn(
                name: "TotalCost",
                table: "PurchaseOrders");

            migrationBuilder.DropColumn(
                name: "UnitCost",
                table: "PurchaseOrders");

            migrationBuilder.DropColumn(
                name: "InventoryItemInventoryID",
                table: "PurchaseOrderItems");

            migrationBuilder.DropColumn(
                name: "Category",
                table: "InventoryItems");

            migrationBuilder.DropColumn(
                name: "Location",
                table: "InventoryItems");

            migrationBuilder.DropColumn(
                name: "MaximumQuantity",
                table: "InventoryItems");

            migrationBuilder.DropColumn(
                name: "Name",
                table: "InventoryItems");

            migrationBuilder.DropColumn(
                name: "Sku",
                table: "InventoryItems");

            migrationBuilder.DropColumn(
                name: "Unit",
                table: "InventoryItems");

            migrationBuilder.DropColumn(
                name: "UnitCost",
                table: "InventoryItems");

            migrationBuilder.RenameColumn(
                name: "ExpectedDate",
                table: "PurchaseOrders",
                newName: "ExpectedDeliveryDate");

            migrationBuilder.RenameColumn(
                name: "Supplier",
                table: "InventoryItems",
                newName: "ProductName");

            migrationBuilder.RenameColumn(
                name: "InventoryLocationLocationID",
                table: "InventoryItems",
                newName: "LocationID");

            migrationBuilder.RenameIndex(
                name: "IX_InventoryItems_InventoryLocationLocationID",
                table: "InventoryItems",
                newName: "IX_InventoryItems_LocationID");

            migrationBuilder.AlterColumn<bool>(
                name: "IsActive",
                table: "Suppliers",
                type: "bit",
                nullable: false,
                defaultValue: true,
                oldClrType: typeof(bool),
                oldType: "bit");

            migrationBuilder.AlterColumn<string>(
                name: "SupplierID",
                table: "PurchaseOrders",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "PurchaseOrders",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "Pending",
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50,
                oldDefaultValue: "Draft");

            migrationBuilder.AddColumn<int>(
                name: "SupplierRefID",
                table: "PurchaseOrders",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TotalAmount",
                table: "PurchaseOrders",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AlterColumn<decimal>(
                name: "UnitPrice",
                table: "PurchaseOrderItems",
                type: "decimal(18,2)",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,4)");

            migrationBuilder.AlterColumn<decimal>(
                name: "TotalPrice",
                table: "PurchaseOrderItems",
                type: "decimal(18,2)",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,4)");

            migrationBuilder.AlterColumn<bool>(
                name: "IsActive",
                table: "InventoryLocations",
                type: "bit",
                nullable: false,
                defaultValue: true,
                oldClrType: typeof(bool),
                oldType: "bit");

            migrationBuilder.AddColumn<int>(
                name: "ProductID",
                table: "InventoryItems",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrders_SupplierRefID",
                table: "PurchaseOrders",
                column: "SupplierRefID");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryLocations_IsActive",
                table: "InventoryLocations",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryLocations_Name",
                table: "InventoryLocations",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_InventoryItems_ProductID",
                table: "InventoryItems",
                column: "ProductID");

            migrationBuilder.AddForeignKey(
                name: "FK_InventoryItems_InventoryLocations_LocationID",
                table: "InventoryItems",
                column: "LocationID",
                principalTable: "InventoryLocations",
                principalColumn: "LocationID",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_PurchaseOrderItems_InventoryItems_InventoryID",
                table: "PurchaseOrderItems",
                column: "InventoryID",
                principalTable: "InventoryItems",
                principalColumn: "InventoryID",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PurchaseOrders_Suppliers_SupplierRefID",
                table: "PurchaseOrders",
                column: "SupplierRefID",
                principalTable: "Suppliers",
                principalColumn: "SupplierID",
                onDelete: ReferentialAction.SetNull);
        }
    }
}

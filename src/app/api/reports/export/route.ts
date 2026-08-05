import ExcelJS from "exceljs";
import { NextRequest, NextResponse } from "next/server";

import { listProducts } from "@/lib/data";

export const runtime = "nodejs";

const demoSales = [
  { saleDate: "2026-08-06", orderNumber: "2026-08-06-001", productCode: "P001", product: "Potato Chips", quantity: 2, unitPrice: 2, subtotal: 4, paymentMethod: "Cash", staff: "Alice", status: "Completed" },
  { saleDate: "2026-08-06", orderNumber: "2026-08-06-002", productCode: "P003", product: "Coca-Cola Can", quantity: 1, unitPrice: 2, subtotal: 2, paymentMethod: "E-payment", staff: "Alice", status: "Completed" },
];

const headerFill = "173B67";
const summaryFill = "DDF4E7";

function styleSheet(sheet: ExcelJS.Worksheet, columnCount: number) {
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  const header = sheet.getRow(1);
  header.height = 24;
  header.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: headerFill } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });
  for (let row = 2; row <= sheet.rowCount; row += 1) {
    if (row % 2 === 0) {
      sheet.getRow(row).eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F3F6FA" } };
      });
    }
  }
  for (let column = 1; column <= columnCount; column += 1) {
    let width = 12;
    sheet.getColumn(column).eachCell({ includeEmpty: false }, (cell) => { width = Math.max(width, String(cell.value ?? "").length + 2); });
    sheet.getColumn(column).width = Math.min(width, 28);
  }
}

function addSummary(sheet: ExcelJS.Worksheet, label: string, value: string | number) {
  const row = sheet.addRow([label, value]);
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: summaryFill } };
    cell.font = { bold: true, size: 12 };
  });
}

function addTable(sheet: ExcelJS.Worksheet, name: string, columnCount: number) {
  const columnName = String.fromCharCode(64 + columnCount);
  const columns = Array.from({ length: columnCount }, (_, index) => ({ name: String(sheet.getCell(1, index + 1).value ?? `Column ${index + 1}`) }));
  const rows = Array.from({ length: Math.max(0, sheet.rowCount - 1) }, (_, rowIndex) => Array.from({ length: columnCount }, (_, columnIndex) => sheet.getCell(rowIndex + 2, columnIndex + 1).value ?? null));
  sheet.addTable({
    name,
    ref: `A1:${columnName}${sheet.rowCount}`,
    headerRow: true,
    totalsRow: false,
    columns,
    rows,
    style: { theme: "TableStyleMedium2", showRowStripes: true },
  });
}

export async function GET(request: NextRequest) {
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  const sales = demoSales.filter((sale) => (!from || sale.saleDate >= from) && (!to || sale.saleDate <= to));
  const products = await listProducts();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Tuck Shop";
  workbook.created = new Date();

  const salesSheet = workbook.addWorksheet("Sales Report");
  salesSheet.addRow(["Sale Date", "Order Number", "Product Code", "Product", "Quantity", "Unit Price", "Subtotal", "Payment Method", "Staff", "Sale Status"]);
  sales.forEach((sale) => salesSheet.addRow([sale.saleDate, sale.orderNumber, sale.productCode, sale.product, sale.quantity, sale.unitPrice, sale.subtotal, sale.paymentMethod, sale.staff, sale.status]));
  salesSheet.getColumn(6).numFmt = '"RM"0.00';
  salesSheet.getColumn(7).numFmt = '"RM"0.00';
  addTable(salesSheet, "SalesReport", 10);
  addSummary(salesSheet, "Total valid orders", sales.length);
  addSummary(salesSheet, "Cash total", sales.filter((sale) => sale.paymentMethod === "Cash").reduce((sum, sale) => sum + sale.subtotal, 0));
  addSummary(salesSheet, "E-payment total", sales.filter((sale) => sale.paymentMethod === "E-payment").reduce((sum, sale) => sum + sale.subtotal, 0));
  addSummary(salesSheet, "Grand total revenue", sales.reduce((sum, sale) => sum + sale.subtotal, 0));
  styleSheet(salesSheet, 10);

  const inventorySheet = workbook.addWorksheet("Inventory Report");
  inventorySheet.addRow(["Product Code", "Product", "Category", "Current Stock", "Cost Price", "Selling Price", "Inventory Value", "Minimum Stock", "Stock Status"]);
  products.forEach((product) => inventorySheet.addRow([product.product_code, product.name, product.category, product.current_stock, product.cost_price ?? null, product.selling_price, (product.cost_price ?? 0) * product.current_stock, product.minimum_stock, product.current_stock === 0 ? "Out of stock" : product.current_stock <= product.minimum_stock ? "Low stock" : "In stock"]));
  inventorySheet.getColumn(5).numFmt = '"RM"0.00';
  inventorySheet.getColumn(6).numFmt = '"RM"0.00';
  inventorySheet.getColumn(7).numFmt = '"RM"0.00';
  addTable(inventorySheet, "InventoryReport", 9);
  addSummary(inventorySheet, "Total inventory value", products.reduce((sum, product) => sum + (product.cost_price ?? 0) * product.current_stock, 0));
  styleSheet(inventorySheet, 9);

  const profitSheet = workbook.addWorksheet("Monthly Profit Report");
  profitSheet.addRow(["Month", "Revenue", "Cost", "Profit", "Margin %"]);
  profitSheet.addRow(["August 2026", 6, 3.6, 2.4, 0.4]);
  profitSheet.getColumn(2).numFmt = '"RM"0.00';
  profitSheet.getColumn(3).numFmt = '"RM"0.00';
  profitSheet.getColumn(4).numFmt = '"RM"0.00';
  profitSheet.getColumn(5).numFmt = "0.00%";
  addTable(profitSheet, "MonthlyProfitReport", 5);
  addSummary(profitSheet, "Annual revenue", 6);
  addSummary(profitSheet, "Annual cost", 3.6);
  addSummary(profitSheet, "Annual profit", 2.4);
  styleSheet(profitSheet, 5);

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="tuck-shop-report.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}

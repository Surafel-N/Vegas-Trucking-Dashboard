import type { DashboardRecord } from "./types";

export async function exportToExcel(data: DashboardRecord[]) {
  const XLSX = await import("xlsx");
  const rows = data.map((record) => ({
    chauffeur: record.chauffeur,
    date: record.date,
    fuel: record.fuel_cost_cfa,
    roadFees: record.road_fees_cfa,
    total: record.total_expense_cfa,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "SDV_2025");
  XLSX.writeFile(workbook, "SDV_EXPORT_2025.xlsx");
}

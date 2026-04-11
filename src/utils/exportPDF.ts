import type { DashboardRecord } from "./types";

export async function exportToPDF(data: DashboardRecord[]) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4",
  });

  const exportDate = new Date().toLocaleDateString("fr-FR");

  doc.setFontSize(18);
  doc.text("SDV Export 2025", 40, 40);
  doc.setFontSize(10);
  doc.text(`Date export: ${exportDate}`, 40, 60);

  autoTable(doc, {
    startY: 80,
    head: [["Chauffeur", "Date", "Fuel", "Road Fees", "Total"]],
    body: data.map((record) => [
      record.chauffeur,
      record.date,
      record.fuel_cost_cfa.toLocaleString("fr-FR"),
      record.road_fees_cfa.toLocaleString("fr-FR"),
      record.total_expense_cfa.toLocaleString("fr-FR"),
    ]),
    styles: {
      fontSize: 9,
      cellPadding: 6,
    },
    headStyles: {
      fillColor: [15, 155, 142],
    },
  });

  doc.save("SDV_EXPORT_2025.pdf");
}

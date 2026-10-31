import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency, formatTonnage } from "../lib/dashboard";
import { isCmlTrip } from "./cmlReconciliation";

export function generateCMLStatement(trips, month, year, t) {
  const cmlTrips = (trips || []).filter(t => isCmlTrip(t) && t.month === parseInt(month) && t.year === parseInt(year));
  
  const abidjanTrips = cmlTrips.filter(t => {
    const s = String(t.start || "").toLowerCase();
    const d = String(t.destination || "").toLowerCase();
    return s.includes("abidjan") || d.includes("abidjan");
  });
  const sanPedroTrips = cmlTrips.filter(t => {
    const s = String(t.start || "").toLowerCase();
    const d = String(t.destination || "").toLowerCase();
    return s.includes("san pedro") || s.includes("san-pedro") || d.includes("san pedro") || d.includes("san-pedro");
  });
  
  const abidjanTonnage = abidjanTrips.reduce((acc, t) => acc + (t.tonnage || 0), 0);
  const sanPedroTonnage = sanPedroTrips.reduce((acc, t) => acc + (t.tonnage || 0), 0);
  
  const abidjanTotal = abidjanTrips.reduce((acc, t) => acc + (t.total_gross_cfa || 0), 0);
  const sanPedroTotal = sanPedroTrips.reduce((acc, t) => acc + (t.total_gross_cfa || 0), 0);

  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.text("Relevé Mensuel CML", 14, 22);
  doc.setFontSize(12);
  doc.text(`Période : ${month.toString().padStart(2, '0')}/${year}`, 14, 32);
  doc.text(`Date d'émission : ${new Date().toLocaleDateString()}`, 14, 40);

  // Summary Table
  autoTable(doc, {
    startY: 50,
    head: [['Corridor', 'Rotations', 'Tonnage Total', 'Montant Dû (CFA)']],
    body: [
      ['Mine de Lauzua <-> Abidjan', abidjanTrips.length, formatTonnage(abidjanTonnage), formatCurrency(abidjanTotal, 'CFA')],
      ['Mine de Lauzua <-> San Pedro', sanPedroTrips.length, formatTonnage(sanPedroTonnage), formatCurrency(sanPedroTotal, 'CFA')],
      ['TOTAL', cmlTrips.length, formatTonnage(abidjanTonnage + sanPedroTonnage), formatCurrency(abidjanTotal + sanPedroTotal, 'CFA')],
    ],
    theme: 'grid',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [207, 93, 86] } // #cf5d56
  });

  doc.save(`Releve_CML_${year}_${month.toString().padStart(2, '0')}.pdf`);
}

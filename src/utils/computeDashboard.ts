import type { DashboardRecord, DashboardSummary, DriverDashboardSummary } from "./types";

const DRIVER_ORDER = ["AMARA", "BRAHIMA", "SORO"];

function emptyDriverSummary(chauffeur: string): DriverDashboardSummary {
  const sdvNumber = DRIVER_ORDER.indexOf(chauffeur) + 1;

  return {
    chauffeur,
    driverLabel: `SDV ${sdvNumber} (${chauffeur})`,
    sdv: `SDV ${sdvNumber}`,
    totalExpense: 0,
    totalFuel: 0,
    totalRoadFees: 0,
    entryCount: 0,
    totalVoyages: 0,
    totalTonnage: 0,
    totalRevenue: 0,
    totalProfit: 0,
  };
}

export function computeDashboard(data: DashboardRecord[]): DashboardSummary {
  const byDriverMap = new Map<string, DriverDashboardSummary>(
    DRIVER_ORDER.map((chauffeur) => [chauffeur, emptyDriverSummary(chauffeur)]),
  );

  const global = data.reduce(
    (accumulator, record) => {
      accumulator.totalExpense += record.total_expense_cfa;
      accumulator.totalFuel += record.fuel_cost_cfa;
      accumulator.totalRoadFees += record.road_fees_cfa;
      accumulator.entryCount += 1;
      accumulator.totalVoyages += record.voyages || 0;
      accumulator.totalTonnage += record.tonnage || 0;
      accumulator.totalRevenue += record.total_gross_cfa || 0;
      accumulator.totalProfit += record.total_net_cfa || 0;

      const existing = byDriverMap.get(record.chauffeur) ?? emptyDriverSummary(record.chauffeur);
      existing.driverLabel = record.driverLabel;
      existing.sdv = record.sdv;
      existing.totalExpense += record.total_expense_cfa;
      existing.totalFuel += record.fuel_cost_cfa;
      existing.totalRoadFees += record.road_fees_cfa;
      existing.entryCount += 1;
      existing.totalVoyages += record.voyages || 0;
      existing.totalTonnage += record.tonnage || 0;
      existing.totalRevenue += record.total_gross_cfa || 0;
      existing.totalProfit += record.total_net_cfa || 0;
      byDriverMap.set(record.chauffeur, existing);

      return accumulator;
    },
    {
      totalExpense: 0,
      totalFuel: 0,
      totalRoadFees: 0,
      entryCount: 0,
      totalVoyages: 0,
      totalTonnage: 0,
      totalRevenue: 0,
      totalProfit: 0,
    },
  );

  const byDriver = DRIVER_ORDER.map((chauffeur) => byDriverMap.get(chauffeur) ?? emptyDriverSummary(chauffeur));

  return { global, byDriver, allTrips: data };
}

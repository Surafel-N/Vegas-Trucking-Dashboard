export type DashboardRecord = {
  chauffeur: string;
  driverLabel: string;
  sdv: string;
  sourceFile: string;
  date: string;
  month: number;
  year: number;
  start: string;
  destination: string;
  fuel_cost_cfa: number;
  road_fees_cfa: number;
  total_expense_cfa: number;
  tonnage: number;
  voyages: number;
  total_gross_cfa: number;
  total_net_cfa: number;
  km?: number;
};

export type DriverDashboardSummary = {
  chauffeur: string;
  driverLabel: string;
  sdv: string;
  totalExpense: number;
  totalFuel: number;
  totalRoadFees: number;
  entryCount: number;
  totalVoyages: number;
  totalTonnage: number;
  totalRevenue: number;
  totalProfit: number;
};

export type DashboardSummary = {
  global: {
    totalExpense: number;
    totalFuel: number;
    totalRoadFees: number;
    entryCount: number;
    totalVoyages: number;
    totalTonnage: number;
    totalRevenue: number;
    totalProfit: number;
  };
  byDriver: DriverDashboardSummary[];
  allTrips: DashboardRecord[];
};

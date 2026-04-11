import type { DashboardRecord } from "./types";

export function getMonthlyComparison(data: DashboardRecord[]) {
  const comparison: Record<number, { total: number }> = {
    1: { total: 0 },
    2: { total: 0 },
    3: { total: 0 },
    4: { total: 0 },
    5: { total: 0 },
    6: { total: 0 },
    7: { total: 0 },
    8: { total: 0 },
    9: { total: 0 },
    10: { total: 0 },
    11: { total: 0 },
    12: { total: 0 },
  };

  for (const record of data) {
    if (!comparison[record.month]) {
      comparison[record.month] = { total: 0 };
    }

    comparison[record.month].total += record.total_expense_cfa;
  }

  return comparison;
}

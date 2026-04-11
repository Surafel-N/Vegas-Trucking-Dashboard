function toMs(value) {
  const ms = Date.parse(value || "");
  return Number.isNaN(ms) ? null : ms;
}

function startOfDay(ms) {
  const date = new Date(ms);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function startOfWeek(ms) {
  const date = new Date(ms);
  const day = (date.getDay() + 6) % 7;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - day).getTime();
}

function startOfMonth(ms) {
  const date = new Date(ms);
  return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
}

export function inPeriod(recordDate, mode, anchorDate) {
  const recordMs = toMs(recordDate);
  const anchorMs = toMs(anchorDate);
  if (recordMs === null || anchorMs === null) return false;

  if (mode === "day") return startOfDay(recordMs) === startOfDay(anchorMs);
  if (mode === "week") return recordMs >= startOfWeek(anchorMs) && recordMs < startOfWeek(anchorMs) + 7 * 86400000;
  if (mode === "month") {
    const record = new Date(recordMs);
    const anchor = new Date(anchorMs);
    return record.getFullYear() === anchor.getFullYear() && record.getMonth() === anchor.getMonth();
  }

  return true;
}

export function summarizeFinance({ expenses, incomes, mode, anchorDate }) {
  const filteredExpenses = expenses.filter((item) => inPeriod(item.date, mode, anchorDate));
  const filteredIncomes = incomes.filter((item) => inPeriod(item.date, mode, anchorDate));

  const totalExpense = filteredExpenses.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalIncome = filteredIncomes.reduce((sum, item) => sum + (item.amount || 0), 0);

  return {
    totalExpense,
    totalIncome,
    net: totalIncome - totalExpense,
    expenseCount: filteredExpenses.length,
    incomeCount: filteredIncomes.length,
  };
}

export function computeTripProfit(trip, expenses = [], incomes = []) {
  // Priorité aux données de l'import détaillé
  if (trip.status === "imported" || trip.fuelCostCFA !== undefined) {
    return {
      expense: trip.totalExpense || 0,
      income: trip.totalGrossCFA || 0,
      net: trip.totalNetCFA || 0,
    };
  }

  const relatedExpense = (expenses || [])
    .filter((item) => item.tripId === trip.id)
    .reduce((sum, item) => sum + (item.amount || 0), 0);
  const relatedIncome = (incomes || [])
    .filter((item) => item.tripId === trip.id)
    .reduce((sum, item) => sum + (item.amount || 0), 0);

  return {
    expense: (trip.total_expense_cfa || 0) + relatedExpense,
    income: (trip.total_gross_cfa || 0) + relatedIncome,
    net: (trip.total_net_cfa || 0) + relatedIncome - relatedExpense,
  };
}


export function computeDriverPerformance({ drivers = [], trips = [], expenses = [], incomes = [] }) {
  return (drivers || []).map((driver) => {
    const driverTrips = (trips || []).filter((trip) => trip.driverId === driver.id);

    const tripIncome = driverTrips.reduce((sum, trip) => sum + trip.total_gross_cfa, 0);
    const tripExpense = driverTrips.reduce((sum, trip) => sum + trip.total_expense_cfa, 0);

    const directIncome = incomes
      .filter((item) => item.driverId === driver.id)
      .reduce((sum, item) => sum + (item.amount || 0), 0);
    const directExpense = expenses
      .filter((item) => item.driverId === driver.id)
      .reduce((sum, item) => sum + (item.amount || 0), 0);

    const income = tripIncome + directIncome;
    const expense = tripExpense + directExpense;

    return {
      ...driver,
      tripCount: driverTrips.length,
      income,
      expense,
      net: income - expense,
    };
  });
}

export function computeCategoryBreakdown(records, key = "category") {
  const map = new Map();
  records.forEach((item) => {
    const category = item[key] || "Autre";
    const previous = map.get(category) || 0;
    map.set(category, previous + (item.amount || 0));
  });

  return Array.from(map.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

import sdv1Raw from "../../data/SDV_1.csv?raw";
import sdv2Raw from "../../data/SDV_2.csv?raw";
import sdv3Raw from "../../data/SDV_3.csv?raw";

export const ALL_CHAUFFEURS = "Tous les chauffeurs";
export const ALL_DESTINATIONS = "Toutes les destinations";
export const ALL_MONTHS = "Tous les mois";

const SDV_SOURCES = [
  { chauffeur: "AMARA", sdv: "TRUCK 76", sourceFile: "SDV_1.csv", raw: sdv1Raw },
  { chauffeur: "BRAHIMA", sdv: "TRUCK 45", sourceFile: "SDV_2.csv", raw: sdv2Raw },
  { chauffeur: "SORO", sdv: "TRUCK 52", sourceFile: "SDV_3.csv", raw: sdv3Raw },
];

const FRENCH_MONTHS = {
  janvier: 1,
  fevrier: 2,
  mars: 3,
  avril: 4,
  mai: 5,
  juin: 6,
  juillet: 7,
  aout: 8,
  septembre: 9,
  octobre: 10,
  novembre: 11,
  decembre: 12,
  janv: 1,
  fevr: 2,
  sept: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

const MONTH_LABELS = [
  "Janvier",
  "Fevrier",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Aout",
  "Septembre",
  "Octobre",
  "Novembre",
  "Decembre",
];

const currencyFormatter = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 0,
});

const tonnageFormatter = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat("fr-FR", {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function splitCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if ((char === ";" || char === ",") && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function normalizeHeaders(row) {
  return row.map((header, index) => {
    if (index === 0) {
      return "date";
    }

    return normalizeText(header).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  });
}

function getColumnIndex(headers, patterns, fallbackIndex = -1) {
  const index = headers.findIndex((header) => patterns.some((pattern) => pattern.test(header)));
  return index >= 0 ? index : fallbackIndex;
}

function parseNumber(value) {
  const text = String(value ?? "").trim();
  if (!text) {
    return 0;
  }

  let normalized = text
    .replace(/\u202f/g, "")
    .replace(/\xa0/g, "")
    .replace(/\s+/g, "")
    .replace(/CFA/gi, "")
    .replace(/\$/g, "")
    .replace(/\u20ac/g, "")
    .replace(/,/g, ".");

  normalized = normalized.replace(/[^0-9.\-]/g, "");

  if (!normalized || normalized === "-" || normalized === "." || normalized === "-.") {
    return 0;
  }

  if (normalized.includes(".")) {
    const parts = normalized.split(".");
    if (parts.length > 2) {
      normalized = parts.slice(0, -1).join("") + "." + parts[parts.length - 1];
    }
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseDateFR(rawValue) {
  const value = String(rawValue ?? "").trim();
  if (!value) {
    return null;
  }

  const slashMatch = value.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (slashMatch) {
    const [, dayText, monthText, yearText] = slashMatch;
    const day = Number(dayText);
    const month = Number(monthText);
    let year = Number(yearText);
    if (yearText.length === 2) year += 2000;

    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return null;
    }

    const isoDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return { isoDate, day, month, year };
  }

  const normalized = normalizeText(value).replace(/,/g, " ");
  const textMatch = normalized.match(/^(?:[a-z]+\s+)?(\d{1,2})\s+([a-z]+)\s+(\d{2,4})$/);
  if (!textMatch) {
    return null;
  }

  const [, dayText, monthLabel, yearText] = textMatch;
  const day = Number(dayText);
  const month = FRENCH_MONTHS[monthLabel];
  let year = Number(yearText);
  if (yearText.length === 2) year += 2000;

  if (!month || day < 1 || day > 31) {
    return null;
  }

  const isoDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return { isoDate, day, month, year };
}

function normalizeDestination(value) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return "Non renseignee";
  }

  if (normalized.includes("pedro")) return "San Pedro";
  if (normalized.includes("abidjan")) return "Abidjan";
  if (normalized.includes("lauzoua")) return "Lauzoua";
  if (normalized.includes("yamoussoukro")) return "Yamoussoukro";
  if (normalized.includes("bouake")) return "Bouake";

  return value.trim();
}

function calculateVoyages(tonnage) {
  if (tonnage <= 0) return 0;
  return tonnage > 100 ? 2 : 1;
}

function parseFileRecords(source, rules) {
  const { raw, chauffeur, sdv, sourceFile } = source;
  const lines = raw.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = normalizeHeaders(splitCsvLine(lines[0]));

  const fuelIdx = getColumnIndex(headers, [/fuel/i, /carburant/i, /gasoil/i], 3);
  const roadIdx = getColumnIndex(headers, [/road/i, /route/i, /frais/i, /peage/i], 4);
  const tonnageIdx = getColumnIndex(headers, [/tonnage/i, /poids/i, /volume/i], 6);
  const grossIdx = getColumnIndex(headers, [/gross/i, /revenu/i, /brut/i, /ca/i], 7);
  const netIdx = getColumnIndex(headers, [/net/i, /profit/i, /benefice/i], 8);
  const destIdx = getColumnIndex(headers, [/dest/i, /arrivee/i, /ville/i], 2);
  const startIdx = getColumnIndex(headers, [/start/i, /depart/i, /origine/i], 1);

  return lines
    .slice(1)
    .map((line) => {
      const cells = splitCsvLine(line);
      const dateData = parseDateFR(cells[0]);
      if (!dateData) return null;

      const tonnage = parseNumber(cells[tonnageIdx]);
      if (tonnage === 0 && parseNumber(cells[grossIdx]) === 0 && parseNumber(cells[fuelIdx]) === 0) {
        return null;
      }

      return {
        id: `${sourceFile}-${dateData.isoDate}-${chauffeur}-${Math.random().toString(36).substr(2, 9)}`,
        chauffeur,
        driverLabel: `${chauffeur} ${sdv}`,
        sdv,
        sourceFile,
        date: dateData.isoDate,
        day: dateData.day,
        month: dateData.month,
        year: dateData.year,
        start: cells[startIdx] || "Non renseigne",
        destination: normalizeDestination(cells[destIdx]),
        fuel_cost_cfa: parseNumber(cells[fuelIdx]),
        road_fees_cfa: parseNumber(cells[roadIdx]),
        tonnage,
        total_gross_cfa: parseNumber(cells[grossIdx]),
        total_expense_cfa: parseNumber(cells[fuelIdx]) + parseNumber(cells[roadIdx]),
        total_net_cfa: parseNumber(cells[netIdx]),
        voyages: calculateVoyages(tonnage),
      };
    })
    .filter(Boolean);
}

export function loadSDVFiles(rules) {
  const records = SDV_SOURCES.flatMap((source) => {
    const parsed = parseFileRecords(source, rules);
    console.log(`[CSV Data] ${source.chauffeur}: ${parsed.length} records parsed from ${source.sourceFile}`);
    return parsed;
  }).sort((a, b) => a.date.localeCompare(b.date));

  return {
    records,
    stats: SDV_SOURCES.map((s) => ({
      chauffeur: s.chauffeur,
      sdv: s.sdv,
      count: records.filter((r) => r.chauffeur === s.chauffeur).length,
    })),
  };
}

export function filterData(records, filters) {
  const {
    chauffeur = ALL_CHAUFFEURS,
    month = ALL_MONTHS,
    year = "",
    destination = ALL_DESTINATIONS,
    dateDebut = "",
    dateFin = "",
  } = filters;

  return records.filter((record) => {
    const chauffeurMatch = chauffeur === ALL_CHAUFFEURS || record.driverLabel === chauffeur;
    const monthMatch = month === ALL_MONTHS || record.month === Number(month);
    const yearMatch = !year || String(record.year) === String(year);
    const destinationMatch = destination === ALL_DESTINATIONS || record.destination === destination;
    const startMatch = !dateDebut || record.date >= dateDebut;
    const endMatch = !dateFin || record.date <= dateFin;

    return chauffeurMatch && monthMatch && yearMatch && destinationMatch && startMatch && endMatch;
  });
}

export function formatCurrency(value) {
  return `${currencyFormatter.format(Math.round(value || 0))} CFA`;
}

export function formatTonnage(value) {
  return `${tonnageFormatter.format(value || 0)} t`;
}

export function formatCompactNumber(value) {
  return currencyFormatter.format(Math.round(value || 0));
}

export function formatPercent(value) {
  return percentFormatter.format(Number.isFinite(value) ? value : 0);
}

export function formatDate(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatShortDate(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}

export function getDateBounds(records) {
  if (!records.length) {
    return { min: "", max: "" };
  }

  return {
    min: records[0].date,
    max: records[records.length - 1].date,
  };
}

export function getChauffeurOptions() {
  return [ALL_CHAUFFEURS, ...SDV_SOURCES.map((source) => `${source.chauffeur} ${source.sdv}`)];
}

export function getMonthOptions(records) {
  const months = [...new Set(records.map((record) => record.month))].sort((left, right) => left - right);
  return [
    { value: ALL_MONTHS, label: ALL_MONTHS },
    ...months.map((month) => ({ value: String(month), label: MONTH_LABELS[month - 1] ?? `Mois ${month}` })),
  ];
}

export function getYearOptions(records = []) {
  const currentYear = new Date().getFullYear();
  const years = new Set([String(currentYear), "2025"]);
  if (records && Array.isArray(records)) {
    records.forEach(r => {
      if (r.year) years.add(String(r.year));
    });
  }
  return [...years].sort();
}

export function getDestinations(records) {
  return [ALL_DESTINATIONS, ...new Set(records.map((record) => record.destination))];
}

function getPieData(records) {
  const counts = records.reduce(
    (accumulator, record) => {
      const key = record.destination === "San Pedro" ? "sanPedro" : record.destination === "Abidjan" ? "abidjan" : "other";
      accumulator[key] += 1;
      return accumulator;
    },
    { sanPedro: 0, abidjan: 0, other: 0 },
  );

  const segments = [
    { name: "San Pedro", value: counts.sanPedro, fill: "#0f9b8e" },
    { name: "Abidjan", value: counts.abidjan, fill: "#f97316" },
  ];

  if (counts.other > 0) {
    segments.push({ name: "Autres", value: counts.other, fill: "#94a3b8" });
  }

  return segments.filter((segment) => segment.value > 0);
}

export function getDashboardMetrics(records) {
  const totalRevenue = records.reduce((sum, record) => sum + (record.total_gross_cfa || record.totalGrossCFA || 0), 0);
  const totalCosts = records.reduce((sum, record) => sum + (record.total_expense_cfa || record.totalExpense || 0), 0);
  const totalProfit = records.reduce((sum, record) => sum + (record.total_net_cfa || record.totalNetCFA || 0), 0);
  const totalTonnage = records.reduce((sum, record) => sum + (record.tonnage || 0), 0);
  const totalVoyages = records.reduce((sum, record) => sum + (record.voyages || 0), 0);
  const totalShipments = records.length;
  const averageTonnage = totalShipments ? totalTonnage / totalShipments : 0;
  const activeDays = new Set(
    records
      .filter((record) => (record.total_gross_cfa || record.totalGrossCFA) > 0 || (record.total_expense_cfa || record.totalExpense) > 0 || record.tonnage > 0)
      .map((record) => record.date),
  ).size;
  const profitableTrips = records.filter((record) => (record.total_net_cfa || record.totalNetCFA) > 0).length;
  const profitMargin = totalRevenue > 0 ? totalProfit / totalRevenue : 0;
  const mostProfitableDay = records.reduce((best, record) => {
    const net = record.total_net_cfa || record.totalNetCFA || 0;
    const bestNet = best ? (best.total_net_cfa || best.totalNetCFA || 0) : -Infinity;
    if (!best || net > bestNet) {
      return record;
    }

    return best;
  }, null);

  return {
    totalRevenue,
    totalCosts,
    totalProfit,
    totalTonnage,
    totalVoyages,
    totalShipments,
    averageTonnage,
    activeDays,
    profitableTrips,
    profitMargin,
    mostProfitableDay,
    profitLineData: records.map((record) => ({
      date: formatShortDate(record.date),
      isoDate: record.date,
      profit: record.total_net_cfa || record.totalNetCFA || 0,
      driverLabel: record.driverLabel,
    })),
    revenueExpenseData: records.map((record) => ({
      date: formatShortDate(record.date),
      isoDate: record.date,
      revenue: record.total_gross_cfa || record.totalGrossCFA || 0,
      expense: record.total_expense_cfa || record.totalExpense || 0,
      driverLabel: record.driverLabel,
    })),
    destinationPieData: getPieData(records),
  };
}

export function getLogisticsReport(records) {
  const stats = {};

  records.forEach((record) => {
    const key = `${record.driverLabel}-${record.month}-${record.year}`;
    if (!stats[key]) {
      stats[key] = {
        chauffeur: record.driverLabel,
        month: record.month,
        year: record.year,
        monthLabel: MONTH_LABELS[record.month - 1],
        tonnage: 0,
        voyages: 0,
      };
    }
    stats[key].tonnage += record.tonnage;
    stats[key].voyages += record.voyages || 0;
  });

  return Object.values(stats).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    if (a.chauffeur !== b.chauffeur) {
      return a.chauffeur.localeCompare(b.chauffeur);
    }
    return a.month - b.month;
  });
}

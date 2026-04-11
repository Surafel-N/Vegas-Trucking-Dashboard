import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "./ChartCard";
import type { DashboardSummary } from "../utils/types";

type MonthlyComparison = Record<number, { total: number }>;

type ChartsProps = {
  dashboardData: DashboardSummary;
  monthlyComparison: MonthlyComparison;
  formatCurrency: (value: number) => string;
};

function axisCurrency(value: number) {
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }

  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K`;
  }

  return `${value}`;
}

const tooltipStyle = {
  borderRadius: "18px",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 25px 60px -40px rgba(0, 0, 0, 0.98)",
  backgroundColor: "rgba(18,18,18,0.97)",
  color: "#f5f5f5",
};

export function Charts({ dashboardData, monthlyComparison, formatCurrency }: ChartsProps) {
  const driverChartData = dashboardData.byDriver.map((driver) => ({
    chauffeur: driver.chauffeur,
    total: driver.totalExpense,
  }));

  const monthlyData = Object.entries(monthlyComparison).map(([month, value]) => ({
    month: Number(month),
    total: value.total,
  }));

  const expenseSplit = [
    { name: "Fuel", value: dashboardData.global.totalFuel, fill: "#61d2c0" },
    { name: "Road Fees", value: dashboardData.global.totalRoadFees, fill: "#cf5d56" },
  ];

  return (
    <section className="grid gap-6 xl:grid-cols-[1.1fr,1fr]">
      <ChartCard title="Depenses par chauffeur" description="BarChart des depenses totales par chauffeur sur filteredData.">
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={driverChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey="chauffeur" tickLine={false} axisLine={false} tick={{ fill: "rgba(255,255,255,0.42)", fontSize: 12 }} />
              <YAxis tickFormatter={axisCurrency} tickLine={false} axisLine={false} tick={{ fill: "rgba(255,255,255,0.42)", fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="total" name="Depenses" fill="#cf5d56" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="Repartition des depenses" description="PieChart fuel vs road fees sur la selection active.">
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={expenseSplit} dataKey="value" nameKey="name" innerRadius={72} outerRadius={110} paddingAngle={4}>
                {expenseSplit.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(value: number, name: string) => [formatCurrency(value), name]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard
        title="Depenses par mois"
        description="LineChart de comparaison mensuelle des depenses, mois 1 a 12."
        className="xl:col-span-2"
      >
        <div className="grid gap-6 xl:grid-cols-[1.35fr,0.65fr]">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "rgba(255,255,255,0.42)", fontSize: 12 }} />
                <YAxis tickFormatter={axisCurrency} tickLine={false} axisLine={false} tick={{ fill: "rgba(255,255,255,0.42)", fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Depenses mensuelles"
                  stroke="#cf5d56"
                  strokeWidth={3}
                  dot={{ r: 3, fill: "#cf5d56" }}
                  activeDot={{ r: 5, fill: "#cf5d56", stroke: "#ffffff", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-hidden rounded-[24px] border border-white/8 bg-[#0f0f0f]">
            <table className="min-w-full">
              <thead className="bg-black/50 text-left text-xs uppercase tracking-[0.18em] text-white/42">
                <tr>
                  <th className="px-4 py-4 font-medium">Mois</th>
                  <th className="px-4 py-4 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="bg-transparent text-sm text-white/72">
                {monthlyData.map((row) => (
                  <tr key={row.month} className="border-t border-white/6">
                    <td className="px-4 py-3 font-medium text-white">{row.month}</td>
                    <td className="px-4 py-3">{formatCurrency(row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </ChartCard>
    </section>
  );
}

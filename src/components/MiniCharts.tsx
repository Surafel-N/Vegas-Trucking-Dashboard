import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  Cell
} from 'recharts';
import { useMemo } from 'react';
import { BarChart3, LineChart as LineIcon } from 'lucide-react';

type MiniChartsProps = {
  records: any[];
};

export function MiniCharts({ records }: MiniChartsProps) {
  const tonnageData = useMemo(() => {
    const drivers = ["AMARA", "BRAHIMA", "SORO"];
    return drivers.map(d => {
      const total = records
        .filter(r => r.chauffeur === d)
        .reduce((s, r) => s + (r.tonnage || 0), 0);
      return { name: d, tonnage: Math.round(total) };
    });
  }, [records]);

  const revenueTrendData = useMemo(() => {
    // Get last 7 days of activity
    const last7Days = [...new Set(records.map(r => r.date))].sort().slice(-7);
    return last7Days.map(date => {
      const dayTotal = records
        .filter(r => r.date === date)
        .reduce((s, r) => s + (r.tonnage * 8000), 0);
      return { 
        date: new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }), 
        revenue: dayTotal 
      };
    });
  }, [records]);

  const COLORS = ['#61d2c0', '#ff8f84', '#ffaf66'];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full min-h-[250px]">
      {/* Tonnage by Driver */}
      <div className="panel-enter rounded-2xl md:rounded-[30px] border border-white/5 bg-[#181818] p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="size-3.5 text-[#61d2c0]" />
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/40">Tonnage par Chauffeur</h4>
        </div>
        <div className="flex-1 min-h-[150px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tonnageData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px' }}
                itemStyle={{ color: '#fff' }}
              />
              <Bar dataKey="tonnage" radius={[4, 4, 0, 0]} barSize={30}>
                {tonnageData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue Trend */}
      <div className="panel-enter rounded-2xl md:rounded-[30px] border border-white/5 bg-[#181818] p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <LineIcon className="size-3.5 text-[#cf5d56]" />
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/40">Tendance Revenus (7j)</h4>
        </div>
        <div className="flex-1 min-h-[150px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={revenueTrendData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px' }}
                itemStyle={{ color: '#fff' }}
              />
              <Line type="monotone" dataKey="revenue" stroke="#cf5d56" strokeWidth={3} dot={{ r: 4, fill: '#cf5d56', strokeWidth: 0 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

'use client';

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

const TYPE_COLORS: Record<string, string> = {
  INVOICE:     '#6366f1',
  CERTIFICATE: '#10b981',
  REPORT:      '#f59e0b',
  UNKNOWN:     '#94a3b8',
};

type Props = {
  data: { type: string; count: number }[];
};

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700">{name.charAt(0) + name.slice(1).toLowerCase()}</p>
      <p className="text-slate-500">{value} document{value !== 1 ? 's' : ''}</p>
    </div>
  );
}

export default function DocumentsByTypeChart({ data }: Props) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="bg-white rounded-lg shadow-sm ring-1 ring-slate-900/5 p-5">
      <p className="text-sm font-medium text-slate-700 mb-4">By Document Type</p>
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-sm text-slate-400">No data yet.</div>
      ) : (
        <div className="flex items-center gap-4">
          <div className="shrink-0">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {data.map((entry, i) => (
                    <Cell key={i} fill={TYPE_COLORS[entry.type] ?? '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2">
            {data.map((entry) => {
              const pct = total > 0 ? Math.round((entry.count / total) * 100) : 0;
              const color = TYPE_COLORS[entry.type] ?? '#94a3b8';
              return (
                <div key={entry.type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-xs text-slate-600 truncate capitalize">
                      {entry.type.charAt(0) + entry.type.slice(1).toLowerCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-xs font-medium text-slate-800">{entry.count}</span>
                    <span className="text-[10px] text-slate-400 w-7 text-right">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

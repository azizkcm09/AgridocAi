'use client';

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';

const STATUS_COLORS: Record<string, string> = {
  PENDING:         '#cbd5e1',
  PROCESSING:      '#6366f1',
  REVIEW_REQUIRED: '#f59e0b',
  VALIDATED:       '#10b981',
  REJECTED:        '#f87171',
  ERROR:           '#ef4444',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING:         'Pending',
  PROCESSING:      'Processing',
  REVIEW_REQUIRED: 'Review',
  VALIDATED:       'Validated',
  REJECTED:        'Rejected',
  ERROR:           'Error',
};

type Props = {
  data: { status: string; count: number }[];
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700 mb-0.5">{label}</p>
      <p className="text-slate-600">{payload[0].value} document{payload[0].value !== 1 ? 's' : ''}</p>
    </div>
  );
}

export default function DocumentsByStatusChart({ data }: Props) {
  const formatted = data.map((d) => ({
    ...d,
    label: STATUS_LABELS[d.status] ?? d.status,
    fill: STATUS_COLORS[d.status] ?? '#94a3b8',
  }));

  return (
    <div className="bg-white rounded-lg shadow-sm ring-1 ring-slate-900/5 p-5">
      <p className="text-sm font-medium text-slate-700 mb-4">By Status</p>
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-sm text-slate-400">No data yet.</div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={formatted} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
            <Bar dataKey="count" name="Documents" radius={[3, 3, 0, 0]} maxBarSize={48}>
              {formatted.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

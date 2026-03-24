'use client';

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#9ca3af',
  PROCESSING: '#3b82f6',
  REVIEW_REQUIRED: '#f59e0b',
  VALIDATED: '#10b981',
  REJECTED: '#ef4444',
  ERROR: '#dc2626',
};

type Props = {
  data: { status: string; count: number }[];
};

export default function DocumentsByStatusChart({ data }: Props) {
  const formatted = data.map((d) => ({
    ...d,
    label: d.status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
    fill: STATUS_COLORS[d.status] ?? '#6b7280',
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <p className="text-sm font-medium text-gray-700 mb-4">By Status</p>
      {data.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No data yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={formatted}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#9ca3af" />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#9ca3af" />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
            <Bar dataKey="count" name="Documents" radius={[4, 4, 0, 0]}>
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

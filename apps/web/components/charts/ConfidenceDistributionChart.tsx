'use client';

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';

const BUCKET_COLORS = ['#ef4444', '#f59e0b', '#eab308', '#22c55e', '#10b981'];

type Props = {
  data: { bucket: string; count: number }[];
};

export default function ConfidenceDistributionChart({ data }: Props) {
  const ordered = ['0-20', '20-40', '40-60', '60-80', '80-100'];
  const filled = ordered.map((bucket, i) => ({
    bucket: `${bucket}%`,
    count: data.find((d) => d.bucket === bucket)?.count ?? 0,
    fill: BUCKET_COLORS[i],
  }));

  return (
    <div className="bg-white rounded-lg shadow-sm ring-1 ring-slate-900/5 p-5">
      <p className="text-sm font-medium text-slate-700 mb-4">Confidence Distribution</p>
      {data.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">No data yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={filled}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="bucket" tick={{ fontSize: 11 }} stroke="#94a3b8" />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#94a3b8" />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                padding: '8px 12px',
              }}
            />
            <Bar dataKey="count" name="Documents" radius={[4, 4, 0, 0]}>
              {filled.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

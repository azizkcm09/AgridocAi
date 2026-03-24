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
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Confidence Distribution</p>
      {data.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No data yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={filled}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="bucket" tick={{ fontSize: 11 }} stroke="#9ca3af" />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#9ca3af" />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
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

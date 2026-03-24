'use client';

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

type Props = {
  data: { date: string; count: number }[];
};

export default function DocumentsOverTimeChart({ data }: Props) {
  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Documents Over Time</p>
      {data.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No data yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={formatted}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#9ca3af" />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#9ca3af" />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
              labelStyle={{ fontWeight: 600 }}
            />
            <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Documents" />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

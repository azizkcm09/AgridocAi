'use client';

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

type Props = {
  data: { type: string; count: number }[];
};

export default function DocumentsByTypeChart({ data }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <p className="text-sm font-medium text-gray-700 mb-4">By Document Type</p>
      {data.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No data yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="type"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11 }}
              formatter={(value: string) => value.charAt(0) + value.slice(1).toLowerCase()}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

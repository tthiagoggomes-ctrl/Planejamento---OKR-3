"use client";

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';

interface ChartData {
  name: string;
  value: number;
  color: string;
}

interface StatusDistributionChartProps {
  title: string;
  data: ChartData[];
}

const StatusDistributionChart: React.FC<StatusDistributionChartProps> = ({ title, data }) => {
  return (
    <Card className="h-full">
      <CardContent className="flex flex-col items-center justify-center p-4 h-full">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">Nenhum dado disponível para o gráfico.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default StatusDistributionChart;
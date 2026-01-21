import React, { useMemo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { useTheme } from '../contexts/ThemeContext';

interface Receipt {
    id: number;
    dateEnd: string | null;
    profit: number;
    costLabor: number;
    executorProfit: number;
    executorName: string;
}

interface ProfitChartProps {
    receipts: Receipt[];
    groupBy: 'day' | 'week' | 'month';
}

export const ProfitChart: React.FC<ProfitChartProps> = ({ receipts, groupBy }) => {
    const { currentTheme } = useTheme();
    const isLight = currentTheme.type === 'light';

    const sortedData = useMemo(() => {
        const dataMap = new Map<string, any>();

        receipts.forEach(r => {
            if (!r.dateEnd) return;
            const d = new Date(r.dateEnd);

            let key: string;
            let label: string;
            let sortDate: Date;

            if (groupBy === 'day') {
                // Group by day
                key = d.toISOString().split('T')[0];
                label = d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' });
                sortDate = new Date(key);
                sortDate.setHours(0, 0, 0, 0);
            } else if (groupBy === 'week') {
                // Group by week (Monday)
                const day = d.getDay();
                const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
                const monday = new Date(d.setDate(diff));
                monday.setHours(0, 0, 0, 0);
                key = monday.toISOString().split('T')[0];
                label = `Тиждень ${monday.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' })}`;
                sortDate = monday;
            } else {
                // Group by month
                const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
                key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                label = d.toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' });
                sortDate = firstDay;
            }

            if (!dataMap.has(key)) {
                dataMap.set(key, {
                    rawDate: sortDate,
                    date: label,
                    profit: 0,
                    labor: 0,
                    service: 0,
                    total: 0
                });
            }

            const item = dataMap.get(key);
            item.profit += r.profit || 0;
            item.labor += r.costLabor || 0;
            item.service += (r.profit || 0) + (r.costLabor || 0) - (r.executorProfit || 0);
            item.total += (r.profit || 0) + (r.costLabor || 0);
        });

        return Array.from(dataMap.values())
            .sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());
    }, [receipts, groupBy]);

    const textColor = isLight ? '#1e293b' : '#f1f5f9';
    const gridColor = isLight ? '#e2e8f0' : '#334155';

    return (
        <div className="w-full h-[300px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sortedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis
                        dataKey="date"
                        stroke={textColor}
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        stroke={textColor}
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value} ₴`}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: isLight ? '#fff' : '#1e293b',
                            border: `1px solid ${gridColor}`,
                            borderRadius: '8px',
                            color: textColor
                        }}
                        itemStyle={{ fontSize: '12px' }}
                    />
                    <Legend iconType="circle" />
                    <Line
                        type="monotone"
                        dataKey="service"
                        name="Чистий прибуток"
                        stroke="#10b981"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#10b981' }}
                        activeDot={{ r: 6 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

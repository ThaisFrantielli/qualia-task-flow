import { Card, Text, Metric } from '@tremor/react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface DREKPICardProps {
    title: string;
    value: number;
    sparklineData: Array<{ value: number }>;
    format?: 'currency' | 'percentage';
    colorScheme?: 'green' | 'red' | 'blue' | 'amber';
}

const colorMap = {
    green: { bg: 'bg-emerald-50', text: 'text-emerald-600', line: '#10b981', decoration: 'emerald' },
    red: { bg: 'bg-red-50', text: 'text-red-600', line: '#ef4444', decoration: 'rose' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', line: '#3b82f6', decoration: 'blue' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', line: '#f59e0b', decoration: 'amber' }
};

export default function DREKPICard({
    title,
    value,
    sparklineData,
    format = 'currency',
    colorScheme = 'blue'
}: DREKPICardProps) {
    const colors = colorMap[colorScheme];

    const formattedValue = format === 'percentage'
        ? `${value.toFixed(1)}%`
        : new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);

    // Calculate trend
    const trend = sparklineData.length >= 2
        ? sparklineData[sparklineData.length - 1].value - sparklineData[sparklineData.length - 2].value
        : 0;

    const TrendIcon = trend >= 0 ? TrendingUp : TrendingDown;
    const trendColor = trend >= 0 ? 'text-emerald-600' : 'text-red-600';

    return (
        <Card decoration="top" decorationColor={colors.decoration as any}>
            <div className="flex justify-between items-start mb-2">
                <Text className="text-slate-600">{title}</Text>
                {sparklineData.length >= 2 && (
                    <TrendIcon className={`w-4 h-4 ${trendColor}`} />
                )}
            </div>

            <Metric className={`mb-3 ${value < 0 ? 'text-red-600' : ''}`}>
                {formattedValue}
            </Metric>

            {sparklineData.length > 1 && (
                <div className="h-12 -mx-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={sparklineData}>
                            <Line
                                type="monotone"
                                dataKey="value"
                                stroke={colors.line}
                                strokeWidth={2}
                                dot={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </Card>
    );
}

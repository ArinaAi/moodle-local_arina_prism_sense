import React, { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import type { DonutSegment } from '../../config/mockData';

interface DonutChartProps {
    data: DonutSegment[];
}

export const DonutChart: React.FC<DonutChartProps> = ({ data }) => {
    const [hov, setHov] = useState<number | null>(null);
    const total = data.reduce((a, b) => a + b.value, 0);

    return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ width: '100%', height: 220 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius="60%"
                            outerRadius="80%"
                            paddingAngle={2}
                            dataKey="value"
                            startAngle={90}
                            endAngle={-270}
                            animationBegin={200}
                            animationDuration={600}
                            onMouseEnter={(_, i) => setHov(i)}
                            onMouseLeave={() => setHov(null)}
                        >
                            {data.map((e, i) => (
                                <Cell
                                    key={e.name}
                                    fill={e.color}
                                    stroke="none"
                                    opacity={hov !== null && hov !== i ? 0.5 : 1}
                                    style={{
                                        filter: hov === i ? 'brightness(1.12)' : 'none',
                                        transition: 'all 0.2s',
                                    }}
                                />
                            ))}
                        </Pie>
                        <RechartsTooltip
                            content={({ active, payload }) => {
                                if (!active || !payload?.length) { return null; }
                                const d = payload[0].payload as DonutSegment;
                                return (
                                    <div
                                        style={{
                                            background: 'var(--paper)',
                                            border: '1px solid var(--border)',
                                            padding: '8px 12px',
                                            borderRadius: 8,
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                            fontSize: '0.8125rem',
                                        }}
                                    >
                                        <p style={{ fontWeight: 600, marginBottom: 2 }}>{d.name}</p>
                                        <p style={{ color: d.color }}>
                                            {d.value.toLocaleString()} cr · {Math.round((d.value / total) * 100)}%
                                        </p>
                                    </div>
                                );
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap', marginTop: 12 }}>
                {data.map((item, i) => (
                    <div
                        key={item.name}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            opacity: hov !== null && hov !== i ? 0.35 : 1,
                            transition: 'opacity 0.2s',
                            cursor: 'default',
                        }}
                        onMouseEnter={() => setHov(i)}
                        onMouseLeave={() => setHov(null)}
                    >
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: item.color }} />
                        <span style={{ fontSize: '0.8125rem', color: 'var(--ts)' }}>{item.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

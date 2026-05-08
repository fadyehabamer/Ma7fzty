import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, G, Line, Text as SvgText } from 'react-native-svg';

interface BarData {
    label: string;
    value: number;
    color?: string;
}

interface BarChartProps {
    data: BarData[];
    width: number;
    height: number;
    barColor?: string;
    currency?: string;
}

const BarChart: React.FC<BarChartProps> = ({
    data,
    width,
    height,
    barColor = '#4F46E5',
    currency = '',
}) => {
    if (data.length === 0) return null;

    const maxValue = Math.max(...data.map((d) => d.value), 1);
    const padding = { top: 20, right: 16, bottom: 40, left: 12 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const barWidth = Math.min((chartWidth / data.length) * 0.6, 32);
    const gap = (chartWidth - barWidth * data.length) / (data.length + 1);

    return (
        <View style={{ alignItems: 'center' }}>
            <Svg width={width} height={height}>
                {/* Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                    const y = padding.top + chartHeight * (1 - ratio);
                    return (
                        <Line
                            key={ratio}
                            x1={padding.left}
                            y1={y}
                            x2={width - padding.right}
                            y2={y}
                            stroke="#E5E7EB"
                            strokeWidth={1}
                            strokeDasharray={ratio > 0 ? '4,4' : '0'}
                        />
                    );
                })}

                {/* Bars */}
                {data.map((item, index) => {
                    const barHeight = (item.value / maxValue) * chartHeight;
                    const x = padding.left + gap * (index + 1) + barWidth * index;
                    const y = padding.top + chartHeight - barHeight;
                    const radius = Math.min(barWidth / 2, 6);
                    const color = item.color || barColor;

                    return (
                        <G key={index}>
                            {/* Rounded bar using path */}
                            <Rect
                                x={x}
                                y={y}
                                width={barWidth}
                                height={Math.max(barHeight, 2)}
                                rx={radius}
                                ry={radius}
                                fill={color}
                                opacity={0.85}
                            />
                            {/* Value on top */}
                            {item.value > 0 && (
                                <SvgText
                                    x={x + barWidth / 2}
                                    y={y - 6}
                                    fontSize={9}
                                    fill="#6B7280"
                                    textAnchor="middle"
                                >
                                    {item.value >= 1000
                                        ? `${(item.value / 1000).toFixed(1)}k`
                                        : item.value.toFixed(0)}
                                </SvgText>
                            )}
                            {/* Label below */}
                            <SvgText
                                x={x + barWidth / 2}
                                y={height - padding.bottom + 16}
                                fontSize={10}
                                fill="#6B7280"
                                textAnchor="middle"
                            >
                                {item.label}
                            </SvgText>
                        </G>
                    );
                })}
            </Svg>
        </View>
    );
};

export default BarChart;

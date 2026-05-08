import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';

interface AreaChartProps {
    data: { value: number; label: string }[];
    width: number;
    height: number;
    color: string;
}

const AreaChart = ({ data, width, height, color }: AreaChartProps) => {
    if (!data || data.length === 0) return null;

    const padding = 10;
    const labelHeight = 24;
    const chartWidth = width;
    const chartHeight = Math.max(0, height - padding * 2 - labelHeight);

    const values = data.map(d => d.value);
    const maxVal = Math.max(...values, 0);
    let minVal = Math.min(...values);

    if (maxVal === minVal) {
        minVal = 0;
    }

    const span = maxVal - minVal || 1;

    const getX = (index: number) => {
        if (data.length === 1) return chartWidth / 2;
        return (index / (data.length - 1)) * chartWidth;
    };
    
    const getY = (value: number) => {
        return padding + chartHeight - ((value - minVal) / span) * chartHeight;
    };

    let pLine = '';
    let pArea = '';
    const areaBottom = height - labelHeight;

    if (data.length === 1) {
        const y = getY(data[0].value);
        pLine = `M0 ${y} L${chartWidth} ${y}`;
        pArea = `M0 ${y} L${chartWidth} ${y} L${chartWidth} ${areaBottom} L0 ${areaBottom} Z`;
    } else {
        const points = data.map((d, i) => `${getX(i)},${getY(d.value)}`);
        
        // Use straight lines to mimic stock market charts
        pLine = `M ${points[0]} ` + points.slice(1).map(p => `L ${p}`).join(' ');
        
        // Area under the line goes down to the bottom
        pArea = `${pLine} L ${chartWidth},${areaBottom} L 0,${areaBottom} Z`;
    }

    return (
        <View style={{ width, height }}>
            <Svg width={width} height={height}>
                <Defs>
                    <LinearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor={color} stopOpacity="0.4" />
                        <Stop offset="0.8" stopColor={color} stopOpacity="0.01" />
                        <Stop offset="1" stopColor={color} stopOpacity="0" />
                    </LinearGradient>
                </Defs>
                
                {/* Area fill */}
                <Path d={pArea} fill="url(#chartGradient)" />
                
                {/* Line stroke */}
                <Path d={pLine} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                {/* X-axis Labels */}
                {data.map((d, i) => (
                    <SvgText
                        key={i}
                        x={getX(i)}
                        y={height - 5}
                        fill="#888888"
                        fontSize="11"
                        textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}
                    >
                        {d.label}
                    </SvgText>
                ))}
            </Svg>
        </View>
    );
};

export default AreaChart;

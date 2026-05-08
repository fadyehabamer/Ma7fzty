import React from 'react';
import { View } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';

interface PieSlice {
    value: number;
    color: string;
    label?: string;
}

interface PieChartProps {
    data: PieSlice[];
    size: number;
    innerRadius?: number;
    padAngle?: number;
}

const polarToCartesian = (cx: number, cy: number, r: number, angleInDeg: number) => {
    const angleInRad = ((angleInDeg - 90) * Math.PI) / 180;
    return {
        x: cx + r * Math.cos(angleInRad),
        y: cy + r * Math.sin(angleInRad),
    };
};

const createArcPath = (
    cx: number,
    cy: number,
    outerR: number,
    innerR: number,
    startAngle: number,
    endAngle: number,
) => {
    const effectiveEnd = Math.min(endAngle, startAngle + 359.999);
    const largeArc = effectiveEnd - startAngle > 180 ? 1 : 0;

    const outerStart = polarToCartesian(cx, cy, outerR, startAngle);
    const outerEnd = polarToCartesian(cx, cy, outerR, effectiveEnd);
    const innerStart = polarToCartesian(cx, cy, innerR, effectiveEnd);
    const innerEnd = polarToCartesian(cx, cy, innerR, startAngle);

    return [
        `M ${outerStart.x} ${outerStart.y}`,
        `A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
        `L ${innerStart.x} ${innerStart.y}`,
        `A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerEnd.x} ${innerEnd.y}`,
        'Z',
    ].join(' ');
};

const PieChart: React.FC<PieChartProps> = ({
    data,
    size,
    innerRadius = 0,
    padAngle = 2,
}) => {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    if (total === 0) return null;

    const cx = size / 2;
    const cy = size / 2;
    const outerR = size / 2 - 4;
    const innerR = innerRadius;

    let currentAngle = 0;

    const slices = data.map((slice) => {
        const sliceAngle = (slice.value / total) * 360;
        const startAngle = currentAngle + padAngle / 2;
        const endAngle = currentAngle + sliceAngle - padAngle / 2;
        currentAngle += sliceAngle;

        if (endAngle - startAngle <= 0) return null;

        const path = createArcPath(cx, cy, outerR, innerR, startAngle, endAngle);
        return { path, color: slice.color, label: slice.label };
    });

    return (
        <View style={{ alignItems: 'center' }}>
            <Svg width={size} height={size}>
                <G>
                    {slices.map((slice, index) =>
                        slice ? (
                            <Path
                                key={index}
                                d={slice.path}
                                fill={slice.color}
                            />
                        ) : null,
                    )}
                </G>
            </Svg>
        </View>
    );
};

export default PieChart;

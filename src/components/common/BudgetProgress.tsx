import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Layout, Fonts } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { formatCurrency } from '../../utils/i18n';
import { Currency } from '../../types';

interface Props {
    label: string;
    current: number;
    target: number;
    color?: string;
    currency: Currency;
    lang?: string;
}

const BudgetProgress: React.FC<Props> = ({ label, current, target, color, currency, lang = 'en' }) => {
    const { colors } = useTheme();
    const accentColor = color || colors.primary;
    const progress = target > 0 ? Math.min(current / target, 1) : 0;
    const percentage = Math.round(progress * 100);
    const isOver = current > target && target > 0;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
                <Text style={[styles.amount, isOver && { color: colors.danger }]}>
                    <Text style={{ color: isOver ? colors.danger : colors.text }}>{formatCurrency(current, currency, lang)}</Text>
                    <Text style={[styles.target, { color: colors.textSecondary }]}> / {formatCurrency(target, currency, lang)}</Text>
                </Text>
            </View>
            <View style={[styles.trackOuter, { backgroundColor: colors.border }]}>
                <View style={[styles.trackInner, { width: `${Math.min(percentage, 100)}%`, backgroundColor: isOver ? colors.danger : accentColor }]} />
            </View>
            <Text style={[styles.percentText, { color: isOver ? colors.danger : colors.textSecondary }]}>
                {percentage}%{isOver ? ' — Over budget!' : ' used'}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { marginBottom: Layout.spacing.md },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    label: { fontSize: 14, fontFamily: Fonts.semiBold },
    amount: { fontSize: 14, fontFamily: Fonts.bold },
    target: { fontFamily: Fonts.regular },
    trackOuter: { height: 8, borderRadius: 4, overflow: 'hidden' },
    trackInner: { height: '100%', borderRadius: 4 },
    percentText: { fontSize: 12, fontFamily: Fonts.regular, marginTop: 4 },
});

export default BudgetProgress;

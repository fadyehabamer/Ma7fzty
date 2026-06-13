import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { Layout, Fonts, ThemeColors } from '../../constants/theme';
import { Transaction, Category } from '../../types';
import { t, isRTL, getFlexDirection, formatCurrency } from '../../utils/i18n';
import AppIcon from './AppIcon';

interface Props {
    transactions: Transaction[];
    categories: Category[];
    currency: any;
    lang: string;
    colors: ThemeColors;
    month: Date;
    fontScale?: number;
}

const sumExpense = (txs: Transaction[]) =>
    txs.reduce((s, tx) => (tx.type === 'expense' ? s + tx.amount : s), 0);

// A small "what changed this month" summary: a headline comparison vs last month,
// plus the month's total spend, average per day, and top spending category.
const InsightsCard = ({ transactions, categories, currency, lang, colors, month, fontScale = 1 }: Props) => {
    const rtl = isRTL(lang);

    const data = useMemo(() => {
        const m = dayjs(month);
        const mStart = m.startOf('month').valueOf();
        const mEnd = m.endOf('month').valueOf();
        const pStart = m.subtract(1, 'month').startOf('month').valueOf();
        const pEnd = m.subtract(1, 'month').endOf('month').valueOf();

        const inRange = (s: number, e: number) => transactions.filter((tx) => tx.date >= s && tx.date <= e);
        const thisTx = inRange(mStart, mEnd);
        const lastTx = inRange(pStart, pEnd);

        const thisSpend = sumExpense(thisTx);
        const lastSpend = sumExpense(lastTx);

        // Top category this month
        const byCat: Record<string, number> = {};
        thisTx.forEach((tx) => { if (tx.type === 'expense') byCat[tx.categoryId] = (byCat[tx.categoryId] || 0) + tx.amount; });
        let topCatId: string | null = null;
        let topCatSum = 0;
        Object.entries(byCat).forEach(([id, sum]) => { if (sum > topCatSum) { topCatSum = sum; topCatId = id; } });
        const topCatLast = topCatId
            ? lastTx.reduce((s, tx) => (tx.type === 'expense' && tx.categoryId === topCatId ? s + tx.amount : s), 0)
            : 0;

        // Average per day — elapsed days for the current month, full month otherwise
        const isCurrentMonth = m.isSame(dayjs(), 'month');
        const days = Math.max(1, isCurrentMonth ? dayjs().date() : m.daysInMonth());
        const avgPerDay = thisSpend / days;

        return { thisSpend, lastSpend, topCatId, topCatSum, topCatLast, avgPerDay };
    }, [transactions, month]);

    if (data.thisSpend <= 0) return null;

    const topCat = data.topCatId ? categories.find((c) => c.id === data.topCatId) : null;
    const topCatName = topCat?.name ?? '—';

    // Build the headline: prefer a category-specific change, fall back to overall.
    const pct = (cur: number, prev: number) => Math.round(((cur - prev) / prev) * 100);
    let headlineKey = 'firstMonthTracking';
    let headlineValue: number | null = null;
    let headlineCat = '';

    if (topCat && data.topCatLast > 0) {
        const p = pct(data.topCatSum, data.topCatLast);
        if (Math.abs(p) >= 5) {
            headlineKey = p > 0 ? 'spentMoreOn' : 'spentLessOn';
            headlineValue = Math.abs(p);
            headlineCat = topCatName;
        }
    }
    if (headlineValue === null && data.lastSpend > 0) {
        const p = pct(data.thisSpend, data.lastSpend);
        if (Math.abs(p) >= 5) {
            headlineKey = p > 0 ? 'spentMoreOverall' : 'spentLessOverall';
            headlineValue = Math.abs(p);
        } else {
            headlineKey = 'spendingSteady';
        }
    }

    const headlineText = t(headlineKey, lang)
        .replace('{pct}', headlineValue != null ? String(headlineValue) : '')
        .replace('{cat}', headlineCat);

    const isUp = headlineKey === 'spentMoreOn' || headlineKey === 'spentMoreOverall';
    const isDown = headlineKey === 'spentLessOn' || headlineKey === 'spentLessOverall';
    const headlineIcon = isUp ? 'trending-up' : isDown ? 'trending-down' : headlineKey === 'spendingSteady' ? 'remove-outline' : 'sparkles';
    const headlineColor = isUp ? colors.danger : isDown ? colors.success : colors.primary;

    return (
        <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={[styles.header, { flexDirection: getFlexDirection(lang) }]}>
                <Ionicons name="bulb-outline" size={15} color={colors.primary} />
                <Text style={[styles.headerText, { color: colors.textSecondary, fontSize: 12 * fontScale }]}>{t('insights', lang).toUpperCase()}</Text>
            </View>

            <View style={[styles.headline, { flexDirection: getFlexDirection(lang) }]}>
                <View style={[styles.headlineIcon, { backgroundColor: headlineColor + '1A' }]}>
                    <Ionicons name={headlineIcon as any} size={16} color={headlineColor} />
                </View>
                <Text style={[styles.headlineText, { color: colors.text, fontSize: 14 * fontScale }, rtl && { textAlign: 'right' }]}>{headlineText}</Text>
            </View>

            <View style={[styles.statsRow, { backgroundColor: colors.border }, { flexDirection: getFlexDirection(lang) }]}>
                <View style={[styles.stat, { backgroundColor: colors.card }]}>
                    <Text style={[styles.statLabel, { color: colors.textSecondary, fontSize: 11 * fontScale }]} numberOfLines={1}>{t('thisMonthSpend', lang)}</Text>
                    <Text style={[styles.statValue, { color: colors.text, fontSize: 14 * fontScale }]} numberOfLines={1}>{formatCurrency(data.thisSpend, currency, lang)}</Text>
                </View>
                <View style={[styles.stat, { backgroundColor: colors.card }]}>
                    <Text style={[styles.statLabel, { color: colors.textSecondary, fontSize: 11 * fontScale }]} numberOfLines={1}>{t('avgPerDay', lang)}</Text>
                    <Text style={[styles.statValue, { color: colors.text, fontSize: 14 * fontScale }]} numberOfLines={1}>{formatCurrency(data.avgPerDay, currency, lang)}</Text>
                </View>
                <View style={[styles.stat, { backgroundColor: colors.card }]}>
                    <Text style={[styles.statLabel, { color: colors.textSecondary, fontSize: 11 * fontScale }]} numberOfLines={1}>{t('topCategoryLabel', lang)}</Text>
                    <View style={[styles.topCatRow, { flexDirection: getFlexDirection(lang) }]}>
                        {topCat && <AppIcon name={topCat.emoji} size={13} color={colors.text} />}
                        <Text style={[styles.statValue, { color: colors.text, fontSize: 14 * fontScale }]} numberOfLines={1}>{topCatName}</Text>
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: { borderRadius: Layout.borderRadius.md, padding: Layout.spacing.md, marginBottom: Layout.spacing.md, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 2 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Layout.spacing.sm },
    headerText: { fontFamily: Fonts.semiBold, fontSize: 12, letterSpacing: 1 },

    headline: { flexDirection: 'row', alignItems: 'center', gap: Layout.spacing.sm, marginBottom: Layout.spacing.md },
    headlineIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    headlineText: { flex: 1, fontFamily: Fonts.semiBold, fontSize: 14, lineHeight: 20 },

    // The border-colored container shows thin dividers between the stat cells.
    statsRow: { flexDirection: 'row', borderRadius: Layout.borderRadius.sm, gap: 1, overflow: 'hidden' },
    stat: { flex: 1, alignItems: 'center', paddingVertical: Layout.spacing.sm, paddingHorizontal: 4 },
    statLabel: { fontFamily: Fonts.medium, fontSize: 11, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.3 },
    statValue: { fontFamily: Fonts.bold, fontSize: 14 },
    topCatRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});

export default InsightsCard;

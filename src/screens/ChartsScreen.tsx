import * as React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import dayjs from 'dayjs';
import { useApp } from '../context/AppContext';
import { Layout, Fonts } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import PieChart from '../components/common/PieChart';
import AreaChart from '../components/common/AreaChart';
import MonthSelector from '../components/common/MonthSelector';
import { t, isRTL, getFlexDirection, formatCurrency } from '../utils/i18n';
import { Ionicons } from '@expo/vector-icons';

const screenWidth = Dimensions.get('window').width;

interface ChartData { x: string; y: number; label: string; emoji: string; color: string; id: string; }

const colorScale = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', '#6366F1', '#3B82F6'];

const ChartsScreen = () => {
    const { state } = useApp();
    const { colors } = useTheme();
    const { transactions, categories, settings } = state;
    const currency = settings.currency;
    const lang = state.settings.language || 'en';
    const fontScale = state.settings.fontScale || 1;
    const rtl = isRTL(lang);
    const [selectedMonth, setSelectedMonth] = React.useState(new Date());
    const [activeTab, setActiveTab] = React.useState<'expenses' | 'income'>('expenses');
    const [viewMode, setViewMode] = React.useState<'month' | 'all'>('month');

    const handlePrevMonth = () => setSelectedMonth((prev) => dayjs(prev).subtract(1, 'month').toDate());
    const handleNextMonth = () => setSelectedMonth((prev) => dayjs(prev).add(1, 'month').toDate());

    const monthStart = dayjs(selectedMonth).startOf('month').valueOf();
    const monthEnd = dayjs(selectedMonth).endOf('month').valueOf();

    const filteredTransactions = React.useMemo(() => {
        if (viewMode === 'all') return transactions;
        return transactions.filter((tx) => tx.date >= monthStart && tx.date <= monthEnd);
    }, [transactions, monthStart, monthEnd, viewMode]);

    const totalIncome = filteredTransactions.filter((tx) => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0);
    const totalExpense = filteredTransactions.filter((tx) => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);

    const categoryData = React.useMemo<ChartData[]>(() => {
        const targetType = activeTab === 'expenses' ? 'expense' : 'income';
        const filtered = filteredTransactions.filter((tx) => tx.type === targetType);
        const total = filtered.reduce((s, tx) => s + tx.amount, 0);
        if (total === 0) return [];
        const grouped = filtered.reduce((acc: Record<string, number>, tx) => {
            acc[tx.categoryId] = (acc[tx.categoryId] || 0) + tx.amount;
            return acc;
        }, {});
        return Object.keys(grouped)
            .map((categoryId, index) => {
                const category = categories.find((c) => c.id === categoryId);
                const amount = grouped[categoryId];
                return {
                    x: category?.name || 'Unknown', y: amount,
                    label: `${((amount / total) * 100).toFixed(0)}%`,
                    emoji: category?.emoji || '?',
                    color: colorScale[index % colorScale.length], id: categoryId,
                };
            })
            .sort((a, b) => b.y - a.y);
    }, [filteredTransactions, categories, activeTab]);

    const pieData = categoryData.map((item, index) => ({
        value: item.y, color: colorScale[index % colorScale.length], label: item.label,
    }));

    const monthlyTrend = React.useMemo(() => {
        const months: { label: string; value: number; color: string }[] = [];
        const monthsToShow = viewMode === 'all' ? 12 : 6;
        for (let i = monthsToShow - 1; i >= 0; i--) {
            const m = dayjs(selectedMonth).subtract(i, 'month');
            const start = m.startOf('month').valueOf();
            const end = m.endOf('month').valueOf();
            const total = transactions.filter((tx) => tx.type === 'expense' && tx.date >= start && tx.date <= end).reduce((s, tx) => s + tx.amount, 0);
            months.push({ label: m.format('MMM'), value: total, color: i === 0 ? colors.primary : colors.primaryLight });
        }
        return months;
    }, [transactions, selectedMonth, colors, viewMode]);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
            <View style={[styles.header, { flexDirection: getFlexDirection(lang) }]}>
                <Text style={[styles.headerTitle, { color: colors.text, fontSize: 24 * fontScale }]}>{t('analytics', lang)}</Text>
            </View>

            {/* Month / All Time Toggle */}
            <View style={styles.viewModeRow}>
                <TouchableOpacity
                    style={[styles.viewModeBtn, viewMode === 'month' && { backgroundColor: colors.primary }]}
                    onPress={() => setViewMode('month')} activeOpacity={0.7}
                >
                    <Text style={[styles.viewModeText, { color: viewMode === 'month' ? '#FFF' : colors.textSecondary, fontSize: 13 * fontScale }]}>
                        {lang === 'ar' ? 'هذا الشهر' : 'This Month'}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.viewModeBtn, viewMode === 'all' && { backgroundColor: colors.primary }]}
                    onPress={() => setViewMode('all')} activeOpacity={0.7}
                >
                    <Text style={[styles.viewModeText, { color: viewMode === 'all' ? '#FFF' : colors.textSecondary, fontSize: 13 * fontScale }]}>
                        {lang === 'ar' ? 'كل الوقت' : 'All Time'}
                    </Text>
                </TouchableOpacity>
            </View>

            {viewMode === 'month' && <MonthSelector currentDate={selectedMonth} onPrev={handlePrevMonth} onNext={handleNextMonth} />}
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Summary */}
                <View style={[styles.summaryRow, { flexDirection: getFlexDirection(lang) }]}>
                    <View style={[styles.summaryBox, { backgroundColor: colors.card, borderLeftColor: colors.success }]}>
                        <Text style={[styles.summaryLabel, { color: colors.textSecondary, fontSize: 12 * fontScale }]}>{t('income', lang)}</Text>
                        <Text style={[styles.summaryValue, { color: colors.success, fontSize: 20 * fontScale }]}>{currency?.symbol}{totalIncome.toLocaleString('en-US', { maximumFractionDigits: 0 })}</Text>
                    </View>
                    <View style={[styles.summaryBox, { backgroundColor: colors.card, borderLeftColor: colors.danger }]}>
                        <Text style={[styles.summaryLabel, { color: colors.textSecondary, fontSize: 12 * fontScale }]}>{t('expenses', lang)}</Text>
                        <Text style={[styles.summaryValue, { color: colors.danger, fontSize: 20 * fontScale }]}>{currency?.symbol}{totalExpense.toLocaleString('en-US', { maximumFractionDigits: 0 })}</Text>
                    </View>
                </View>

                {/* Tabs */}
                <View style={[styles.tabContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <TouchableOpacity style={[styles.tab, activeTab === 'expenses' && { backgroundColor: colors.primary }]} onPress={() => setActiveTab('expenses')}>
                        <Text style={[styles.tabText, { color: colors.textSecondary, fontSize: 14 * fontScale }, activeTab === 'expenses' && styles.activeTabText]}>{t('expenses', lang)}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.tab, activeTab === 'income' && { backgroundColor: colors.primary }]} onPress={() => setActiveTab('income')}>
                        <Text style={[styles.tabText, { color: colors.textSecondary, fontSize: 14 * fontScale }, activeTab === 'income' && styles.activeTabText]}>{t('income', lang)}</Text>
                    </TouchableOpacity>
                </View>

                {/* Pie Chart */}
                <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
                    <Text style={[styles.chartTitle, { color: colors.text, fontSize: 18 * fontScale }]}>
                        {lang === 'ar' ? 'حسب الفئة' : 'By Category'}
                    </Text>
                    {categoryData.length > 0 ? (
                        <View style={{ alignItems: 'center' }}>
                            <PieChart data={pieData} size={screenWidth - 100} innerRadius={55} padAngle={2} />
                            <View style={styles.legendContainer}>
                                {categoryData.map((item, index) => (
                                    <View key={item.id} style={[styles.legendItem, { flexDirection: getFlexDirection(lang) }]}>
                                        <View style={[styles.legendLeft, { flexDirection: getFlexDirection(lang) }]}>
                                            <View style={[styles.dot, { backgroundColor: colorScale[index % colorScale.length] }]} />
                                            <Text style={[styles.legendText, { color: colors.text, fontSize: 14 * fontScale }]}>{item.emoji} {item.x}</Text>
                                        </View>
                                        <View style={styles.legendRight}>
                                            <Text style={[styles.legendPercent, { color: colors.textSecondary, fontSize: 12 * fontScale }]}>{item.label}</Text>
                                            <Text style={[styles.legendAmount, { color: colors.text, fontSize: 14 * fontScale }]}>{formatCurrency(item.y, currency, lang)}</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </View>
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="bar-chart-outline" size={44} color={colors.textSecondary} style={{ marginBottom: Layout.spacing.sm }} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{lang === 'ar' ? 'لا توجد بيانات' : 'No data for this month'}</Text>
                        </View>
                    )}
                </View>

                {/* Trend Chart */}
                <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
                    <Text style={[styles.chartTitle, { color: colors.text, fontSize: 18 * fontScale }]}>{lang === 'ar' ? 'اتجاه المصروفات' : 'Trend'}</Text>
                    {monthlyTrend.some((m) => m.value > 0) ? (
                        <AreaChart data={monthlyTrend} width={screenWidth - 64} height={200} color={colors.primary} />
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{lang === 'ar' ? 'لا يوجد سجل مصروفات' : 'No expense history'}</Text>
                        </View>
                    )}
                </View>

                {/* Top spender */}
                {categoryData.length > 0 && (
                    <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
                        <Text style={[styles.chartTitle, { color: colors.text, fontSize: 18 * fontScale }]}>{lang === 'ar' ? 'أعلى الإنفاق' : 'Top Spending'}</Text>
                        {categoryData.slice(0, 3).map((item, idx) => (
                            <View key={item.id} style={[styles.topItem, { flexDirection: getFlexDirection(lang) }]}>
                                <Text style={[styles.topRank, { color: colors.textSecondary, fontSize: 14 * fontScale }]}>#{idx + 1}</Text>
                                <Text style={[styles.topEmoji, { fontSize: 20 * fontScale }]}>{item.emoji}</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.topName, { color: colors.text, fontSize: 14 * fontScale }]}>{item.x}</Text>
                                    <View style={[styles.topBar, { backgroundColor: colors.border }]}>
                                        <View style={[styles.topBarFill, { width: `${(item.y / categoryData[0].y) * 100}%`, backgroundColor: colorScale[idx % colorScale.length] }]} />
                                    </View>
                                </View>
                                <Text style={[styles.topAmount, { color: colors.text, fontSize: 14 * fontScale }]}>{formatCurrency(item.y, currency, lang)}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: Layout.spacing.lg, paddingTop: Layout.spacing.md },
    headerTitle: { fontFamily: Fonts.bold, fontSize: 24 },
    viewModeRow: { flexDirection: 'row', alignSelf: 'center', marginVertical: Layout.spacing.sm, borderRadius: Layout.borderRadius.sm, overflow: 'hidden' },
    viewModeBtn: { paddingHorizontal: Layout.spacing.md, paddingVertical: 8, borderRadius: Layout.borderRadius.sm },
    viewModeText: { fontFamily: Fonts.semiBold, fontSize: 13 },
    scrollContent: { paddingBottom: 80 },
    summaryRow: { flexDirection: 'row', paddingHorizontal: Layout.spacing.md, gap: Layout.spacing.sm, marginBottom: Layout.spacing.md },
    summaryBox: { flex: 1, borderRadius: Layout.borderRadius.md, padding: Layout.spacing.md, borderLeftWidth: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 2 },
    summaryLabel: { fontFamily: Fonts.medium, fontSize: 12, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
    summaryValue: { fontFamily: Fonts.bold, fontSize: 20 },
    tabContainer: { flexDirection: 'row', marginHorizontal: Layout.spacing.md, marginBottom: Layout.spacing.md, borderRadius: Layout.borderRadius.sm, padding: 4, borderWidth: 1 },
    tab: { flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
    tabText: { fontFamily: Fonts.semiBold, fontSize: 14 },
    activeTabText: { color: '#FFFFFF' },
    chartCard: { marginHorizontal: Layout.spacing.md, marginBottom: Layout.spacing.md, padding: Layout.spacing.md, borderRadius: Layout.borderRadius.md, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 2 },
    chartTitle: { fontFamily: Fonts.bold, fontSize: 18, marginBottom: Layout.spacing.md },
    legendContainer: { width: '100%', marginTop: Layout.spacing.md },
    legendItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingVertical: 4 },
    legendLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    legendRight: { alignItems: 'flex-end' },
    dot: { width: 10, height: 10, borderRadius: 5, marginRight: Layout.spacing.sm },
    legendText: { fontFamily: Fonts.medium, fontSize: 14 },
    legendPercent: { fontFamily: Fonts.regular, fontSize: 12 },
    legendAmount: { fontFamily: Fonts.bold, fontSize: 14 },
    emptyContainer: { height: 160, justifyContent: 'center', alignItems: 'center' },
    emptyEmoji: { fontSize: 40, marginBottom: 8 },
    emptyText: { fontFamily: Fonts.regular, fontSize: 14 },
    topItem: { flexDirection: 'row', alignItems: 'center', marginBottom: Layout.spacing.md, gap: 10 },
    topRank: { fontFamily: Fonts.bold, fontSize: 14, width: 24 },
    topEmoji: { fontSize: 20 },
    topName: { fontFamily: Fonts.semiBold, fontSize: 14, marginBottom: 4 },
    topBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
    topBarFill: { height: '100%', borderRadius: 3 },
    topAmount: { fontFamily: Fonts.bold, fontSize: 14 },
});

export default ChartsScreen;

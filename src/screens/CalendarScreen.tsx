import React, { useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import dayjs from 'dayjs';
import { useApp } from '../context/AppContext';
import { Layout, Fonts } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';
import { t, isRTL, getFlexDirection, getTextAlign, formatCurrency } from '../utils/i18n';
import MonthSelector from '../components/common/MonthSelector';
import CalendarView from '../components/common/CalendarView';
import TransactionItem from '../components/common/TransactionItem';
import TransactionDetailsModal from '../components/common/TransactionDetailsModal';
import { exportToPdf, exportToCsv } from '../utils/exportData';
import { Transaction } from '../types';

const CalendarScreen = () => {
    const { state } = useApp();
    const { colors } = useTheme();
    const lang = state.settings.language || 'en';
    const rtl = isRTL(lang);
    const currency = state.settings.currency || { code: 'USD', symbol: '$', name: 'US Dollar', nameAr: 'دولار أمريكي', flag: '🇺🇸' };
    const [currentDate, setCurrentDate] = useState(new Date());
    const fontScale = state.settings.fontScale || 1;
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [showExport, setShowExport] = useState(false);
    const exportAnim = useRef(new Animated.Value(0)).current;

    const handlePrevMonth = () => setCurrentDate((d) => dayjs(d).subtract(1, 'month').toDate());
    const handleNextMonth = () => setCurrentDate((d) => dayjs(d).add(1, 'month').toDate());

    const monthTransactions = useMemo(() => {
        const start = dayjs(currentDate).startOf('month').valueOf();
        const end = dayjs(currentDate).endOf('month').valueOf();
        return state.transactions.filter((tx) => tx.date >= start && tx.date <= end);
    }, [currentDate, state.transactions]);

    const selectedDayTransactions = useMemo(() => {
        if (!selectedDate) return [];
        const dayStart = dayjs(selectedDate).startOf('day').valueOf();
        const dayEnd = dayjs(selectedDate).endOf('day').valueOf();
        return state.transactions.filter((tx) => tx.date >= dayStart && tx.date <= dayEnd);
    }, [selectedDate, state.transactions]);

    const toggleExport = () => {
        const to = showExport ? 0 : 1;
        Animated.timing(exportAnim, { toValue: to, duration: 200, useNativeDriver: false }).start();
        setShowExport(!showExport);
    };

    const handleExport = async (type: 'pdf' | 'csv') => {
        toggleExport();
        const txs = monthTransactions;
        const cats = state.categories;
        if (type === 'pdf') await exportToPdf(txs, cats, currency, currentDate);
        else await exportToCsv(txs, cats, currency, currentDate);
    };

    const dayIncome = selectedDayTransactions.filter((tx) => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0);
    const dayExpense = selectedDayTransactions.filter((tx) => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);

    // Monthly total for current month
    const monthIncome = monthTransactions.filter((tx) => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0);
    const monthExpense = monthTransactions.filter((tx) => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);

    // Yearly overview - month by month
    const yearlyData = useMemo(() => {
        const year = dayjs(currentDate).year();
        const months: { label: string; shortLabel: string; balance: number; month: number }[] = [];
        for (let m = 0; m < 12; m++) {
            const start = dayjs().year(year).month(m).startOf('month').valueOf();
            const end = dayjs().year(year).month(m).endOf('month').valueOf();
            const monthTxs = state.transactions.filter((tx) => tx.date >= start && tx.date <= end);
            const income = monthTxs.filter((tx) => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0);
            const expense = monthTxs.filter((tx) => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);
            months.push({
                label: dayjs().month(m).format('MMMM'),
                shortLabel: dayjs().month(m).format('MMM'),
                balance: income - expense,
                month: m,
            });
        }
        return months;
    }, [currentDate, state.transactions]);

    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

    const getCategory = (id: string) =>
        state.categories.find((c) => c.id === id) || state.categories[0];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { flexDirection: getFlexDirection(lang), borderBottomColor: colors.border }]}>
                <Text style={[styles.headerTitle, { color: colors.text, fontSize: 22 * fontScale }]}>{t('calendar', lang)}</Text>
                <TouchableOpacity onPress={toggleExport} style={[styles.exportBtn, { backgroundColor: colors.card }]}>
                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                        <Path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke={colors.primary} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                </TouchableOpacity>
            </View>

            {/* Export Dropdown */}
            {showExport && (
                <Animated.View style={[styles.exportDropdown, { backgroundColor: colors.card, borderColor: colors.border, opacity: exportAnim }]}>
                    <TouchableOpacity style={styles.exportOption} onPress={() => handleExport('pdf')}>
                        <Text style={[styles.exportText, { color: colors.text }]}>{t('exportPdf', lang)}</Text>
                    </TouchableOpacity>
                    <View style={[styles.exportDivider, { backgroundColor: colors.border }]} />
                    <TouchableOpacity style={styles.exportOption} onPress={() => handleExport('csv')}>
                        <Text style={[styles.exportText, { color: colors.text }]}>{t('exportCsv', lang)}</Text>
                    </TouchableOpacity>
                </Animated.View>
            )}

            <FlatList
                data={selectedDayTransactions}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    <View>
                        <MonthSelector currentDate={currentDate} onPrev={handlePrevMonth} onNext={handleNextMonth} />
                        <CalendarView
                            currentDate={currentDate}
                            transactions={monthTransactions}
                            currency={currency}
                            onSelectDate={setSelectedDate}
                            selectedDate={selectedDate}
                            lang={lang}
                        />
                        {selectedDate && (
                            <View style={{ paddingHorizontal: Layout.spacing.md }}>
                                <Text style={[styles.dayTitle, { color: colors.text, textAlign: getTextAlign(lang), fontSize: 18 * fontScale }]}>
                                    {dayjs(selectedDate).format('dddd, MMM D')}
                                </Text>
                                {selectedDayTransactions.length > 0 && (
                                    <View style={[styles.daySummary, { flexDirection: getFlexDirection(lang), backgroundColor: colors.card }]}>
                                        <View style={styles.daySumItem}>
                                            <Text style={[styles.daySumLabel, { color: colors.success, fontSize: 12 * fontScale }]}>{t('income', lang)}</Text>
                                            <Text style={[styles.daySumValue, { color: colors.success, fontSize: 18 * fontScale }]}>{formatCurrency(dayIncome, currency, lang)}</Text>
                                        </View>
                                        <View style={[styles.daySumDivider, { backgroundColor: colors.border }]} />
                                        <View style={styles.daySumItem}>
                                            <Text style={[styles.daySumLabel, { color: colors.danger, fontSize: 12 * fontScale }]}>{t('expenses', lang)}</Text>
                                            <Text style={[styles.daySumValue, { color: colors.danger, fontSize: 18 * fontScale }]}>{formatCurrency(-dayExpense, currency, lang)}</Text>
                                        </View>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Yearly Overview Section */}
                        <View style={styles.yearlySection}>
                            <Text style={[styles.yearlyTitle, { color: colors.text, fontSize: 18 * fontScale }]}>
                                {lang === 'ar' ? `نظرة سنوية ${dayjs(currentDate).year()}` : `${dayjs(currentDate).year()} Overview`}
                            </Text>
                            <FlatList
                                data={yearlyData}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                keyExtractor={(item) => item.shortLabel}
                                renderItem={({ item }) => {
                                    const isCurrent = item.month === dayjs(currentDate).month();
                                    return (
                                        <View style={[styles.yearlyCard, { backgroundColor: isCurrent ? colors.primary : colors.card }]}>
                                            <Text style={[styles.yearlyMonth, { color: isCurrent ? '#FFF' : colors.text, fontSize: 12 * fontScale, textAlign: 'center' }]}>{item.shortLabel}</Text>
                                            <Text
                                                style={[styles.yearlyAmount, { color: isCurrent ? '#FFF' : item.balance < 0 ? colors.danger : colors.success, fontSize: 15 * fontScale, textAlign: 'center' }]}
                                                adjustsFontSizeToFit
                                                numberOfLines={1}
                                                minimumFontScale={0.6}
                                            >
                                                {formatCurrency(item.balance, currency, lang, false)}
                                            </Text>
                                        </View>
                                    );
                                }}
                                contentContainerStyle={{ paddingHorizontal: Layout.spacing.md }}
                            />
                        </View>
                    </View>
                }
                renderItem={({ item }) => (
                    <View style={{ paddingHorizontal: Layout.spacing.md }}>
                        <TransactionItem
                            transaction={item}
                            category={getCategory(item.categoryId)}
                            currency={currency}
                            onPress={() => setSelectedTransaction(item)}
                        />
                    </View>
                )}
                ListEmptyComponent={
                    selectedDate ? (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyEmoji}>📭</Text>
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('noTransactions', lang)}</Text>
                        </View>
                    ) : null
                }
                contentContainerStyle={{ paddingBottom: 100 }}
            />

            {/* Transaction Details Modal */}
            <TransactionDetailsModal
                visible={!!selectedTransaction}
                transaction={selectedTransaction}
                category={selectedTransaction ? getCategory(selectedTransaction.categoryId) : null}
                currency={currency}
                onClose={() => setSelectedTransaction(null)}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Layout.spacing.md, paddingVertical: Layout.spacing.sm, borderBottomWidth: 1 },
    headerTitle: { fontFamily: Fonts.bold, fontSize: 22 },
    exportBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    exportDropdown: { position: 'absolute', top: 100, right: Layout.spacing.md, zIndex: 100, borderRadius: Layout.borderRadius.md, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
    exportOption: { paddingVertical: 12, paddingHorizontal: 20 },
    exportText: { fontFamily: Fonts.medium, fontSize: 15 },
    exportDivider: { height: 1 },
    dayTitle: { fontFamily: Fonts.bold, fontSize: 18, marginTop: Layout.spacing.md, marginBottom: Layout.spacing.sm },
    daySummary: { flexDirection: 'row', borderRadius: Layout.borderRadius.md, padding: Layout.spacing.md, marginBottom: Layout.spacing.md, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 2 },
    daySumItem: { flex: 1, alignItems: 'center' },
    daySumLabel: { fontFamily: Fonts.medium, fontSize: 12 },
    daySumValue: { fontFamily: Fonts.bold, fontSize: 18, marginTop: 2 },
    daySumDivider: { width: 1, marginHorizontal: Layout.spacing.sm },
    emptyContainer: { alignItems: 'center', marginTop: Layout.spacing.xl },
    emptyEmoji: { fontSize: 40, marginBottom: Layout.spacing.sm },
    emptyText: { fontFamily: Fonts.medium, fontSize: 15 },
    // Yearly overview styles
    yearlySection: { marginTop: Layout.spacing.md, paddingBottom: Layout.spacing.md },
    yearlyTitle: { fontFamily: Fonts.bold, fontSize: 18, paddingHorizontal: Layout.spacing.md, marginBottom: Layout.spacing.sm },
    yearlyCard: { width: 100, marginRight: Layout.spacing.sm, padding: Layout.spacing.sm, borderRadius: Layout.borderRadius.sm, alignItems: 'center', justifyContent: 'center' },
    yearlyMonth: { fontFamily: Fonts.semiBold, fontSize: 12, marginBottom: 4, textAlign: 'center' },
    yearlyAmount: { fontFamily: Fonts.bold, fontSize: 13, textAlign: 'center' },
});

export default CalendarScreen;

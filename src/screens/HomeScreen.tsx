import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    Alert,
    Modal,
    Pressable,
} from 'react-native';
import dayjs from 'dayjs';
import { useApp } from '../context/AppContext';
import { Layout, Fonts } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';
import SummaryCard from '../components/common/SummaryCard';
import TransactionItem from '../components/common/TransactionItem';
import MonthSelector from '../components/common/MonthSelector';
import BudgetProgress from '../components/common/BudgetProgress';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Transaction } from '../types';
import { t, isRTL, getFlexDirection } from '../utils/i18n';
import { exportToPdf, exportToCsv } from '../utils/exportData';
import TransactionDetailsModal from '../components/common/TransactionDetailsModal';

const HomeScreen = ({ navigation }: any) => {
    const { state, dispatch } = useApp();
    const { colors } = useTheme();
    const { transactions, categories, settings } = state;
    const currency = settings.currency;
    const lang = settings.language || 'en';
    const rtl = isRTL(lang);

    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [viewMode, setViewMode] = useState<'month' | 'all'>('month');
    const prevTxCount = useRef(transactions.length);

    // When a single new transaction is added, jump to its month
    useEffect(() => {
        const diff = transactions.length - prevTxCount.current;
        if (diff === 1 && transactions.length > 0) {
            // The newest transaction is first in the array (prepended in reducer)
            const newest = transactions[0];
            setSelectedMonth(new Date(newest.date));
        }
        prevTxCount.current = transactions.length;
    }, [transactions.length]);

    // Move hooks above the early return to avoid "fewer hooks rendered" error
    const filteredTransactions = useMemo(() => {
        let filtered = transactions;
        if (viewMode === 'month') {
            const monthStart = dayjs(selectedMonth).startOf('month').valueOf();
            const monthEnd = dayjs(selectedMonth).endOf('month').valueOf();
            filtered = transactions.filter(
                (tx) => tx.date >= monthStart && tx.date <= monthEnd
            );
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter((tx) => {
                const cat = categories.find((c) => c.id === tx.categoryId);
                return (
                    cat?.name.toLowerCase().includes(q) ||
                    tx.note?.toLowerCase().includes(q) ||
                    tx.amount.toString().includes(q)
                );
            });
        }
        return filtered.sort((a, b) => b.date - a.date);
    }, [transactions, categories, selectedMonth, searchQuery, viewMode]);

    const { income, expense } = useMemo(() => {
        let pool = transactions;
        if (viewMode === 'month') {
            const monthStart = dayjs(selectedMonth).startOf('month').valueOf();
            const monthEnd = dayjs(selectedMonth).endOf('month').valueOf();
            pool = transactions.filter(
                (tx) => tx.date >= monthStart && tx.date <= monthEnd
            );
        }
        return pool.reduce(
            (acc, tx) => {
                if (tx.type === 'income') acc.income += tx.amount;
                else acc.expense += tx.amount;
                return acc;
            },
            { income: 0, expense: 0 }
        );
    }, [transactions, selectedMonth, viewMode]);

    const handleDeleteTransaction = useCallback(
        (id: string) => {
            Alert.alert(t('deleteTransaction', lang), t('deleteConfirm', lang), [
                { text: t('cancel', lang), style: 'cancel' },
                {
                    text: t('delete', lang),
                    style: 'destructive',
                    onPress: () =>
                        dispatch({ type: 'DELETE_TRANSACTION', payload: id }),
                },
            ]);
        },
        [dispatch, lang]
    );

    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

    const greetingText = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return t('goodMorning', lang);
        if (hour < 18) return t('goodAfternoon', lang);
        return t('goodEvening', lang);
    }, [lang]);

    if (!currency) return null;

    const getCategory = (id: string) =>
        categories.find((c) => c.id === id) || categories[0];

    const handlePrevMonth = () =>
        setSelectedMonth((prev) => dayjs(prev).subtract(1, 'month').toDate());
    const handleNextMonth = () =>
        setSelectedMonth((prev) => dayjs(prev).add(1, 'month').toDate());

    const doExport = async (format: 'pdf' | 'csv', scope: 'month' | 'all') => {
        setShowExportModal(false);
        const monthParam = scope === 'month' ? selectedMonth : undefined;
        try {
            if (format === 'pdf') await exportToPdf(transactions, categories, currency, monthParam);
            else await exportToCsv(transactions, categories, currency, monthParam);
        } catch (e: any) { Alert.alert('Error', e.message || 'Could not export'); }
    };

    const renderTransaction = ({ item }: { item: Transaction }) => (
        <TransactionItem
            transaction={item}
            category={getCategory(item.categoryId)}
            currency={currency}
            onPress={() => setSelectedTransaction(item)}
            onDelete={() => handleDeleteTransaction(item.id)}
        />
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
            {/* Header */}
            <View style={[styles.header, { flexDirection: getFlexDirection(lang) }]}>
                <View>
                    <Text style={[styles.greeting, { color: colors.textSecondary, fontSize: 13 * (state.settings.fontScale || 1) }, rtl && { textAlign: 'right' }]}>
                        {greetingText} 👋
                    </Text>
                    <Text style={[styles.title, { color: colors.text, fontSize: 22 * (state.settings.fontScale || 1) }, rtl && { textAlign: 'right' }]}>
                        {t('myWallet', lang)}
                    </Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={[styles.iconButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => setShowSearch(!showSearch)}
                    >
                        <Text style={{ fontSize: 16 }}>{showSearch ? '✕' : '🔍'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.iconButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => setShowExportModal(true)}
                    >
                        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                            <Path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke={colors.primary} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                    </TouchableOpacity>
                </View>
            </View>

            {showSearch && (
                <View style={styles.searchContainer}>
                    <TextInput
                        style={[styles.searchInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }, rtl && { textAlign: 'right' }]}
                        placeholder={t('searchTransactions', lang)}
                        placeholderTextColor={colors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoFocus
                    />
                </View>
            )}

            {/* Month / All Time Toggle */}
            <View style={styles.toggleRow}>
                <TouchableOpacity
                    style={[styles.toggleBtn, viewMode === 'month' && { backgroundColor: colors.primary }]}
                    onPress={() => setViewMode('month')} activeOpacity={0.7}
                >
                    <Text style={[styles.toggleText, { color: viewMode === 'month' ? '#FFF' : colors.textSecondary, fontSize: 12 * (state.settings.fontScale || 1) }]}>
                        {t('thisMonth', lang)}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.toggleBtn, viewMode === 'all' && { backgroundColor: colors.primary }]}
                    onPress={() => setViewMode('all')} activeOpacity={0.7}
                >
                    <Text style={[styles.toggleText, { color: viewMode === 'all' ? '#FFF' : colors.textSecondary, fontSize: 12 * (state.settings.fontScale || 1) }]}>
                        {t('allTime', lang)}
                    </Text>
                </TouchableOpacity>
            </View>

            {viewMode === 'month' && (
                <MonthSelector currentDate={selectedMonth} onPrev={handlePrevMonth} onNext={handleNextMonth} />
            )}

            <View style={styles.summaryContainer}>
                <SummaryCard income={income} expense={expense} currency={currency} lang={lang} />
            </View>

            {settings.monthlyBudget > 0 && (
                <View style={styles.budgetContainer}>
                    <BudgetProgress
                        label={t('monthlyBudget', lang)}
                        current={expense}
                        target={settings.monthlyBudget}
                        color={colors.primary}
                        currency={currency}
                        lang={lang}
                    />
                </View>
            )}

            <View style={styles.listContainer}>
                <View style={[styles.listHeader, { flexDirection: getFlexDirection(lang) }]}>
                    <Text style={[styles.listTitle, { color: colors.text, fontSize: 18 * (state.settings.fontScale || 1) }]}>{t('history', lang)}</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('AllTransactions')}>
                        <Text style={[styles.seeAll, { color: colors.textSecondary, fontSize: 13 * (state.settings.fontScale || 1) }]}>{t('seeAll', lang)}</Text>
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={filteredTransactions.slice(0, 4)}
                    keyExtractor={(item) => item.id}
                    renderItem={renderTransaction}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyEmoji}>📭</Text>
                            <Text style={[styles.emptyText, { color: colors.text }]}>{t('noTransactions', lang)}</Text>
                            <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>{t('tapToAdd', lang)}</Text>
                        </View>
                    }
                />
            </View>

            {/* Export Modal */}
            <Modal visible={showExportModal} animationType="fade" transparent>
                <Pressable style={styles.exportOverlay} onPress={() => setShowExportModal(false)}>
                    <View style={[styles.exportSheet, { backgroundColor: colors.card }]}>
                        <Text style={[styles.exportSheetTitle, { color: colors.text }]}>
                            {t('exportData', lang)}
                        </Text>

                        <Text style={[styles.exportScopeLabel, { color: colors.textSecondary }]}>
                            {lang === 'ar' ? 'النطاق' : 'Scope'}
                        </Text>

                        {/* This Month */}
                        <TouchableOpacity style={[styles.exportOption, { backgroundColor: colors.background }]} onPress={() => { }} activeOpacity={1}>
                            <Text style={[styles.exportOptionLabel, { color: colors.text }]}>
                                {t('thisMonth', lang)} ({dayjs(selectedMonth).format('MMM YYYY')})
                            </Text>
                            <View style={styles.exportBtns}>
                                <TouchableOpacity style={[styles.exportBtn, { backgroundColor: colors.primary }]} onPress={() => doExport('pdf', 'month')}>
                                    <Text style={styles.exportBtnText}>PDF</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.exportBtn, { backgroundColor: '#059669' }]} onPress={() => doExport('csv', 'month')}>
                                    <Text style={styles.exportBtnText}>CSV</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>

                        {/* All Time */}
                        <TouchableOpacity style={[styles.exportOption, { backgroundColor: colors.background }]} onPress={() => { }} activeOpacity={1}>
                            <Text style={[styles.exportOptionLabel, { color: colors.text }]}>
                                {t('allTime', lang)}
                            </Text>
                            <View style={styles.exportBtns}>
                                <TouchableOpacity style={[styles.exportBtn, { backgroundColor: colors.primary }]} onPress={() => doExport('pdf', 'all')}>
                                    <Text style={styles.exportBtnText}>PDF</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.exportBtn, { backgroundColor: '#059669' }]} onPress={() => doExport('csv', 'all')}>
                                    <Text style={styles.exportBtnText}>CSV</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.exportCancelBtn, { borderColor: colors.border }]} onPress={() => setShowExportModal(false)}>
                            <Text style={[styles.exportCancelText, { color: colors.textSecondary }]}>{t('cancel', lang)}</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>
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
    header: {
        paddingHorizontal: Layout.spacing.lg,
        paddingTop: Layout.spacing.sm,
        paddingBottom: 4,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    greeting: { fontFamily: Fonts.medium, fontSize: 13 },
    title: { fontFamily: Fonts.bold, fontSize: 22 },
    headerActions: { flexDirection: 'row', gap: 8 },
    iconButton: {
        width: 34, height: 34, borderRadius: 17,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1,
    },
    searchContainer: { paddingHorizontal: Layout.spacing.lg, marginBottom: Layout.spacing.xs },
    searchInput: {
        borderRadius: Layout.borderRadius.sm,
        paddingHorizontal: Layout.spacing.md, paddingVertical: 10,
        fontFamily: Fonts.regular, fontSize: 16, borderWidth: 1,
    },
    toggleRow: {
        flexDirection: 'row', alignSelf: 'center', borderRadius: Layout.borderRadius.sm,
        overflow: 'hidden', marginBottom: 4, marginTop: 4,
    },
    toggleBtn: {
        paddingHorizontal: Layout.spacing.md, paddingVertical: 6,
        borderRadius: Layout.borderRadius.sm,
    },
    toggleText: { fontFamily: Fonts.semiBold, fontSize: 12 },
    summaryContainer: { paddingHorizontal: Layout.spacing.lg, marginBottom: Layout.spacing.md },
    budgetContainer: { paddingHorizontal: Layout.spacing.lg, marginBottom: Layout.spacing.md },
    listContainer: { flex: 1, marginTop: 4 },
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Layout.spacing.lg,
        marginBottom: Layout.spacing.md,
    },
    listTitle: { fontFamily: Fonts.bold, fontSize: 18 },
    seeAll: { fontFamily: Fonts.semiBold, fontSize: 13 },
    listContent: { paddingHorizontal: Layout.spacing.lg, paddingBottom: 80 },
    emptyContainer: { alignItems: 'center', marginTop: Layout.spacing.xxl },
    emptyEmoji: { fontSize: 48, marginBottom: Layout.spacing.md },
    emptyText: { fontFamily: Fonts.semiBold, fontSize: 18, marginBottom: Layout.spacing.xs },
    emptySubText: { fontFamily: Fonts.regular, fontSize: 14, textAlign: 'center' },
    // Export modal
    exportOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
    exportSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: Layout.spacing.lg, paddingBottom: 36 },
    exportSheetTitle: { fontFamily: Fonts.bold, fontSize: 18, textAlign: 'center', marginBottom: Layout.spacing.md },
    exportScopeLabel: { fontFamily: Fonts.semiBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
    exportOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: Layout.borderRadius.sm, padding: Layout.spacing.md, marginBottom: 10 },
    exportOptionLabel: { fontFamily: Fonts.medium, fontSize: 15, flex: 1 },
    exportBtns: { flexDirection: 'row', gap: 8 },
    exportBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Layout.borderRadius.sm },
    exportBtnText: { fontFamily: Fonts.bold, fontSize: 13, color: '#FFF' },
    exportCancelBtn: { marginTop: 6, paddingVertical: 12, borderRadius: Layout.borderRadius.sm, borderWidth: 1, alignItems: 'center' },
    exportCancelText: { fontFamily: Fonts.semiBold, fontSize: 15 },
});

export default HomeScreen;

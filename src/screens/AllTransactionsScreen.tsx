import React, { useMemo, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    Alert,
} from 'react-native';
import dayjs from 'dayjs';
import { useApp } from '../context/AppContext';
import { Layout, Fonts } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';
import TransactionItem from '../components/common/TransactionItem';
import MonthSelector from '../components/common/MonthSelector';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Transaction } from '../types';
import { t, isRTL, getFlexDirection } from '../utils/i18n';
import Svg, { Path } from 'react-native-svg';
import TransactionDetailsModal from '../components/common/TransactionDetailsModal';

const AllTransactionsScreen = ({ navigation }: any) => {
    const { state, dispatch } = useApp();
    const { colors } = useTheme();
    const { transactions, categories, settings } = state;
    const currency = settings.currency;
    const lang = settings.language || 'en';
    const rtl = isRTL(lang);

    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'month' | 'all'>('month');

    if (!currency) return null;

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

    const getCategory = (id: string) =>
        categories.find((c) => c.id === id) || categories[0];

    const handlePrevMonth = () =>
        setSelectedMonth((prev) => dayjs(prev).subtract(1, 'month').toDate());
    const handleNextMonth = () =>
        setSelectedMonth((prev) => dayjs(prev).add(1, 'month').toDate());

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
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                        <Path
                            d={rtl ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"}
                            stroke={colors.text}
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </Svg>
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>
                    {lang === 'ar' ? 'جميع المعاملات' : 'All Transactions'}
                </Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
                <TextInput
                    style={[styles.searchInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }, rtl && { textAlign: 'right' }]}
                    placeholder={t('searchTransactions', lang)}
                    placeholderTextColor={colors.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {/* Month / All Time Toggle */}
            <View style={styles.toggleRow}>
                <TouchableOpacity
                    style={[styles.toggleBtn, viewMode === 'month' && { backgroundColor: colors.primary }]}
                    onPress={() => setViewMode('month')} activeOpacity={0.7}
                >
                    <Text style={[styles.toggleText, { color: viewMode === 'month' ? '#FFF' : colors.textSecondary }]}>
                        {t('thisMonth', lang)}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.toggleBtn, viewMode === 'all' && { backgroundColor: colors.primary }]}
                    onPress={() => setViewMode('all')} activeOpacity={0.7}
                >
                    <Text style={[styles.toggleText, { color: viewMode === 'all' ? '#FFF' : colors.textSecondary }]}>
                        {t('allTime', lang)}
                    </Text>
                </TouchableOpacity>
            </View>

            {viewMode === 'month' && (
                <MonthSelector currentDate={selectedMonth} onPrev={handlePrevMonth} onNext={handleNextMonth} />
            )}

            {/* Transaction Count */}
            <View style={[styles.countRow, { flexDirection: getFlexDirection(lang) }]}>
                <Text style={[styles.countText, { color: colors.textSecondary }]}>
                    {filteredTransactions.length}{' '}
                    {filteredTransactions.length === 1 ? t('item', lang) : t('items', lang)}
                </Text>
            </View>

            <FlatList
                data={filteredTransactions}
                keyExtractor={(item) => item.id}
                renderItem={renderTransaction}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyEmoji}>📭</Text>
                        <Text style={[styles.emptyText, { color: colors.text }]}>{t('noTransactions', lang)}</Text>
                    </View>
                }
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
    header: {
        paddingHorizontal: Layout.spacing.md,
        paddingTop: Layout.spacing.sm,
        paddingBottom: Layout.spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    title: { fontFamily: Fonts.bold, fontSize: 20, flex: 1, textAlign: 'center' },
    searchContainer: { paddingHorizontal: Layout.spacing.md, marginBottom: Layout.spacing.sm },
    searchInput: {
        borderRadius: Layout.borderRadius.sm,
        paddingHorizontal: Layout.spacing.md, paddingVertical: 10,
        fontFamily: Fonts.regular, fontSize: 15, borderWidth: 1,
    },
    toggleRow: {
        flexDirection: 'row', alignSelf: 'center', borderRadius: Layout.borderRadius.sm,
        overflow: 'hidden', marginBottom: 4,
    },
    toggleBtn: {
        paddingHorizontal: Layout.spacing.md, paddingVertical: 6,
        borderRadius: Layout.borderRadius.sm,
    },
    toggleText: { fontFamily: Fonts.semiBold, fontSize: 12 },
    countRow: { paddingHorizontal: Layout.spacing.lg, marginBottom: Layout.spacing.sm },
    countText: { fontFamily: Fonts.medium, fontSize: 13 },
    listContent: { paddingHorizontal: Layout.spacing.lg, paddingBottom: 80 },
    emptyContainer: { alignItems: 'center', marginTop: Layout.spacing.xxl },
    emptyEmoji: { fontSize: 48, marginBottom: Layout.spacing.md },
    emptyText: { fontFamily: Fonts.semiBold, fontSize: 18 },
});

export default AllTransactionsScreen;

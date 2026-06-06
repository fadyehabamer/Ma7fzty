import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import dayjs from 'dayjs';
import { Layout, Fonts } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { useApp } from '../../context/AppContext';
import { Category, Transaction, Currency } from '../../types';
import { formatCurrency, isRTL } from '../../utils/i18n';

interface Props {
    transaction: Transaction;
    category: Category;
    currency: Currency;
    onPress?: () => void;
    onEdit?: () => void;
    onDuplicate?: () => void;
    onDelete?: () => void;
}

const TransactionItem = ({ transaction, category, currency, onPress, onEdit, onDuplicate, onDelete }: Props) => {
    const { state } = useApp();
    const { colors } = useTheme();
    const lang = state.settings.language || 'en';
    const rtl = isRTL(lang);
    const fs = state.settings.fontScale || 1;
    const isExpense = transaction.type === 'expense';
    const color = isExpense ? colors.danger : colors.success;
    const bgTint = isExpense ? colors.danger + '14' : colors.success + '14';
    const swipeRef = useRef<Swipeable>(null);

    const hasActions = !!(onEdit || onDuplicate || onDelete);
    const run = (fn?: () => void) => { swipeRef.current?.close(); fn?.(); };

    const renderActions = () => (
        <View style={styles.actions}>
            {onEdit && (
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={() => run(onEdit)} activeOpacity={0.8}>
                    <Text style={styles.actionEmoji}>✏️</Text>
                    <Text style={styles.actionLabel}>{lang === 'ar' ? 'تعديل' : 'Edit'}</Text>
                </TouchableOpacity>
            )}
            {onDuplicate && (
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.info || '#0EA5E9' }]} onPress={() => run(onDuplicate)} activeOpacity={0.8}>
                    <Text style={styles.actionEmoji}>⧉</Text>
                    <Text style={styles.actionLabel}>{lang === 'ar' ? 'نسخ' : 'Copy'}</Text>
                </TouchableOpacity>
            )}
            {onDelete && (
                <TouchableOpacity style={[styles.actionBtn, styles.actionBtnLast, { backgroundColor: colors.danger }]} onPress={() => run(onDelete)} activeOpacity={0.8}>
                    <Text style={styles.actionEmoji}>🗑️</Text>
                    <Text style={styles.actionLabel}>{lang === 'ar' ? 'حذف' : 'Delete'}</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    const row = (
        <TouchableOpacity style={[styles.container, { backgroundColor: colors.card }]} onPress={onPress} activeOpacity={0.7}>
            <View style={[styles.emojiContainer, { backgroundColor: bgTint }]}>
                <Text style={styles.emoji}>{category.emoji}</Text>
            </View>
            <View style={styles.content}>
                <View style={styles.categoryRow}>
                    <Text style={[styles.category, { color: colors.text, fontSize: 16 * fs }]}>{category.name}</Text>
                    {transaction.imageUri && <Text style={[styles.iconIndicator, { fontSize: 12 * fs }]}>📷</Text>}
                </View>
                {transaction.note ? (
                    <Text style={[styles.note, { color: colors.textSecondary, fontSize: 14 * fs }]} numberOfLines={1}>
                        {transaction.note}
                    </Text>
                ) : null}
                <Text style={[styles.date, { color: colors.textSecondary, fontSize: 12 * fs }]}>
                    {dayjs(transaction.date).format('MMM D, h:mm A')}
                </Text>
            </View>
            <View style={styles.rightSection}>
                <Text
                    style={[styles.amount, { color, fontSize: 16 * fs }]}
                    adjustsFontSizeToFit
                    numberOfLines={1}
                    minimumFontScale={0.7}
                >
                    {formatCurrency(isExpense ? -transaction.amount : transaction.amount, currency, lang)}
                </Text>
            </View>
        </TouchableOpacity>
    );

    if (!hasActions) return <View style={styles.wrap}>{row}</View>;

    return (
        <Swipeable
            ref={swipeRef}
            containerStyle={styles.wrap}
            renderRightActions={rtl ? undefined : renderActions}
            renderLeftActions={rtl ? renderActions : undefined}
            overshootRight={false}
            overshootLeft={false}
            friction={2}
        >
            {row}
        </Swipeable>
    );
};

const styles = StyleSheet.create({
    wrap: { marginBottom: Layout.spacing.sm },
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Layout.spacing.md,
        borderRadius: Layout.borderRadius.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 2,
    },
    emojiContainer: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Layout.spacing.md,
    },
    emoji: { fontSize: 22, includeFontPadding: false },
    content: { flex: 1, marginRight: Layout.spacing.sm },
    categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    iconIndicator: { fontSize: 12 },
    category: { fontSize: 16, fontFamily: Fonts.semiBold },
    note: { fontSize: 14, fontFamily: Fonts.regular, marginTop: 1 },
    date: { fontSize: 12, fontFamily: Fonts.regular, marginTop: 2 },
    rightSection: { alignItems: 'flex-end', flexShrink: 1, minWidth: 80 },
    amount: { fontSize: 16, fontFamily: Fonts.bold },
    // Swipe actions
    actions: { flexDirection: 'row', alignItems: 'stretch' },
    actionBtn: { width: 68, alignItems: 'center', justifyContent: 'center', gap: 3 },
    actionBtnLast: { borderTopRightRadius: Layout.borderRadius.md, borderBottomRightRadius: Layout.borderRadius.md },
    actionEmoji: { fontSize: 18 },
    actionLabel: { color: '#FFFFFF', fontFamily: Fonts.semiBold, fontSize: 11 },
});

export default TransactionItem;

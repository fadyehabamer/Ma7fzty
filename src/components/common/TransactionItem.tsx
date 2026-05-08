import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import dayjs from 'dayjs';
import { Layout, Fonts } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { useApp } from '../../context/AppContext';
import { Category, Transaction, Currency } from '../../types';
import { formatCurrency } from '../../utils/i18n';

interface Props {
    transaction: Transaction;
    category: Category;
    currency: Currency;
    onPress?: () => void;
    onDelete?: () => void;
}

const TransactionItem = ({ transaction, category, currency, onPress, onDelete }: Props) => {
    const { state } = useApp();
    const { colors } = useTheme();
    const isExpense = transaction.type === 'expense';
    const color = isExpense ? colors.danger : colors.success;
    const bgTint = isExpense ? colors.danger + '14' : colors.success + '14';

    return (
        <TouchableOpacity style={[styles.container, { backgroundColor: colors.card }]} onPress={onPress} activeOpacity={0.7}>
            <View style={[styles.emojiContainer, { backgroundColor: bgTint }]}>
                <Text style={styles.emoji}>{category.emoji}</Text>
            </View>
            <View style={styles.content}>
                <View style={styles.categoryRow}>
                    <Text style={[styles.category, { color: colors.text, fontSize: 16 * (state.settings.fontScale || 1) }]}>{category.name}</Text>
                    {transaction.imageUri && <Text style={[styles.iconIndicator, { fontSize: 12 * (state.settings.fontScale || 1) }]}>📷</Text>}
                </View>
                {transaction.note ? (
                    <Text style={[styles.note, { color: colors.textSecondary, fontSize: 14 * (state.settings.fontScale || 1) }]} numberOfLines={1}>
                        {transaction.note}
                    </Text>
                ) : null}
                <Text style={[styles.date, { color: colors.textSecondary, fontSize: 12 * (state.settings.fontScale || 1) }]}>
                    {dayjs(transaction.date).format('MMM D, h:mm A')}
                </Text>
            </View>
            <View style={styles.rightSection}>
                <Text
                    style={[styles.amount, { color, fontSize: 16 * (state.settings.fontScale || 1) }]}
                    adjustsFontSizeToFit
                    numberOfLines={1}
                    minimumFontScale={0.7}
                >
                    {formatCurrency(isExpense ? -transaction.amount : transaction.amount, currency, state.settings.language || 'en')}
                </Text>
                {onDelete && (
                    <TouchableOpacity onPress={onDelete} style={styles.deleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={[styles.deleteBtnText, { color: colors.danger, fontSize: 12 * (state.settings.fontScale || 1) }]}>Delete</Text>
                    </TouchableOpacity>
                )}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Layout.spacing.md,
        borderRadius: Layout.borderRadius.md,
        marginBottom: Layout.spacing.sm,
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
    deleteBtn: { marginTop: 4 },
    deleteBtnText: { fontSize: 12, fontFamily: Fonts.medium },
});

export default TransactionItem;

import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Layout, Fonts } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { Transaction, Category, Currency } from '../../types';
import dayjs from 'dayjs';
import { useApp } from '../../context/AppContext';
import { t, isRTL, formatCurrency } from '../../utils/i18n';
import AppIcon from './AppIcon';
import { Ionicons } from '@expo/vector-icons';

interface Props {
    visible: boolean;
    transaction: Transaction | null;
    category: Category | null;
    currency: Currency | null;
    onClose: () => void;
}

const TransactionDetailsModal = ({ visible, transaction, category, currency, onClose }: Props) => {
    const { colors } = useTheme();
    const { state } = useApp();
    // Using props for now.

    if (!transaction || !category || !currency) return null;

    const lang = state.settings.language || 'en';
    const isExpense = transaction.type === 'expense';
    const color = isExpense ? colors.danger : colors.success;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>

                    {/* Header with Emoji */}
                    <View style={styles.header}>
                        <View style={[styles.emojiContainer, { backgroundColor: color + '15' }]}>
                            <AppIcon name={category.emoji} size={26} color={color} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.categoryName, { color: colors.text }]}>{category.name}</Text>
                            <Text style={[styles.typeText, { color: colors.textSecondary }]}>
                                {isExpense ? t('expense', lang) : t('income', lang)}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Ionicons name="close" size={22} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        {/* Amount */}
                        <Text style={[styles.amount, { color }]}>
                            {formatCurrency(isExpense ? -transaction.amount : transaction.amount, currency, lang)}
                        </Text>
                        <Text style={[styles.date, { color: colors.textSecondary }]}>
                            {dayjs(transaction.date).format('dddd, MMM D, YYYY • h:mm A')}
                        </Text>

                        {/* Note */}
                        {transaction.note && (
                            <View style={[styles.section, { backgroundColor: colors.background }]}>
                                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t('note', lang)}</Text>
                                <Text style={[styles.noteText, { color: colors.text }]}>{transaction.note}</Text>
                            </View>
                        )}

                        {/* Image */}
                        {transaction.imageUri && (
                            <View style={[styles.section, { backgroundColor: colors.background }]}>
                                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{lang === 'ar' ? 'صورة' : 'Photo'}</Text>
                                <Image source={{ uri: transaction.imageUri }} style={styles.image} resizeMode="cover" />
                            </View>
                        )}
                    </ScrollView>

                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: Layout.spacing.lg },
    modalContainer: { borderRadius: Layout.borderRadius.lg, padding: Layout.spacing.lg, maxHeight: '80%' },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: Layout.spacing.lg },
    emojiContainer: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: Layout.spacing.md },
    emoji: { fontSize: 28 },
    categoryName: { fontFamily: Fonts.bold, fontSize: 18 },
    typeText: { fontFamily: Fonts.regular, fontSize: 13, textTransform: 'capitalize' },
    closeBtn: { padding: 4 },
    closeBtnText: { fontSize: 20, fontFamily: Fonts.bold },
    content: {},
    amount: { fontFamily: Fonts.bold, fontSize: 36, textAlign: 'center', marginBottom: 4 },
    date: { fontFamily: Fonts.medium, fontSize: 14, textAlign: 'center', marginBottom: Layout.spacing.xl },
    section: { padding: Layout.spacing.md, borderRadius: Layout.borderRadius.md, marginBottom: Layout.spacing.md },
    sectionLabel: { fontFamily: Fonts.semiBold, fontSize: 12, textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 },
    noteText: { fontFamily: Fonts.regular, fontSize: 16, lineHeight: 22 },
    image: { width: '100%', height: 200, borderRadius: Layout.borderRadius.sm, marginTop: 4 },
});

export default TransactionDetailsModal;

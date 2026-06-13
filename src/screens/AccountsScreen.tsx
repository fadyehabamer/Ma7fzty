import React, { useMemo, useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, ScrollView, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useApp } from '../context/AppContext';
import { useTheme } from '../hooks/useTheme';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import { Layout, Fonts, PRIMARY_COLORS } from '../constants/theme';
import { t, isRTL, getFlexDirection, formatCurrency } from '../utils/i18n';
import { Account, AccountType } from '../types';
import { Ionicons } from '@expo/vector-icons';
import AppIcon from '../components/common/AppIcon';
import { PICKER_ICONS } from '../constants/icons';

const ACCOUNT_TYPES: { type: AccountType; icon: string; key: string }[] = [
    { type: 'cash', icon: 'cash', key: 'acctCash' },
    { type: 'bank', icon: 'business', key: 'acctBank' },
    { type: 'card', icon: 'card', key: 'acctCard' },
    { type: 'savings', icon: 'wallet', key: 'acctSavings' },
    { type: 'other', icon: 'pricetag', key: 'acctOther' },
];

const COLOR_SWATCHES = PRIMARY_COLORS.map((c) => c.value);

const AccountsScreen = ({ navigation }: any) => {
    const { state, dispatch } = useApp();
    const { colors } = useTheme();
    const keyboardHeight = useKeyboardHeight();
    const lang = state.settings.language || 'en';
    const fontScale = state.settings.fontScale || 1;
    const rtl = isRTL(lang);
    const isAr = lang === 'ar';
    const currency = state.settings.currency;

    const accounts = state.accounts || [];

    // Live balance = opening + (income − expense) of assigned transactions.
    const balances = useMemo(() => {
        const map: Record<string, number> = {};
        accounts.forEach((a) => { map[a.id] = a.openingBalance; });
        state.transactions.forEach((tx) => {
            if (tx.accountId && map[tx.accountId] !== undefined) {
                map[tx.accountId] += tx.type === 'income' ? tx.amount : -tx.amount;
            }
        });
        return map;
    }, [accounts, state.transactions]);

    const netWorth = useMemo(
        () => accounts.reduce((s, a) => s + (balances[a.id] ?? 0), 0),
        [accounts, balances]
    );

    // Form state
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [fName, setFName] = useState('');
    const [fIcon, setFIcon] = useState('cash');
    const [fType, setFType] = useState<AccountType>('cash');
    const [fColor, setFColor] = useState(COLOR_SWATCHES[1]);
    const [fOpening, setFOpening] = useState('');

    const openAdd = () => {
        setEditingId(null);
        setFName(''); setFIcon('cash'); setFType('cash'); setFColor(COLOR_SWATCHES[1]); setFOpening('');
        setShowForm(true);
    };

    const openEdit = (a: Account) => {
        setEditingId(a.id);
        setFName(a.name); setFIcon(a.icon); setFType(a.type); setFColor(a.color);
        setFOpening(String(a.openingBalance));
        setShowForm(true);
    };

    const saveAccount = () => {
        const name = fName.trim();
        if (!name) {
            Alert.alert(isAr ? 'حقل مطلوب' : 'Missing field', isAr ? 'يرجى إدخال اسم الحساب' : 'Please enter an account name');
            return;
        }
        const opening = parseFloat(fOpening.replace(/,/g, '')) || 0;
        if (editingId) {
            const existing = accounts.find((x) => x.id === editingId);
            dispatch({
                type: 'UPDATE_ACCOUNT',
                payload: { id: editingId, name, icon: fIcon, type: fType, color: fColor, openingBalance: opening, createdAt: existing?.createdAt || Date.now() },
            });
        } else {
            dispatch({
                type: 'ADD_ACCOUNT',
                payload: { id: Date.now().toString(), name, icon: fIcon, type: fType, color: fColor, openingBalance: opening, createdAt: Date.now() },
            });
        }
        setShowForm(false);
    };

    const deleteAccount = (a: Account) => {
        Alert.alert(
            t('deleteAccountTitle', lang),
            `${isAr ? `حذف "${a.name}"؟` : `Delete "${a.name}"?`}\n${t('deleteAccountMsg', lang)}`,
            [
                { text: t('cancel', lang), style: 'cancel' },
                { text: t('delete', lang), style: 'destructive', onPress: () => { dispatch({ type: 'DELETE_ACCOUNT', payload: a.id }); setShowForm(false); } },
            ]
        );
    };

    const fmt = (n: number) => formatCurrency(n, currency, lang);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                {/* Header */}
                <View style={[styles.header, { flexDirection: getFlexDirection(lang), backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                    <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.goBack()}>
                        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                            <Path d={rtl ? 'M5 12h14M12 5l7 7-7 7' : 'M19 12H5M12 19l-7-7 7-7'} stroke={colors.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: colors.text, fontSize: 18 * fontScale }]}>{t('accountsTitle', lang)}</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    {/* Net worth */}
                    {accounts.length > 0 && (
                        <View style={[styles.summaryCard, { backgroundColor: colors.primary }]}>
                            <Text style={styles.summaryLabel}>{t('netWorth', lang).toUpperCase()}</Text>
                            <Text style={styles.summaryValue}>{fmt(netWorth)}</Text>
                            <Text style={styles.summarySub}>{accounts.length} {accounts.length === 1 ? t('account', lang) : t('accounts', lang)}</Text>
                        </View>
                    )}

                    {accounts.length === 0 ? (
                        <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
                            <Ionicons name="wallet-outline" size={44} color={colors.textSecondary} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary, fontSize: 14 * fontScale }]}>{t('noAccountsYet', lang)}</Text>
                            <Text style={[styles.emptySub, { color: colors.textSecondary, fontSize: 12 * fontScale }]}>{t('accountsHint', lang)}</Text>
                        </View>
                    ) : (
                        accounts.map((a) => {
                            const bal = balances[a.id] ?? 0;
                            const typeLabel = t(ACCOUNT_TYPES.find((x) => x.type === a.type)?.key || 'acctOther', lang);
                            return (
                                <TouchableOpacity
                                    key={a.id}
                                    style={[styles.acctCard, { backgroundColor: colors.card }]}
                                    onLongPress={() => openEdit(a)}
                                    activeOpacity={0.8}
                                >
                                    <View style={[styles.acctRow, { flexDirection: getFlexDirection(lang) }]}>
                                        <View style={[styles.acctBadge, { backgroundColor: a.color + '1A' }]}>
                                            <AppIcon name={a.icon} size={22} color={a.color} />
                                        </View>
                                        <View style={[styles.acctInfo, rtl && { alignItems: 'flex-end' }]}>
                                            <Text style={[styles.acctName, { color: colors.text, fontSize: 16 * fontScale }]} numberOfLines={1}>{a.name}</Text>
                                            <Text style={[styles.acctType, { color: colors.textSecondary, fontSize: 12 * fontScale }]} numberOfLines={1}>{typeLabel}</Text>
                                        </View>
                                        <Text style={[styles.acctBalance, { color: bal < 0 ? colors.danger : colors.text, fontSize: 17 * fontScale }]} numberOfLines={1}>
                                            {fmt(bal)}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    )}

                    <TouchableOpacity style={[styles.addBtn, { borderColor: colors.primary }]} onPress={openAdd} activeOpacity={0.7}>
                        <Ionicons name="add" size={18} color={colors.primary} />
                        <Text style={[styles.addBtnText, { color: colors.primary, fontSize: 15 * fontScale }]}>{t('addAccount', lang)}</Text>
                    </TouchableOpacity>

                    {accounts.length > 0 && (
                        <Text style={[styles.hint, { color: colors.textSecondary, fontSize: 12 * fontScale }]}>{t('longPressEdit', lang)}</Text>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Form modal */}
            <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
                <View style={{ flex: 1, paddingBottom: keyboardHeight }}>
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
                            <View style={styles.modalHandleRow}><View style={[styles.modalHandle, { backgroundColor: colors.border }]} /></View>
                            <Text style={[styles.modalTitle, { color: colors.text, fontSize: 18 * fontScale }]}>
                                {editingId ? t('editAccount', lang) : t('newAccount', lang)}
                            </Text>

                            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 440 }}>
                                <TextInput
                                    style={[styles.fieldInput, { color: colors.text, borderColor: colors.border, fontSize: 15 * fontScale }, rtl && { textAlign: 'right' }]}
                                    placeholder={t('accountNamePlaceholder', lang)}
                                    placeholderTextColor={colors.textSecondary}
                                    value={fName} onChangeText={setFName}
                                />

                                {/* Type */}
                                <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: 12 * fontScale }, rtl && { textAlign: 'right' }]}>{t('accountType', lang)}</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.typeRow, rtl && { flexDirection: 'row-reverse' }]} keyboardShouldPersistTaps="handled">
                                    {ACCOUNT_TYPES.map((ty) => {
                                        const active = fType === ty.type;
                                        return (
                                            <TouchableOpacity
                                                key={ty.type}
                                                style={[styles.typeChip, { flexDirection: getFlexDirection(lang), borderColor: colors.border }, active && { backgroundColor: fColor + '18', borderColor: fColor }]}
                                                onPress={() => { setFType(ty.type); setFIcon(ty.icon); }}
                                                activeOpacity={0.7}
                                            >
                                                <Ionicons name={ty.icon as any} size={16} color={active ? fColor : colors.textSecondary} />
                                                <Text style={[styles.typeChipText, { color: active ? fColor : colors.textSecondary, fontSize: 13 * fontScale, fontFamily: active ? Fonts.bold : Fonts.medium }]}>{t(ty.key, lang)}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>

                                {/* Icon */}
                                <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: 12 * fontScale }, rtl && { textAlign: 'right' }]}>{isAr ? 'الأيقونة' : 'Icon'}</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.iconRow} keyboardShouldPersistTaps="handled">
                                    {PICKER_ICONS.map((ic) => {
                                        const active = fIcon === ic;
                                        return (
                                            <TouchableOpacity
                                                key={ic}
                                                style={[styles.iconCell, { borderColor: colors.border }, active && { borderColor: fColor, backgroundColor: fColor + '15' }]}
                                                onPress={() => setFIcon(ic)}
                                                activeOpacity={0.7}
                                            >
                                                <Ionicons name={ic as any} size={20} color={active ? fColor : colors.text} />
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>

                                {/* Color */}
                                <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: 12 * fontScale }, rtl && { textAlign: 'right' }]}>{isAr ? 'اللون' : 'Color'}</Text>
                                <View style={[styles.colorRow, rtl && { flexDirection: 'row-reverse' }]}>
                                    {COLOR_SWATCHES.map((c) => (
                                        <TouchableOpacity key={c} onPress={() => setFColor(c)} style={[styles.colorDot, { backgroundColor: c }, fColor === c && styles.colorDotActive]} activeOpacity={0.8} />
                                    ))}
                                </View>

                                {/* Opening balance */}
                                <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: 12 * fontScale }, rtl && { textAlign: 'right' }]}>{t('openingBalance', lang)}</Text>
                                <TextInput
                                    style={[styles.fieldInput, { color: colors.text, borderColor: colors.border, fontSize: 15 * fontScale }, rtl && { textAlign: 'right' }]}
                                    placeholder="0" keyboardType="numeric" value={fOpening} onChangeText={setFOpening} placeholderTextColor={colors.textSecondary}
                                />

                                {editingId && (
                                    <TouchableOpacity onPress={() => { const a = accounts.find((x) => x.id === editingId); if (a) deleteAccount(a); }} style={styles.deleteLink} activeOpacity={0.7}>
                                        <Text style={[styles.deleteLinkText, { color: colors.danger, fontSize: 14 * fontScale }]}>{t('deleteAccountTitle', lang)}</Text>
                                    </TouchableOpacity>
                                )}
                            </ScrollView>

                            <View style={[styles.modalButtons, { flexDirection: getFlexDirection(lang) }]}>
                                <TouchableOpacity style={[styles.modalCancelBtn, { borderColor: colors.border }]} onPress={() => setShowForm(false)}>
                                    <Text style={[styles.modalCancelText, { color: colors.textSecondary, fontSize: 15 * fontScale }]}>{t('cancel', lang)}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]} onPress={saveAccount}>
                                    <Text style={[styles.modalSaveText, { fontSize: 15 * fontScale }]}>{t('save', lang)}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Layout.spacing.md, paddingVertical: Layout.spacing.sm, borderBottomWidth: 1 },
    headerBackBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20 },
    title: { flex: 1, fontFamily: Fonts.bold, fontSize: 18, textAlign: 'center' },
    content: { padding: Layout.spacing.md, paddingBottom: Layout.spacing.xxl },

    summaryCard: { borderRadius: Layout.borderRadius.lg, padding: Layout.spacing.lg, alignItems: 'center', marginBottom: Layout.spacing.lg },
    summaryLabel: { fontFamily: Fonts.semiBold, fontSize: 12, color: '#FFFFFFCC', textTransform: 'uppercase', letterSpacing: 1 },
    summaryValue: { fontFamily: Fonts.bold, fontSize: 30, color: '#FFFFFF', marginTop: 4 },
    summarySub: { fontFamily: Fonts.medium, fontSize: 13, color: '#FFFFFFCC', marginTop: 2 },

    emptyCard: { borderRadius: Layout.borderRadius.md, padding: Layout.spacing.xl, alignItems: 'center', gap: Layout.spacing.sm },
    emptyText: { fontFamily: Fonts.semiBold, textAlign: 'center' },
    emptySub: { fontFamily: Fonts.regular, textAlign: 'center', lineHeight: 18 },

    acctCard: { borderRadius: Layout.borderRadius.md, padding: Layout.spacing.md, marginBottom: Layout.spacing.sm, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 2 },
    acctRow: { flexDirection: 'row', alignItems: 'center', gap: Layout.spacing.md },
    acctBadge: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    acctInfo: { flex: 1 },
    acctName: { fontFamily: Fonts.bold, fontSize: 16 },
    acctType: { fontFamily: Fonts.regular, fontSize: 12, marginTop: 2 },
    acctBalance: { fontFamily: Fonts.bold, fontSize: 17 },

    addBtn: { flexDirection: 'row', gap: 6, marginTop: Layout.spacing.sm, paddingVertical: 14, borderRadius: Layout.borderRadius.md, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
    addBtnText: { fontFamily: Fonts.bold, fontSize: 15 },
    hint: { fontFamily: Fonts.regular, fontSize: 12, textAlign: 'center', marginTop: Layout.spacing.md },

    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Layout.spacing.lg, paddingBottom: Layout.spacing.xl },
    modalHandleRow: { alignItems: 'center', marginBottom: Layout.spacing.sm },
    modalHandle: { width: 40, height: 4, borderRadius: 2 },
    modalTitle: { fontFamily: Fonts.bold, fontSize: 18, marginBottom: Layout.spacing.md, textAlign: 'center' },

    fieldLabel: { fontFamily: Fonts.semiBold, fontSize: 12, marginTop: Layout.spacing.md, marginBottom: 6 },
    fieldInput: { borderWidth: 1, borderRadius: Layout.borderRadius.sm, paddingHorizontal: Layout.spacing.md, paddingVertical: Platform.OS === 'ios' ? 12 : 8, fontFamily: Fonts.medium, fontSize: 15, minHeight: 48 },

    typeRow: { flexDirection: 'row', gap: Layout.spacing.sm, paddingVertical: 2 },
    typeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5 },
    typeChipText: { fontFamily: Fonts.medium, fontSize: 13 },

    iconRow: { flexDirection: 'row', gap: Layout.spacing.sm, paddingVertical: 2 },
    iconCell: { width: 46, height: 46, borderRadius: Layout.borderRadius.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },

    colorRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    colorDot: { width: 30, height: 30, borderRadius: 15 },
    colorDotActive: { borderWidth: 3, borderColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },

    deleteLink: { marginTop: Layout.spacing.lg, alignItems: 'center', paddingVertical: Layout.spacing.sm },
    deleteLinkText: { fontFamily: Fonts.semiBold, fontSize: 14 },

    modalButtons: { flexDirection: 'row', gap: Layout.spacing.md, marginTop: Layout.spacing.lg },
    modalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: Layout.borderRadius.md, borderWidth: 1.5, alignItems: 'center' },
    modalCancelText: { fontFamily: Fonts.semiBold, fontSize: 15 },
    modalSaveBtn: { flex: 2, paddingVertical: 14, borderRadius: Layout.borderRadius.md, alignItems: 'center' },
    modalSaveText: { fontFamily: Fonts.bold, fontSize: 15, color: '#FFFFFF' },
});

export default AccountsScreen;

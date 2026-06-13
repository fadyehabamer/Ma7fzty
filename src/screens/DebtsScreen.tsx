import React, { useMemo, useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, ScrollView, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { useApp } from '../context/AppContext';
import { useTheme } from '../hooks/useTheme';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import { Layout, Fonts } from '../constants/theme';
import { t, isRTL, getFlexDirection, formatCurrency } from '../utils/i18n';
import { Debt, DebtType } from '../types';
import { Ionicons } from '@expo/vector-icons';

const DebtsScreen = ({ navigation }: any) => {
    const { state, dispatch } = useApp();
    const { colors } = useTheme();
    const keyboardHeight = useKeyboardHeight();
    const lang = state.settings.language || 'en';
    const fontScale = state.settings.fontScale || 1;
    const rtl = isRTL(lang);
    const isAr = lang === 'ar';
    const currency = state.settings.currency;

    const debts = state.debts || [];
    const fmt = (n: number) => formatCurrency(n, currency, lang);
    const remainingOf = (d: Debt) => Math.max(0, d.amount - d.paidAmount);

    const [tab, setTab] = useState<DebtType>('owedToMe');

    const totals = useMemo(() => {
        let owed = 0, owe = 0;
        debts.forEach((d) => {
            const rem = Math.max(0, d.amount - d.paidAmount);
            if (d.type === 'owedToMe') owed += rem; else owe += rem;
        });
        return { owed, owe, net: owed - owe };
    }, [debts]);

    const visible = debts.filter((d) => d.type === tab);

    // Form
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [fType, setFType] = useState<DebtType>('owedToMe');
    const [fPerson, setFPerson] = useState('');
    const [fAmount, setFAmount] = useState('');
    const [fNote, setFNote] = useState('');
    const [fDue, setFDue] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Settle
    const [settleDebt, setSettleDebt] = useState<Debt | null>(null);
    const [settleAmount, setSettleAmount] = useState('');

    const openAdd = () => {
        setEditingId(null);
        setFType(tab); setFPerson(''); setFAmount(''); setFNote(''); setFDue(null);
        setShowForm(true);
    };

    const openEdit = (d: Debt) => {
        setEditingId(d.id);
        setFType(d.type); setFPerson(d.person); setFAmount(String(d.amount));
        setFNote(d.note || ''); setFDue(d.dueDate ? new Date(d.dueDate) : null);
        setShowForm(true);
    };

    const saveDebt = () => {
        const person = fPerson.trim();
        const amount = parseFloat(fAmount.replace(/,/g, ''));
        if (!person) {
            Alert.alert(isAr ? 'حقل مطلوب' : 'Missing field', isAr ? 'يرجى إدخال الاسم' : 'Please enter a name');
            return;
        }
        if (isNaN(amount) || amount <= 0) {
            Alert.alert(t('invalidAmount', lang), t('enterValidNumber', lang));
            return;
        }
        if (editingId) {
            const existing = debts.find((x) => x.id === editingId);
            dispatch({
                type: 'UPDATE_DEBT',
                payload: { id: editingId, type: fType, person, amount, paidAmount: Math.min(existing?.paidAmount || 0, amount), note: fNote.trim() || undefined, dueDate: fDue ? fDue.getTime() : undefined, createdAt: existing?.createdAt || Date.now() },
            });
        } else {
            dispatch({
                type: 'ADD_DEBT',
                payload: { id: Date.now().toString(), type: fType, person, amount, paidAmount: 0, note: fNote.trim() || undefined, dueDate: fDue ? fDue.getTime() : undefined, createdAt: Date.now() },
            });
        }
        setTab(fType);
        setShowForm(false);
    };

    const deleteDebt = (d: Debt) => {
        Alert.alert(
            t('deleteDebtTitle', lang),
            isAr ? `هل تريد حذف سجل "${d.person}"؟` : `Delete the record for "${d.person}"?`,
            [
                { text: t('cancel', lang), style: 'cancel' },
                { text: t('delete', lang), style: 'destructive', onPress: () => { dispatch({ type: 'DELETE_DEBT', payload: d.id }); setShowForm(false); } },
            ]
        );
    };

    const openSettle = (d: Debt) => { setSettleDebt(d); setSettleAmount(''); };

    const applySettle = (full: boolean) => {
        if (!settleDebt) return;
        const rem = remainingOf(settleDebt);
        const amt = full ? rem : parseFloat(settleAmount.replace(/,/g, ''));
        if (isNaN(amt) || amt <= 0) {
            Alert.alert(t('invalidAmount', lang), t('enterValidNumber', lang));
            return;
        }
        const newPaid = Math.min(settleDebt.amount, settleDebt.paidAmount + amt);
        dispatch({ type: 'UPDATE_DEBT', payload: { ...settleDebt, paidAmount: newPaid } });
        setSettleDebt(null);
    };

    const accent = tab === 'owedToMe' ? colors.success : colors.danger;

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
                    <Text style={[styles.title, { color: colors.text, fontSize: 18 * fontScale }]}>{t('debtsTitle', lang)}</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    {/* Summary */}
                    <View style={[styles.summaryCard, { backgroundColor: colors.card, flexDirection: getFlexDirection(lang) }]}>
                        <View style={styles.summaryCol}>
                            <Text style={[styles.summaryColLabel, { color: colors.textSecondary, fontSize: 11 * fontScale }]}>{t('owedToMe', lang)}</Text>
                            <Text style={[styles.summaryColValue, { color: colors.success, fontSize: 18 * fontScale }]} numberOfLines={1}>{fmt(totals.owed)}</Text>
                        </View>
                        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                        <View style={styles.summaryCol}>
                            <Text style={[styles.summaryColLabel, { color: colors.textSecondary, fontSize: 11 * fontScale }]}>{t('iOwe', lang)}</Text>
                            <Text style={[styles.summaryColValue, { color: colors.danger, fontSize: 18 * fontScale }]} numberOfLines={1}>{fmt(totals.owe)}</Text>
                        </View>
                        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                        <View style={styles.summaryCol}>
                            <Text style={[styles.summaryColLabel, { color: colors.textSecondary, fontSize: 11 * fontScale }]}>{t('netLabel', lang)}</Text>
                            <Text style={[styles.summaryColValue, { color: totals.net < 0 ? colors.danger : colors.text, fontSize: 18 * fontScale }]} numberOfLines={1}>{fmt(totals.net)}</Text>
                        </View>
                    </View>

                    {/* Tabs */}
                    <View style={[styles.tabRow, { backgroundColor: colors.card }]}>
                        {(['owedToMe', 'iOwe'] as DebtType[]).map((ty) => {
                            const active = tab === ty;
                            const c = ty === 'owedToMe' ? colors.success : colors.danger;
                            return (
                                <TouchableOpacity key={ty} style={[styles.tabBtn, active && { backgroundColor: c + '18' }]} onPress={() => setTab(ty)} activeOpacity={0.7}>
                                    <Text style={[styles.tabText, { color: active ? c : colors.textSecondary, fontSize: 14 * fontScale, fontFamily: active ? Fonts.bold : Fonts.medium }]}>{t(ty, lang)}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {visible.length === 0 ? (
                        <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
                            <Ionicons name="people-outline" size={44} color={colors.textSecondary} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary, fontSize: 14 * fontScale }]}>{t('noDebtsYet', lang)}</Text>
                        </View>
                    ) : (
                        visible.map((d) => {
                            const rem = remainingOf(d);
                            const settled = rem <= 0.001;
                            const pct = d.amount > 0 ? (d.paidAmount / d.amount) * 100 : 0;
                            const overdue = d.dueDate && !settled && dayjs(d.dueDate).isBefore(dayjs(), 'day');
                            return (
                                <TouchableOpacity key={d.id} style={[styles.card, { backgroundColor: colors.card }]} onLongPress={() => openEdit(d)} activeOpacity={0.8}>
                                    <View style={[styles.cardTop, { flexDirection: getFlexDirection(lang) }]}>
                                        <View style={[styles.avatar, { backgroundColor: accent + '1A' }]}>
                                            <Ionicons name="person" size={20} color={accent} />
                                        </View>
                                        <View style={[styles.cardInfo, rtl && { alignItems: 'flex-end' }]}>
                                            <Text style={[styles.person, { color: colors.text, fontSize: 16 * fontScale }]} numberOfLines={1}>{d.person}</Text>
                                            {!!d.note && <Text style={[styles.note, { color: colors.textSecondary, fontSize: 12 * fontScale }]} numberOfLines={1}>{d.note}</Text>}
                                            {!!d.dueDate && (
                                                <Text style={[styles.due, { color: overdue ? colors.danger : colors.textSecondary, fontSize: 11 * fontScale }]} numberOfLines={1}>
                                                    {dayjs(d.dueDate).format('MMM D, YYYY')}
                                                </Text>
                                            )}
                                        </View>
                                        <View style={rtl ? { alignItems: 'flex-start' } : { alignItems: 'flex-end' }}>
                                            <Text style={[styles.amount, { color: settled ? colors.textSecondary : accent, fontSize: 17 * fontScale }]} numberOfLines={1}>{fmt(rem)}</Text>
                                            {d.paidAmount > 0 && !settled && (
                                                <Text style={[styles.amountSub, { color: colors.textSecondary, fontSize: 11 * fontScale }]} numberOfLines={1}>{fmt(d.amount)}</Text>
                                            )}
                                        </View>
                                    </View>

                                    {d.paidAmount > 0 && !settled && (
                                        <View style={[styles.track, { backgroundColor: colors.border, flexDirection: rtl ? 'row-reverse' : 'row' }]}>
                                            <View style={[styles.fill, { width: `${Math.min(100, pct)}%`, backgroundColor: accent }]} />
                                        </View>
                                    )}

                                    <View style={[styles.cardActions, { flexDirection: getFlexDirection(lang) }]}>
                                        {settled ? (
                                            <View style={[styles.settledBadge, { backgroundColor: colors.success + '18', flexDirection: getFlexDirection(lang) }]}>
                                                <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                                                <Text style={[styles.settledText, { color: colors.success, fontSize: 12 * fontScale }]}>{t('settled', lang)}</Text>
                                            </View>
                                        ) : (
                                            <Text style={[styles.remainingText, { color: colors.textSecondary, fontSize: 12 * fontScale }]}>{fmt(rem)} {t('remaining', lang)}</Text>
                                        )}
                                        {!settled && (
                                            <TouchableOpacity style={[styles.settleBtn, { backgroundColor: accent + '15' }]} onPress={() => openSettle(d)}>
                                                <Text style={[styles.settleBtnText, { color: accent, fontSize: 13 * fontScale }]}>{t('settleUp', lang)}</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    )}

                    <TouchableOpacity style={[styles.addBtn, { borderColor: accent }]} onPress={openAdd} activeOpacity={0.7}>
                        <Ionicons name="add" size={18} color={accent} />
                        <Text style={[styles.addBtnText, { color: accent, fontSize: 15 * fontScale }]}>{t('addDebt', lang)}</Text>
                    </TouchableOpacity>

                    {visible.length > 0 && (
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
                            <Text style={[styles.modalTitle, { color: colors.text, fontSize: 18 * fontScale }]}>{editingId ? t('editDebt', lang) : t('newDebt', lang)}</Text>

                            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 440 }}>
                                {/* Type toggle */}
                                <View style={[styles.formTypeRow, { flexDirection: getFlexDirection(lang) }]}>
                                    {(['owedToMe', 'iOwe'] as DebtType[]).map((ty) => {
                                        const active = fType === ty;
                                        const c = ty === 'owedToMe' ? colors.success : colors.danger;
                                        return (
                                            <TouchableOpacity key={ty} style={[styles.formTypePill, { borderColor: colors.border }, active && { backgroundColor: c + '18', borderColor: c }]} onPress={() => setFType(ty)} activeOpacity={0.8}>
                                                <Text style={[styles.formTypeText, { color: active ? c : colors.textSecondary, fontSize: 14 * fontScale, fontFamily: active ? Fonts.bold : Fonts.medium }]}>{t(ty, lang)}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>

                                <TextInput
                                    style={[styles.fieldInput, { color: colors.text, borderColor: colors.border, fontSize: 15 * fontScale }, rtl && { textAlign: 'right' }]}
                                    placeholder={t('personNamePlaceholder', lang)} placeholderTextColor={colors.textSecondary}
                                    value={fPerson} onChangeText={setFPerson}
                                />

                                <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: 12 * fontScale }, rtl && { textAlign: 'right' }]}>{t('amount', lang)}</Text>
                                <TextInput
                                    style={[styles.fieldInput, { color: colors.text, borderColor: colors.border, fontSize: 15 * fontScale }, rtl && { textAlign: 'right' }]}
                                    placeholder="0" keyboardType="numeric" value={fAmount} onChangeText={setFAmount} placeholderTextColor={colors.textSecondary}
                                />

                                <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: 12 * fontScale }, rtl && { textAlign: 'right' }]}>{t('note', lang)}</Text>
                                <TextInput
                                    style={[styles.fieldInput, { color: colors.text, borderColor: colors.border, fontSize: 15 * fontScale }, rtl && { textAlign: 'right' }]}
                                    placeholder={t('whatsThisFor', lang)} placeholderTextColor={colors.textSecondary}
                                    value={fNote} onChangeText={setFNote}
                                />

                                <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: 12 * fontScale }, rtl && { textAlign: 'right' }]}>{t('dueDateOptional', lang)}</Text>
                                <View style={[styles.deadlineRow, { flexDirection: getFlexDirection(lang) }]}>
                                    <TouchableOpacity style={[styles.fieldInput, { flex: 1, borderColor: colors.border, justifyContent: 'center' }]} onPress={() => setShowDatePicker(true)}>
                                        <Text style={[{ color: fDue ? colors.text : colors.textSecondary, fontSize: 15 * fontScale }, rtl && { textAlign: 'right' }]}>
                                            {fDue ? dayjs(fDue).format('MMM D, YYYY') : (isAr ? 'اختر تاريخاً' : 'Pick a date')}
                                        </Text>
                                    </TouchableOpacity>
                                    {fDue && (
                                        <TouchableOpacity onPress={() => setFDue(null)} style={styles.clearDateBtn}>
                                            <Ionicons name="close" size={18} color={colors.danger} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                                {showDatePicker && (
                                    <DateTimePicker value={fDue || new Date()} mode="date" display="default" onChange={(e, d) => { setShowDatePicker(false); if (e.type === 'set' && d) setFDue(d); }} />
                                )}

                                {editingId && (
                                    <TouchableOpacity onPress={() => { const d = debts.find((x) => x.id === editingId); if (d) deleteDebt(d); }} style={styles.deleteLink} activeOpacity={0.7}>
                                        <Text style={[styles.deleteLinkText, { color: colors.danger, fontSize: 14 * fontScale }]}>{t('deleteDebtTitle', lang)}</Text>
                                    </TouchableOpacity>
                                )}
                            </ScrollView>

                            <View style={[styles.modalButtons, { flexDirection: getFlexDirection(lang) }]}>
                                <TouchableOpacity style={[styles.modalCancelBtn, { borderColor: colors.border }]} onPress={() => setShowForm(false)}>
                                    <Text style={[styles.modalCancelText, { color: colors.textSecondary, fontSize: 15 * fontScale }]}>{t('cancel', lang)}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]} onPress={saveDebt}>
                                    <Text style={[styles.modalSaveText, { fontSize: 15 * fontScale }]}>{t('save', lang)}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Settle modal */}
            <Modal visible={!!settleDebt} transparent animationType="fade" onRequestClose={() => setSettleDebt(null)}>
                <View style={{ flex: 1, paddingBottom: keyboardHeight }}>
                    <View style={styles.centerOverlay}>
                        <View style={[styles.settleSheet, { backgroundColor: colors.card }]}>
                            <Text style={[styles.modalTitle, { color: colors.text, fontSize: 17 * fontScale, marginBottom: 4 }]} numberOfLines={1}>{settleDebt?.person}</Text>
                            <Text style={[styles.settleRemaining, { color: colors.textSecondary, fontSize: 13 * fontScale }]}>
                                {settleDebt ? `${fmt(remainingOf(settleDebt))} ${t('remaining', lang)}` : ''}
                            </Text>
                            <TextInput
                                style={[styles.settleInput, { color: colors.text, borderColor: colors.primary, fontSize: 28 * fontScale }]}
                                placeholder="0" keyboardType="numeric" value={settleAmount} onChangeText={setSettleAmount} placeholderTextColor={colors.textSecondary} autoFocus
                            />
                            <View style={[styles.settleButtons, { flexDirection: getFlexDirection(lang) }]}>
                                <TouchableOpacity style={[styles.settleActionBtn, { borderColor: colors.border, borderWidth: 1.5 }]} onPress={() => applySettle(true)}>
                                    <Text style={[styles.settleActionText, { color: colors.text, fontSize: 14 * fontScale }]}>{t('markSettled', lang)}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.settleActionBtn, { backgroundColor: colors.primary }]} onPress={() => applySettle(false)}>
                                    <Text style={[styles.settleActionText, { color: '#FFF', fontSize: 14 * fontScale }]}>{t('settle', lang)}</Text>
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity style={styles.settleClose} onPress={() => setSettleDebt(null)}>
                                <Text style={[styles.settleCloseText, { color: colors.textSecondary, fontSize: 14 * fontScale }]}>{t('cancel', lang)}</Text>
                            </TouchableOpacity>
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

    summaryCard: { flexDirection: 'row', alignItems: 'center', borderRadius: Layout.borderRadius.lg, padding: Layout.spacing.md, marginBottom: Layout.spacing.md, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 2 },
    summaryCol: { flex: 1, alignItems: 'center' },
    summaryColLabel: { fontFamily: Fonts.semiBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
    summaryColValue: { fontFamily: Fonts.bold, fontSize: 18, marginTop: 4 },
    summaryDivider: { width: 1, height: 34 },

    tabRow: { flexDirection: 'row', borderRadius: Layout.borderRadius.md, padding: 4, marginBottom: Layout.spacing.md },
    tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: Layout.borderRadius.sm },
    tabText: { fontFamily: Fonts.medium, fontSize: 14 },

    emptyCard: { borderRadius: Layout.borderRadius.md, padding: Layout.spacing.xl, alignItems: 'center', gap: Layout.spacing.sm },
    emptyText: { fontFamily: Fonts.medium, textAlign: 'center' },

    card: { borderRadius: Layout.borderRadius.md, padding: Layout.spacing.md, marginBottom: Layout.spacing.sm, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 2 },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: Layout.spacing.md },
    avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
    cardInfo: { flex: 1 },
    person: { fontFamily: Fonts.bold, fontSize: 16 },
    note: { fontFamily: Fonts.regular, fontSize: 12, marginTop: 2 },
    due: { fontFamily: Fonts.medium, fontSize: 11, marginTop: 2 },
    amount: { fontFamily: Fonts.bold, fontSize: 17 },
    amountSub: { fontFamily: Fonts.regular, fontSize: 11, marginTop: 1, textDecorationLine: 'line-through' },

    track: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: Layout.spacing.sm },
    fill: { height: '100%', borderRadius: 3 },

    cardActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Layout.spacing.sm, gap: Layout.spacing.sm },
    remainingText: { flex: 1, fontFamily: Fonts.medium, fontSize: 12 },
    settledBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 },
    settledText: { fontFamily: Fonts.bold, fontSize: 12 },
    settleBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 16 },
    settleBtnText: { fontFamily: Fonts.bold, fontSize: 13 },

    addBtn: { flexDirection: 'row', gap: 6, marginTop: Layout.spacing.sm, paddingVertical: 14, borderRadius: Layout.borderRadius.md, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
    addBtnText: { fontFamily: Fonts.bold, fontSize: 15 },
    hint: { fontFamily: Fonts.regular, fontSize: 12, textAlign: 'center', marginTop: Layout.spacing.md },

    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    centerOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: Layout.spacing.lg },
    modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Layout.spacing.lg, paddingBottom: Layout.spacing.xl },
    modalHandleRow: { alignItems: 'center', marginBottom: Layout.spacing.sm },
    modalHandle: { width: 40, height: 4, borderRadius: 2 },
    modalTitle: { fontFamily: Fonts.bold, fontSize: 18, marginBottom: Layout.spacing.md, textAlign: 'center' },

    formTypeRow: { flexDirection: 'row', gap: Layout.spacing.sm, marginBottom: Layout.spacing.sm },
    formTypePill: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: Layout.borderRadius.sm, borderWidth: 1.5 },
    formTypeText: { fontFamily: Fonts.medium, fontSize: 14 },

    fieldLabel: { fontFamily: Fonts.semiBold, fontSize: 12, marginTop: Layout.spacing.md, marginBottom: 6 },
    fieldInput: { borderWidth: 1, borderRadius: Layout.borderRadius.sm, paddingHorizontal: Layout.spacing.md, paddingVertical: Platform.OS === 'ios' ? 12 : 8, fontFamily: Fonts.medium, fontSize: 15, minHeight: 48 },
    deadlineRow: { flexDirection: 'row', alignItems: 'center', gap: Layout.spacing.sm },
    clearDateBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

    deleteLink: { marginTop: Layout.spacing.lg, alignItems: 'center', paddingVertical: Layout.spacing.sm },
    deleteLinkText: { fontFamily: Fonts.semiBold, fontSize: 14 },

    modalButtons: { flexDirection: 'row', gap: Layout.spacing.md, marginTop: Layout.spacing.lg },
    modalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: Layout.borderRadius.md, borderWidth: 1.5, alignItems: 'center' },
    modalCancelText: { fontFamily: Fonts.semiBold, fontSize: 15 },
    modalSaveBtn: { flex: 2, paddingVertical: 14, borderRadius: Layout.borderRadius.md, alignItems: 'center' },
    modalSaveText: { fontFamily: Fonts.bold, fontSize: 15, color: '#FFFFFF' },

    settleSheet: { width: '90%', maxWidth: 360, borderRadius: 24, padding: Layout.spacing.lg },
    settleRemaining: { fontFamily: Fonts.medium, fontSize: 13, textAlign: 'center', marginBottom: Layout.spacing.sm },
    settleInput: { borderBottomWidth: 2, textAlign: 'center', fontFamily: Fonts.bold, fontSize: 28, paddingVertical: Layout.spacing.sm, marginBottom: Layout.spacing.lg },
    settleButtons: { flexDirection: 'row', gap: Layout.spacing.md },
    settleActionBtn: { flex: 1, paddingVertical: 13, borderRadius: Layout.borderRadius.md, alignItems: 'center' },
    settleActionText: { fontFamily: Fonts.bold, fontSize: 14 },
    settleClose: { alignItems: 'center', paddingVertical: Layout.spacing.md, marginTop: 4 },
    settleCloseText: { fontFamily: Fonts.semiBold, fontSize: 14 },
});

export default DebtsScreen;

import React, { useState } from 'react';
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
import { Layout, Fonts } from '../constants/theme';
import { isRTL, getFlexDirection } from '../utils/i18n';
import { SavingsGoal } from '../types';

const SavingsGoalsScreen = ({ navigation }: any) => {
    const { state, dispatch } = useApp();
    const { colors } = useTheme();
    const lang = state.settings.language || 'en';
    const fontScale = state.settings.fontScale || 1;
    const rtl = isRTL(lang);
    const isAr = lang === 'ar';
    const symbol = state.settings.currency?.symbol || '';

    const goals = state.savingsGoals || [];

    // Goal form
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [fName, setFName] = useState('');
    const [fEmoji, setFEmoji] = useState('🎯');
    const [fTarget, setFTarget] = useState('');
    const [fSaved, setFSaved] = useState('');
    const [fDeadline, setFDeadline] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Add money
    const [moneyGoal, setMoneyGoal] = useState<SavingsGoal | null>(null);
    const [moneyAmount, setMoneyAmount] = useState('');

    const fmt = (n: number) => `${symbol}${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

    const openAdd = () => {
        setEditingId(null);
        setFName(''); setFEmoji('🎯'); setFTarget(''); setFSaved(''); setFDeadline(null);
        setShowForm(true);
    };

    const openEdit = (g: SavingsGoal) => {
        setEditingId(g.id);
        setFName(g.name); setFEmoji(g.emoji); setFTarget(String(g.targetAmount));
        setFSaved(String(g.savedAmount)); setFDeadline(g.deadline ? new Date(g.deadline) : null);
        setShowForm(true);
    };

    const saveGoal = () => {
        const name = fName.trim();
        const target = parseFloat(fTarget);
        const saved = parseFloat(fSaved) || 0;
        if (!name) {
            Alert.alert(isAr ? 'حقل مطلوب' : 'Missing field', isAr ? 'يرجى إدخال اسم الهدف' : 'Please enter a goal name');
            return;
        }
        if (isNaN(target) || target <= 0) {
            Alert.alert(isAr ? 'مبلغ غير صالح' : 'Invalid amount', isAr ? 'يرجى إدخال مبلغ مستهدف صالح' : 'Please enter a valid target amount');
            return;
        }
        if (editingId) {
            const existing = goals.find((x) => x.id === editingId);
            dispatch({
                type: 'UPDATE_SAVINGS_GOAL',
                payload: { id: editingId, name, emoji: fEmoji || '🎯', targetAmount: target, savedAmount: Math.max(0, saved), createdAt: existing?.createdAt || Date.now(), deadline: fDeadline ? fDeadline.getTime() : undefined },
            });
        } else {
            dispatch({
                type: 'ADD_SAVINGS_GOAL',
                payload: { id: Date.now().toString(), name, emoji: fEmoji || '🎯', targetAmount: target, savedAmount: Math.max(0, saved), createdAt: Date.now(), deadline: fDeadline ? fDeadline.getTime() : undefined },
            });
        }
        setShowForm(false);
    };

    const deleteGoal = (g: SavingsGoal) => {
        Alert.alert(
            isAr ? 'حذف الهدف' : 'Delete goal',
            isAr ? `هل تريد حذف "${g.name}"؟` : `Delete "${g.name}"?`,
            [
                { text: isAr ? 'إلغاء' : 'Cancel', style: 'cancel' },
                { text: isAr ? 'حذف' : 'Delete', style: 'destructive', onPress: () => { dispatch({ type: 'DELETE_SAVINGS_GOAL', payload: g.id }); setShowForm(false); } },
            ]
        );
    };

    const openMoney = (g: SavingsGoal) => { setMoneyGoal(g); setMoneyAmount(''); };

    const addMoney = (sign: 1 | -1) => {
        if (!moneyGoal) return;
        const amt = parseFloat(moneyAmount);
        if (isNaN(amt) || amt <= 0) {
            Alert.alert(isAr ? 'مبلغ غير صالح' : 'Invalid amount', isAr ? 'يرجى إدخال مبلغ صالح' : 'Please enter a valid amount');
            return;
        }
        const newSaved = Math.max(0, moneyGoal.savedAmount + sign * amt);
        dispatch({ type: 'UPDATE_SAVINGS_GOAL', payload: { ...moneyGoal, savedAmount: newSaved } });
        setMoneyGoal(null);
    };

    const totalSaved = goals.reduce((s, g) => s + g.savedAmount, 0);
    const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);

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
                    <Text style={[styles.title, { color: colors.text, fontSize: 18 * fontScale }]}>{isAr ? 'أهداف الادخار' : 'Savings Goals'}</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    {/* Summary */}
                    {goals.length > 0 && (
                        <View style={[styles.summaryCard, { backgroundColor: colors.primary }]}>
                            <Text style={styles.summaryLabel}>{isAr ? 'إجمالي المدخرات' : 'TOTAL SAVED'}</Text>
                            <Text style={styles.summaryValue}>{fmt(totalSaved)}</Text>
                            <Text style={styles.summarySub}>{isAr ? `من ${fmt(totalTarget)}` : `of ${fmt(totalTarget)}`}</Text>
                        </View>
                    )}

                    {goals.length === 0 ? (
                        <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
                            <Text style={{ fontSize: 40 }}>🎯</Text>
                            <Text style={[styles.emptyText, { color: colors.textSecondary, fontSize: 14 * fontScale }]}>
                                {isAr ? 'لا توجد أهداف ادخار بعد' : 'No savings goals yet'}
                            </Text>
                        </View>
                    ) : (
                        goals.map((g) => {
                            const pct = g.targetAmount > 0 ? (g.savedAmount / g.targetAmount) * 100 : 0;
                            const done = g.savedAmount >= g.targetAmount && g.targetAmount > 0;
                            const barColor = done ? colors.success : colors.primary;
                            const remaining = Math.max(0, g.targetAmount - g.savedAmount);
                            return (
                                <TouchableOpacity
                                    key={g.id}
                                    style={[styles.goalCard, { backgroundColor: colors.card }]}
                                    onLongPress={() => openEdit(g)}
                                    activeOpacity={0.8}
                                >
                                    <View style={[styles.goalTop, { flexDirection: getFlexDirection(lang) }]}>
                                        <View style={[styles.goalBadge, { backgroundColor: barColor + '1A' }]}>
                                            <Text style={{ fontSize: 22 }}>{g.emoji}</Text>
                                        </View>
                                        <View style={[styles.goalInfo, rtl && { alignItems: 'flex-end' }]}>
                                            <Text style={[styles.goalName, { color: colors.text, fontSize: 16 * fontScale }]} numberOfLines={1}>{g.name}</Text>
                                            <Text style={[styles.goalAmounts, { color: colors.textSecondary, fontSize: 13 * fontScale }]} numberOfLines={1}>
                                                {fmt(g.savedAmount)} / {fmt(g.targetAmount)}
                                            </Text>
                                        </View>
                                        <Text style={[styles.goalPct, { color: barColor, fontSize: 16 * fontScale }]}>{Math.round(pct)}%</Text>
                                    </View>

                                    {/* Progress bar */}
                                    <View style={[styles.track, { backgroundColor: colors.border, flexDirection: rtl ? 'row-reverse' : 'row' }]}>
                                        <View style={[styles.fill, { width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: barColor }]} />
                                    </View>

                                    <View style={[styles.goalBottom, { flexDirection: getFlexDirection(lang) }]}>
                                        <Text style={[styles.goalMeta, { color: colors.textSecondary, fontSize: 12 * fontScale }]}>
                                            {done
                                                ? (isAr ? '🎉 تم تحقيق الهدف' : '🎉 Goal reached')
                                                : (isAr ? `متبقي ${fmt(remaining)}` : `${fmt(remaining)} to go`)}
                                            {g.deadline ? ` · ${dayjs(g.deadline).format('MMM D, YYYY')}` : ''}
                                        </Text>
                                        <TouchableOpacity style={[styles.moneyBtn, { backgroundColor: barColor + '15' }]} onPress={() => openMoney(g)}>
                                            <Text style={[styles.moneyBtnText, { color: barColor, fontSize: 13 * fontScale }]}>{isAr ? '＋ إضافة' : '＋ Add money'}</Text>
                                        </TouchableOpacity>
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    )}

                    <TouchableOpacity style={[styles.addBtn, { borderColor: colors.primary }]} onPress={openAdd} activeOpacity={0.7}>
                        <Text style={[styles.addBtnText, { color: colors.primary, fontSize: 15 * fontScale }]}>
                            {isAr ? '＋ إضافة هدف' : '＋ Add goal'}
                        </Text>
                    </TouchableOpacity>

                    {goals.length > 0 && (
                        <Text style={[styles.hint, { color: colors.textSecondary, fontSize: 12 * fontScale }]}>
                            {isAr ? 'اضغط مطولاً للتعديل' : 'Long-press a goal to edit'}
                        </Text>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Goal form modal */}
            <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
                            <View style={styles.modalHandleRow}><View style={[styles.modalHandle, { backgroundColor: colors.border }]} /></View>
                            <Text style={[styles.modalTitle, { color: colors.text, fontSize: 18 * fontScale }]}>
                                {editingId ? (isAr ? 'تعديل الهدف' : 'Edit goal') : (isAr ? 'هدف جديد' : 'New goal')}
                            </Text>

                            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 420 }}>
                                <View style={[styles.emojiNameRow, { flexDirection: getFlexDirection(lang) }]}>
                                    <TextInput
                                        style={[styles.emojiInput, { borderColor: colors.border, color: colors.text }]}
                                        value={fEmoji} onChangeText={(v) => setFEmoji(v.slice(-2))} maxLength={2}
                                    />
                                    <TextInput
                                        style={[styles.fieldInput, { flex: 1, color: colors.text, borderColor: colors.border, fontSize: 15 * fontScale }, rtl && { textAlign: 'right' }]}
                                        placeholder={isAr ? 'اسم الهدف (مثال: سيارة)' : 'Goal name (e.g. New car)'}
                                        placeholderTextColor={colors.textSecondary}
                                        value={fName} onChangeText={setFName}
                                    />
                                </View>

                                <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: 12 * fontScale }, rtl && { textAlign: 'right' }]}>{isAr ? 'المبلغ المستهدف' : 'Target amount'}</Text>
                                <TextInput
                                    style={[styles.fieldInput, { color: colors.text, borderColor: colors.border, fontSize: 15 * fontScale }, rtl && { textAlign: 'right' }]}
                                    placeholder="0" keyboardType="numeric" value={fTarget} onChangeText={setFTarget} placeholderTextColor={colors.textSecondary}
                                />

                                <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: 12 * fontScale }, rtl && { textAlign: 'right' }]}>{isAr ? 'المبلغ المدخر حالياً' : 'Already saved'}</Text>
                                <TextInput
                                    style={[styles.fieldInput, { color: colors.text, borderColor: colors.border, fontSize: 15 * fontScale }, rtl && { textAlign: 'right' }]}
                                    placeholder="0" keyboardType="numeric" value={fSaved} onChangeText={setFSaved} placeholderTextColor={colors.textSecondary}
                                />

                                <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: 12 * fontScale }, rtl && { textAlign: 'right' }]}>{isAr ? 'الموعد النهائي (اختياري)' : 'Deadline (optional)'}</Text>
                                <View style={[styles.deadlineRow, { flexDirection: getFlexDirection(lang) }]}>
                                    <TouchableOpacity style={[styles.fieldInput, { flex: 1, borderColor: colors.border, justifyContent: 'center' }]} onPress={() => setShowDatePicker(true)}>
                                        <Text style={[{ color: fDeadline ? colors.text : colors.textSecondary, fontSize: 15 * fontScale }, rtl && { textAlign: 'right' }]}>
                                            {fDeadline ? dayjs(fDeadline).format('MMM D, YYYY') : (isAr ? 'اختر تاريخاً' : 'Pick a date')}
                                        </Text>
                                    </TouchableOpacity>
                                    {fDeadline && (
                                        <TouchableOpacity onPress={() => setFDeadline(null)} style={styles.clearDateBtn}>
                                            <Text style={{ color: colors.danger, fontSize: 16 }}>✕</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                                {showDatePicker && (
                                    <DateTimePicker
                                        value={fDeadline || new Date()}
                                        mode="date"
                                        display="default"
                                        onChange={(e, d) => { setShowDatePicker(false); if (e.type === 'set' && d) setFDeadline(d); }}
                                    />
                                )}

                                {editingId && (
                                    <TouchableOpacity onPress={() => { const g = goals.find((x) => x.id === editingId); if (g) deleteGoal(g); }} style={styles.deleteLink} activeOpacity={0.7}>
                                        <Text style={[styles.deleteLinkText, { color: colors.danger, fontSize: 14 * fontScale }]}>{isAr ? 'حذف الهدف' : 'Delete goal'}</Text>
                                    </TouchableOpacity>
                                )}
                            </ScrollView>

                            <View style={[styles.modalButtons, { flexDirection: getFlexDirection(lang) }]}>
                                <TouchableOpacity style={[styles.modalCancelBtn, { borderColor: colors.border }]} onPress={() => setShowForm(false)}>
                                    <Text style={[styles.modalCancelText, { color: colors.textSecondary, fontSize: 15 * fontScale }]}>{isAr ? 'إلغاء' : 'Cancel'}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]} onPress={saveGoal}>
                                    <Text style={[styles.modalSaveText, { fontSize: 15 * fontScale }]}>{isAr ? 'حفظ' : 'Save'}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Add money modal */}
            <Modal visible={!!moneyGoal} transparent animationType="fade" onRequestClose={() => setMoneyGoal(null)}>
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <View style={styles.centerOverlay}>
                        <View style={[styles.moneySheet, { backgroundColor: colors.card }]}>
                            <Text style={[styles.modalTitle, { color: colors.text, fontSize: 17 * fontScale }]} numberOfLines={1}>
                                {moneyGoal?.emoji} {moneyGoal?.name}
                            </Text>
                            <TextInput
                                style={[styles.moneyInput, { color: colors.text, borderColor: colors.primary, fontSize: 28 * fontScale }]}
                                placeholder={`${symbol}0`} keyboardType="numeric" value={moneyAmount} onChangeText={setMoneyAmount} placeholderTextColor={colors.textSecondary} autoFocus
                            />
                            <View style={[styles.moneyButtons, { flexDirection: getFlexDirection(lang) }]}>
                                <TouchableOpacity style={[styles.moneyActionBtn, { borderColor: colors.danger, borderWidth: 1.5 }]} onPress={() => addMoney(-1)}>
                                    <Text style={[styles.moneyActionText, { color: colors.danger, fontSize: 14 * fontScale }]}>{isAr ? 'سحب' : 'Withdraw'}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.moneyActionBtn, { backgroundColor: colors.success }]} onPress={() => addMoney(1)}>
                                    <Text style={[styles.moneyActionText, { color: '#FFF', fontSize: 14 * fontScale }]}>{isAr ? 'إضافة' : 'Add'}</Text>
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity style={styles.shareClose} onPress={() => setMoneyGoal(null)}>
                                <Text style={[styles.shareCloseText, { color: colors.textSecondary, fontSize: 14 * fontScale }]}>{isAr ? 'إغلاق' : 'Close'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
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
    emptyText: { fontFamily: Fonts.medium, textAlign: 'center' },

    goalCard: { borderRadius: Layout.borderRadius.md, padding: Layout.spacing.md, marginBottom: Layout.spacing.sm, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 2 },
    goalTop: { flexDirection: 'row', alignItems: 'center', gap: Layout.spacing.md },
    goalBadge: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    goalInfo: { flex: 1 },
    goalName: { fontFamily: Fonts.bold, fontSize: 16 },
    goalAmounts: { fontFamily: Fonts.regular, fontSize: 13, marginTop: 2 },
    goalPct: { fontFamily: Fonts.bold, fontSize: 16 },

    track: { height: 10, borderRadius: 5, overflow: 'hidden', marginTop: Layout.spacing.md },
    fill: { height: '100%', borderRadius: 5 },

    goalBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Layout.spacing.sm, gap: Layout.spacing.sm },
    goalMeta: { flex: 1, fontFamily: Fonts.medium, fontSize: 12 },
    moneyBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16 },
    moneyBtnText: { fontFamily: Fonts.bold, fontSize: 13 },

    addBtn: { marginTop: Layout.spacing.sm, paddingVertical: 14, borderRadius: Layout.borderRadius.md, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
    addBtnText: { fontFamily: Fonts.bold, fontSize: 15 },
    hint: { fontFamily: Fonts.regular, fontSize: 12, textAlign: 'center', marginTop: Layout.spacing.md },

    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    centerOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: Layout.spacing.lg },
    modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Layout.spacing.lg, paddingBottom: Layout.spacing.xl },
    modalHandleRow: { alignItems: 'center', marginBottom: Layout.spacing.sm },
    modalHandle: { width: 40, height: 4, borderRadius: 2 },
    modalTitle: { fontFamily: Fonts.bold, fontSize: 18, marginBottom: Layout.spacing.md, textAlign: 'center' },

    emojiNameRow: { flexDirection: 'row', alignItems: 'center', gap: Layout.spacing.sm },
    emojiInput: { width: 52, height: 48, borderWidth: 1, borderRadius: Layout.borderRadius.sm, textAlign: 'center', fontSize: 22 },
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

    moneySheet: { width: '90%', maxWidth: 360, borderRadius: 24, padding: Layout.spacing.lg },
    moneyInput: { borderBottomWidth: 2, textAlign: 'center', fontFamily: Fonts.bold, fontSize: 28, paddingVertical: Layout.spacing.sm, marginBottom: Layout.spacing.lg },
    moneyButtons: { flexDirection: 'row', gap: Layout.spacing.md },
    moneyActionBtn: { flex: 1, paddingVertical: 13, borderRadius: Layout.borderRadius.md, alignItems: 'center' },
    moneyActionText: { fontFamily: Fonts.bold, fontSize: 14 },
    shareClose: { alignItems: 'center', paddingVertical: Layout.spacing.md, marginTop: 4 },
    shareCloseText: { fontFamily: Fonts.semiBold, fontSize: 14 },
});

export default SavingsGoalsScreen;

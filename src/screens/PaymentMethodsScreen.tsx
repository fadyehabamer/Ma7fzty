import React, { useState, useRef } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, ScrollView, Alert, Modal, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import AppIcon from '../components/common/AppIcon';
import QRCode from 'react-native-qrcode-svg';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useApp } from '../context/AppContext';
import { useTheme } from '../hooks/useTheme';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import { Layout, Fonts } from '../constants/theme';
import { isRTL, getFlexDirection } from '../utils/i18n';
import { PaymentMethod, PaymentMethodType } from '../types';
import {
    PAYMENT_TYPES, getPaymentType, typeLabel, fieldLabel, optionLabel,
} from '../constants/paymentTypes';
import {
    buildShareText, getQRValue, methodTitle, methodPreview,
} from '../utils/paymentShare';

const PaymentMethodsScreen = ({ navigation }: any) => {
    const { state, dispatch } = useApp();
    const { colors } = useTheme();
    const keyboardHeight = useKeyboardHeight();
    const lang = state.settings.language || 'en';
    const fontScale = state.settings.fontScale || 1;
    const rtl = isRTL(lang);
    const isAr = lang === 'ar';

    const methods = state.paymentMethods || [];

    // Profile name (kept local, persisted on blur)
    const [name, setName] = useState(state.settings.profileName || '');

    // Add / edit form state
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formType, setFormType] = useState<PaymentMethodType | null>(null);
    const [formLabel, setFormLabel] = useState('');
    const [formFields, setFormFields] = useState<Record<string, string>>({});

    // Share modal state
    const [shareMethod, setShareMethod] = useState<PaymentMethod | null>(null);
    const qrRef = useRef<any>(null);

    /* ── Form helpers ─────────────────────────────── */
    const initFieldsForType = (type: PaymentMethodType): Record<string, string> => {
        const def = getPaymentType(type);
        const init: Record<string, string> = {};
        def.fields.forEach((f) => {
            if (f.options && f.options.length) init[f.key] = f.options[0].value;
        });
        return init;
    };

    const openAdd = () => {
        setEditingId(null);
        setFormType(null);
        setFormLabel('');
        setFormFields({});
        setShowForm(true);
    };

    const openEdit = (m: PaymentMethod) => {
        setEditingId(m.id);
        setFormType(m.type);
        setFormLabel(m.label || '');
        setFormFields({ ...m.fields });
        setShowForm(true);
    };

    const pickType = (type: PaymentMethodType) => {
        setFormType(type);
        setFormFields(initFieldsForType(type));
    };

    const handleSaveForm = () => {
        if (!formType) return;
        const def = getPaymentType(formType);

        // Validate required fields
        const missing = def.fields.find((f) => !f.optional && !(formFields[f.key] || '').trim());
        if (missing) {
            Alert.alert(
                isAr ? 'حقل مطلوب' : 'Missing field',
                isAr ? `يرجى إدخال: ${fieldLabel(missing, lang)}` : `Please enter: ${fieldLabel(missing, lang)}`
            );
            return;
        }

        // Trim all stored values
        const cleaned: Record<string, string> = {};
        Object.keys(formFields).forEach((k) => { cleaned[k] = (formFields[k] || '').trim(); });

        if (editingId) {
            const existing = methods.find((m) => m.id === editingId);
            dispatch({
                type: 'UPDATE_PAYMENT_METHOD',
                payload: { id: editingId, type: formType, label: formLabel.trim() || undefined, fields: cleaned, createdAt: existing?.createdAt || Date.now() },
            });
        } else {
            dispatch({
                type: 'ADD_PAYMENT_METHOD',
                payload: { id: Date.now().toString(), type: formType, label: formLabel.trim() || undefined, fields: cleaned, createdAt: Date.now() },
            });
        }
        setShowForm(false);
    };

    const handleDelete = (m: PaymentMethod) => {
        Alert.alert(
            isAr ? 'حذف طريقة الدفع' : 'Delete payment method',
            isAr ? `هل تريد حذف "${methodTitle(m, lang)}"؟` : `Delete "${methodTitle(m, lang)}"?`,
            [
                { text: isAr ? 'إلغاء' : 'Cancel', style: 'cancel' },
                {
                    text: isAr ? 'حذف' : 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        dispatch({ type: 'DELETE_PAYMENT_METHOD', payload: m.id });
                        setShowForm(false);
                    },
                },
            ]
        );
    };

    /* ── Sharing ──────────────────────────────────── */
    const shareText = async (m: PaymentMethod) => {
        try {
            await Share.share({ message: buildShareText([m], name, lang) });
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not share');
        }
    };

    const shareImage = async () => {
        if (!qrRef.current) return;
        try {
            qrRef.current.toDataURL(async (data: string) => {
                try {
                    const path = `${(FileSystem as any).cacheDirectory}payment_qr_${Date.now()}.png`;
                    await FileSystem.writeAsStringAsync(path, data, { encoding: 'base64' as any });
                    if (await Sharing.isAvailableAsync()) {
                        await Sharing.shareAsync(path, { mimeType: 'image/png', dialogTitle: isAr ? 'مشاركة الكود' : 'Share QR' });
                    }
                } catch (e: any) {
                    Alert.alert('Error', e.message || 'Could not share image');
                }
            });
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not share image');
        }
    };

    const persistName = () => {
        if ((state.settings.profileName || '') !== name) {
            dispatch({ type: 'SET_PROFILE_NAME', payload: name });
        }
    };

    const formDef = formType ? getPaymentType(formType) : null;
    const shareQRValue = shareMethod ? getQRValue(shareMethod) : '';

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
                    <Text style={[styles.title, { color: colors.text, fontSize: 18 * fontScale }]}>{isAr ? 'معلومات الدفع' : 'Payment Info'}</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    {/* Your name */}
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontSize: 13 * fontScale }, rtl && { textAlign: 'right' }]}>
                        {isAr ? 'الاسم' : 'Your name'}
                    </Text>
                    <View style={[styles.nameCard, { backgroundColor: colors.card }]}>
                        <TextInput
                            style={[styles.nameInput, { color: colors.text, fontSize: 16 * fontScale }, rtl && { textAlign: 'right' }]}
                            placeholder={isAr ? 'اسمك (يظهر عند المشاركة)' : 'Your name (shown when sharing)'}
                            placeholderTextColor={colors.textSecondary}
                            value={name}
                            onChangeText={setName}
                            onEndEditing={persistName}
                            onBlur={persistName}
                        />
                    </View>

                    {/* Methods */}
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontSize: 13 * fontScale, marginTop: Layout.spacing.lg }, rtl && { textAlign: 'right' }]}>
                        {isAr ? 'طرق الدفع' : 'Payment methods'}
                    </Text>

                    {methods.length === 0 ? (
                        <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
                            <Ionicons name="card-outline" size={40} color={colors.textSecondary} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary, fontSize: 14 * fontScale }]}>
                                {isAr ? 'لم تتم إضافة أي طريقة دفع بعد' : 'No payment methods yet'}
                            </Text>
                        </View>
                    ) : (
                        methods.map((m) => {
                            const def = getPaymentType(m.type);
                            return (
                                <TouchableOpacity
                                    key={m.id}
                                    style={[styles.methodCard, { backgroundColor: colors.card, flexDirection: getFlexDirection(lang) }]}
                                    onPress={() => setShareMethod(m)}
                                    onLongPress={() => openEdit(m)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.methodBadge, { backgroundColor: def.color + '1A' }]}>
                                        <AppIcon name={def.emoji} size={22} color={def.color} />
                                    </View>
                                    <View style={[styles.methodInfo, rtl && { alignItems: 'flex-end' }]}>
                                        <Text style={[styles.methodTitle, { color: colors.text, fontSize: 16 * fontScale }]} numberOfLines={1}>
                                            {methodTitle(m, lang)}
                                        </Text>
                                        <Text style={[styles.methodPreview, { color: colors.textSecondary, fontSize: 13 * fontScale }]} numberOfLines={1}>
                                            {methodPreview(m, lang)}
                                        </Text>
                                    </View>
                                    <ShareGlyph color={colors.primary} />
                                </TouchableOpacity>
                            );
                        })
                    )}

                    {/* Add button */}
                    <TouchableOpacity style={[styles.addBtn, { borderColor: colors.primary }]} onPress={openAdd} activeOpacity={0.7}>
                        <Text style={[styles.addBtnText, { color: colors.primary, fontSize: 15 * fontScale }]}>
                            {isAr ? '＋ إضافة طريقة دفع' : '＋ Add payment method'}
                        </Text>
                    </TouchableOpacity>

                    {methods.length > 0 && (
                        <Text style={[styles.hint, { color: colors.textSecondary, fontSize: 12 * fontScale }]}>
                            {isAr ? 'اضغط للمشاركة • اضغط مطولاً للتعديل' : 'Tap to share • Long-press to edit'}
                        </Text>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>

            {/* ── Add / Edit Modal ─────────────────────── */}
            <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
                <View style={{ flex: 1, paddingBottom: keyboardHeight }}>
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
                            <View style={[styles.modalHandleRow]}>
                                <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
                            </View>
                            <Text style={[styles.modalTitle, { color: colors.text, fontSize: 18 * fontScale }]}>
                                {editingId ? (isAr ? 'تعديل طريقة الدفع' : 'Edit payment method') : (isAr ? 'طريقة دفع جديدة' : 'New payment method')}
                            </Text>

                            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 460 }}>
                                {!formType ? (
                                    /* Type picker */
                                    <View style={styles.typeGrid}>
                                        {PAYMENT_TYPES.map((def) => (
                                            <TouchableOpacity
                                                key={def.key}
                                                style={[styles.typeCard, { backgroundColor: colors.background, borderColor: colors.border }]}
                                                onPress={() => pickType(def.key)}
                                                activeOpacity={0.7}
                                            >
                                                <View style={[styles.typeBadge, { backgroundColor: def.color + '1A' }]}>
                                                    <AppIcon name={def.emoji} size={22} color={def.color} />
                                                </View>
                                                <Text style={[styles.typeName, { color: colors.text, fontSize: 13 * fontScale }]} numberOfLines={1}>
                                                    {typeLabel(def, lang)}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                ) : (
                                    /* Fields */
                                    <View>
                                        <TouchableOpacity
                                            style={[styles.selectedTypeRow, { flexDirection: getFlexDirection(lang), backgroundColor: colors.background, borderColor: colors.border }]}
                                            onPress={() => { if (!editingId) setFormType(null); }}
                                            activeOpacity={editingId ? 1 : 0.7}
                                        >
                                            <View style={[styles.typeBadge, { backgroundColor: (formDef?.color || colors.primary) + '1A', marginBottom: 0 }]}>
                                                <AppIcon name={formDef?.emoji} size={20} color={formDef?.color || colors.primary} />
                                            </View>
                                            <Text style={[styles.rowLabel, { color: colors.text, fontSize: 15 * fontScale, flex: 1 }, rtl && { textAlign: 'right' }]}>
                                                {formDef ? typeLabel(formDef, lang) : ''}
                                            </Text>
                                            {!editingId && (
                                                <Text style={{ color: colors.primary, fontSize: 13 * fontScale }}>{isAr ? 'تغيير' : 'Change'}</Text>
                                            )}
                                        </TouchableOpacity>

                                        {/* Optional nickname */}
                                        <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: 12 * fontScale }, rtl && { textAlign: 'right' }]}>
                                            {isAr ? 'اسم مختصر (اختياري)' : 'Nickname (optional)'}
                                        </Text>
                                        <TextInput
                                            style={[styles.fieldInput, { color: colors.text, borderColor: colors.border, fontSize: 15 * fontScale }, rtl && { textAlign: 'right' }]}
                                            placeholder={isAr ? 'مثال: حسابي في CIB' : 'e.g. My CIB account'}
                                            placeholderTextColor={colors.textSecondary}
                                            value={formLabel}
                                            onChangeText={setFormLabel}
                                        />

                                        {formDef?.fields.map((f) => (
                                            <View key={f.key}>
                                                <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: 12 * fontScale }, rtl && { textAlign: 'right' }]}>
                                                    {fieldLabel(f, lang)}{f.optional ? (isAr ? ' (اختياري)' : ' (optional)') : ''}
                                                </Text>
                                                {f.options ? (
                                                    <View style={[styles.chipRow, rtl && { flexDirection: 'row-reverse' }]}>
                                                        {f.options.map((opt) => {
                                                            const active = formFields[f.key] === opt.value;
                                                            return (
                                                                <TouchableOpacity
                                                                    key={opt.value}
                                                                    style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.background }, active && { borderColor: colors.primary, backgroundColor: colors.primary + '15' }]}
                                                                    onPress={() => setFormFields((prev) => ({ ...prev, [f.key]: opt.value }))}
                                                                    activeOpacity={0.7}
                                                                >
                                                                    <Text style={[styles.chipText, { color: colors.textSecondary, fontSize: 13 * fontScale }, active && { color: colors.primary, fontFamily: Fonts.bold }]}>
                                                                        {lang === 'ar' ? opt.ar : opt.en}
                                                                    </Text>
                                                                </TouchableOpacity>
                                                            );
                                                        })}
                                                    </View>
                                                ) : (
                                                    <TextInput
                                                        style={[styles.fieldInput, { color: colors.text, borderColor: colors.border, fontSize: 15 * fontScale }, rtl && { textAlign: 'right' }]}
                                                        placeholder={f.placeholder || ''}
                                                        placeholderTextColor={colors.textSecondary}
                                                        value={formFields[f.key] || ''}
                                                        onChangeText={(v) => setFormFields((prev) => ({ ...prev, [f.key]: v }))}
                                                        keyboardType={f.keyboardType || 'default'}
                                                        autoCapitalize={f.keyboardType === 'email-address' ? 'none' : 'sentences'}
                                                    />
                                                )}
                                            </View>
                                        ))}

                                        {editingId && (
                                            <TouchableOpacity onPress={() => { const m = methods.find((x) => x.id === editingId); if (m) handleDelete(m); }} style={styles.deleteLink} activeOpacity={0.7}>
                                                <Text style={[styles.deleteLinkText, { color: colors.danger, fontSize: 14 * fontScale }]}>
                                                    {isAr ? 'حذف طريقة الدفع' : 'Delete payment method'}
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                )}
                            </ScrollView>

                            <View style={[styles.modalButtons, { flexDirection: getFlexDirection(lang) }]}>
                                <TouchableOpacity style={[styles.modalCancelBtn, { borderColor: colors.border }]} onPress={() => setShowForm(false)}>
                                    <Text style={[styles.modalCancelText, { color: colors.textSecondary, fontSize: 15 * fontScale }]}>{isAr ? 'إلغاء' : 'Cancel'}</Text>
                                </TouchableOpacity>
                                {formType && (
                                    <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]} onPress={handleSaveForm}>
                                        <Text style={[styles.modalSaveText, { fontSize: 15 * fontScale }]}>{isAr ? 'حفظ' : 'Save'}</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ── Share Modal ──────────────────────────── */}
            <Modal visible={!!shareMethod} transparent animationType="fade" onRequestClose={() => setShareMethod(null)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.shareSheet, { backgroundColor: colors.card }]}>
                        {shareMethod && (() => {
                            const def = getPaymentType(shareMethod.type);
                            return (
                                <>
                                    <View style={[styles.shareHeaderRow, { backgroundColor: def.color + '1A' }]}>
                                        <AppIcon name={def.emoji} size={24} color={def.color} />
                                        <Text style={[styles.shareTitle, { color: colors.text, fontSize: 17 * fontScale }]} numberOfLines={1}>
                                            {methodTitle(shareMethod, lang)}
                                        </Text>
                                        <Text style={[styles.shareType, { color: colors.textSecondary, fontSize: 12 * fontScale }]}>
                                            {typeLabel(def, lang)}
                                        </Text>
                                    </View>

                                    {!!shareQRValue && (
                                        <View style={styles.qrWrap}>
                                            <View style={styles.qrBox}>
                                                <QRCode value={shareQRValue} size={170} getRef={(c) => (qrRef.current = c)} />
                                            </View>
                                        </View>
                                    )}

                                    {/* Details */}
                                    <View style={styles.detailList}>
                                        {!!name.trim() && (
                                            <View style={[styles.detailRow, { flexDirection: getFlexDirection(lang) }]}>
                                                <Text style={[styles.detailKey, { color: colors.textSecondary, fontSize: 13 * fontScale }]}>{isAr ? 'الاسم' : 'Name'}</Text>
                                                <Text style={[styles.detailVal, { color: colors.text, fontSize: 14 * fontScale }, rtl && { textAlign: 'left' }]} selectable>{name.trim()}</Text>
                                            </View>
                                        )}
                                        {def.fields.map((f) => {
                                            const raw = (shareMethod.fields[f.key] || '').trim();
                                            if (!raw) return null;
                                            return (
                                                <View key={f.key} style={[styles.detailRow, { flexDirection: getFlexDirection(lang) }]}>
                                                    <Text style={[styles.detailKey, { color: colors.textSecondary, fontSize: 13 * fontScale }]}>{fieldLabel(f, lang)}</Text>
                                                    <Text style={[styles.detailVal, { color: colors.text, fontSize: 14 * fontScale }, rtl && { textAlign: 'left' }]} selectable>{optionLabel(f, raw, lang)}</Text>
                                                </View>
                                            );
                                        })}
                                    </View>

                                    {/* Actions */}
                                    <View style={[styles.shareActions, { flexDirection: getFlexDirection(lang) }]}>
                                        <TouchableOpacity style={[styles.shareActionBtn, { backgroundColor: colors.primary }]} onPress={() => shareText(shareMethod)} activeOpacity={0.85}>
                                            <Text style={[styles.shareActionText, { fontSize: 14 * fontScale }]}>{isAr ? 'مشاركة كنص' : 'Share text'}</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.shareActionBtn, { backgroundColor: shareQRValue ? colors.text : colors.border }]}
                                            onPress={shareImage}
                                            disabled={!shareQRValue}
                                            activeOpacity={0.85}
                                        >
                                            <Text style={[styles.shareActionText, { color: colors.card, fontSize: 14 * fontScale }]}>{isAr ? 'مشاركة كصورة' : 'Share image'}</Text>
                                        </TouchableOpacity>
                                    </View>

                                    <TouchableOpacity style={styles.shareClose} onPress={() => setShareMethod(null)}>
                                        <Text style={[styles.shareCloseText, { color: colors.textSecondary, fontSize: 14 * fontScale }]}>{isAr ? 'إغلاق' : 'Close'}</Text>
                                    </TouchableOpacity>
                                </>
                            );
                        })()}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const ShareGlyph = ({ color }: { color: string }) => (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M16 6l-4-4-4 4M12 2v14" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Layout.spacing.md, paddingVertical: Layout.spacing.sm, borderBottomWidth: 1 },
    headerBackBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20 },
    title: { flex: 1, fontFamily: Fonts.bold, fontSize: 18, textAlign: 'center' },
    content: { padding: Layout.spacing.md, paddingBottom: Layout.spacing.xxl },
    sectionTitle: { fontFamily: Fonts.semiBold, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Layout.spacing.sm },

    nameCard: { borderRadius: Layout.borderRadius.md, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 2 },
    nameInput: { padding: Layout.spacing.md, fontFamily: Fonts.medium, fontSize: 16 },

    emptyCard: { borderRadius: Layout.borderRadius.md, padding: Layout.spacing.xl, alignItems: 'center', gap: Layout.spacing.sm },
    emptyText: { fontFamily: Fonts.medium, textAlign: 'center' },

    methodCard: { flexDirection: 'row', alignItems: 'center', borderRadius: Layout.borderRadius.md, padding: Layout.spacing.md, marginBottom: Layout.spacing.sm, gap: Layout.spacing.md, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 2 },
    methodBadge: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    methodInfo: { flex: 1 },
    methodTitle: { fontFamily: Fonts.bold, fontSize: 16 },
    methodPreview: { fontFamily: Fonts.regular, fontSize: 13, marginTop: 2 },

    addBtn: { marginTop: Layout.spacing.sm, paddingVertical: 14, borderRadius: Layout.borderRadius.md, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
    addBtnText: { fontFamily: Fonts.bold, fontSize: 15 },
    hint: { fontFamily: Fonts.regular, fontSize: 12, textAlign: 'center', marginTop: Layout.spacing.md },

    /* Modal shared */
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Layout.spacing.lg, paddingBottom: Layout.spacing.xl },
    modalHandleRow: { alignItems: 'center', marginBottom: Layout.spacing.sm },
    modalHandle: { width: 40, height: 4, borderRadius: 2 },
    modalTitle: { fontFamily: Fonts.bold, fontSize: 18, marginBottom: Layout.spacing.md, textAlign: 'center' },

    typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Layout.spacing.sm },
    typeCard: { width: '31%', borderRadius: Layout.borderRadius.md, borderWidth: 1, paddingVertical: Layout.spacing.md, alignItems: 'center' },
    typeBadge: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
    typeName: { fontFamily: Fonts.semiBold, fontSize: 13, textAlign: 'center' },

    selectedTypeRow: { flexDirection: 'row', alignItems: 'center', borderRadius: Layout.borderRadius.md, borderWidth: 1, padding: Layout.spacing.sm, gap: Layout.spacing.sm, marginBottom: Layout.spacing.sm },
    rowLabel: { fontFamily: Fonts.semiBold },

    fieldLabel: { fontFamily: Fonts.semiBold, fontSize: 12, marginTop: Layout.spacing.md, marginBottom: 6 },
    fieldInput: { borderWidth: 1, borderRadius: Layout.borderRadius.sm, paddingHorizontal: Layout.spacing.md, paddingVertical: Platform.OS === 'ios' ? 12 : 8, fontFamily: Fonts.medium, fontSize: 15 },

    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
    chipText: { fontFamily: Fonts.medium, fontSize: 13 },

    deleteLink: { marginTop: Layout.spacing.lg, alignItems: 'center', paddingVertical: Layout.spacing.sm },
    deleteLinkText: { fontFamily: Fonts.semiBold, fontSize: 14 },

    modalButtons: { flexDirection: 'row', gap: Layout.spacing.md, marginTop: Layout.spacing.lg },
    modalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: Layout.borderRadius.md, borderWidth: 1.5, alignItems: 'center' },
    modalCancelText: { fontFamily: Fonts.semiBold, fontSize: 15 },
    modalSaveBtn: { flex: 2, paddingVertical: 14, borderRadius: Layout.borderRadius.md, alignItems: 'center' },
    modalSaveText: { fontFamily: Fonts.bold, fontSize: 15, color: '#FFFFFF' },

    /* Share modal */
    shareSheet: { margin: Layout.spacing.lg, marginBottom: Layout.spacing.xxl, alignSelf: 'center', width: '90%', maxWidth: 400, borderRadius: 24, padding: Layout.spacing.lg, alignItems: 'stretch' },
    shareHeaderRow: { alignItems: 'center', borderRadius: Layout.borderRadius.md, paddingVertical: Layout.spacing.md, marginBottom: Layout.spacing.md, gap: 4 },
    shareTitle: { fontFamily: Fonts.bold, fontSize: 17, marginTop: 4 },
    shareType: { fontFamily: Fonts.medium, fontSize: 12 },
    qrWrap: { alignItems: 'center', marginBottom: Layout.spacing.md },
    qrBox: { backgroundColor: '#FFFFFF', padding: 14, borderRadius: 16 },
    detailList: { marginBottom: Layout.spacing.md },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, gap: Layout.spacing.md },
    detailKey: { fontFamily: Fonts.medium, fontSize: 13 },
    detailVal: { flex: 1, fontFamily: Fonts.semiBold, fontSize: 14, textAlign: 'right' },
    shareActions: { flexDirection: 'row', gap: Layout.spacing.md },
    shareActionBtn: { flex: 1, paddingVertical: 13, borderRadius: Layout.borderRadius.md, alignItems: 'center' },
    shareActionText: { fontFamily: Fonts.bold, fontSize: 14, color: '#FFFFFF' },
    shareClose: { alignItems: 'center', paddingVertical: Layout.spacing.md, marginTop: 4 },
    shareCloseText: { fontFamily: Fonts.semiBold, fontSize: 14 },
});

export default PaymentMethodsScreen;

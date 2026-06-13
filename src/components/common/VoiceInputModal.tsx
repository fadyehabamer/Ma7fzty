import React, { useEffect, useRef, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView, Animated, Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type {
    ExpoSpeechRecognitionResultEvent,
    ExpoSpeechRecognitionErrorEvent,
} from 'expo-speech-recognition';

// The speech native module is absent in Expo Go, and in a dev client that hasn't
// been rebuilt since this dependency was added. Resolve it lazily + guarded so
// importing this screen never crashes there — the modal just reports "unavailable".
type SpeechModule = typeof import('expo-speech-recognition').ExpoSpeechRecognitionModule;
let _speech: SpeechModule | null = null;
let _speechResolved = false;
const getSpeech = (): SpeechModule | null => {
    if (!_speechResolved) {
        _speechResolved = true;
        try {
            _speech = require('expo-speech-recognition').ExpoSpeechRecognitionModule ?? null;
        } catch {
            _speech = null;
        }
    }
    return _speech;
};
import { Category, TransactionType } from '../../types';
import { ThemeColors } from '../../constants/theme';
import { Fonts, Layout } from '../../constants/theme';
import { t, getFlexDirection, isRTL } from '../../utils/i18n';
import { parseVoiceTransaction, ParsedVoiceResult } from '../../utils/voiceParser';
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';
import AppIcon from './AppIcon';

export interface VoiceApplyPayload {
    amount: number;
    type: TransactionType;
    categoryId: string;
    note: string;
}

interface Props {
    visible: boolean;
    onClose: () => void;
    onApply: (payload: VoiceApplyPayload) => void;
    lang: string;
    colors: ThemeColors;
    categories: Category[];
    currency: any;
}

type Status = 'listening' | 'review' | 'error';

const toWesternDigits = (s: string): string =>
    s
        .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
        .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));

const VoiceInputModal = ({ visible, onClose, onApply, lang, colors, categories, currency }: Props) => {
    const rtl = isRTL(lang);
    const keyboardHeight = useKeyboardHeight();

    const [status, setStatus] = useState<Status>('listening');
    const [transcript, setTranscript] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [parsed, setParsed] = useState<ParsedVoiceResult | null>(null);
    const [editAmount, setEditAmount] = useState('');
    const [editType, setEditType] = useState<TransactionType>('expense');
    const [editCategoryId, setEditCategoryId] = useState<string | null>(null);

    // Refs to keep event handlers free of stale closures.
    const finalizedRef = useRef(false);
    const transcriptRef = useRef('');
    const categoriesRef = useRef(categories);
    const langRef = useRef(lang);
    categoriesRef.current = categories;
    langRef.current = lang;

    // ─── Animations ──────────────────────────────────────────────
    const rings = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;
    const ringAnims = useRef<Animated.CompositeAnimation[]>([]);
    const level = useRef(new Animated.Value(0)).current;
    const reviewAnim = useRef(new Animated.Value(0)).current;
    const amountPulse = useRef(new Animated.Value(0)).current;
    const amountPulseAnim = useRef<Animated.CompositeAnimation | null>(null);

    const startRings = () => {
        stopRings();
        ringAnims.current = rings.map((rv, i) =>
            Animated.sequence([
                Animated.delay(i * 600),
                Animated.loop(
                    Animated.timing(rv, { toValue: 1, duration: 1800, easing: Easing.out(Easing.ease), useNativeDriver: true })
                ),
            ])
        );
        rings.forEach((r) => r.setValue(0));
        ringAnims.current.forEach((a) => a.start());
    };
    const stopRings = () => {
        ringAnims.current.forEach((a) => a.stop());
        ringAnims.current = [];
        rings.forEach((r) => r.setValue(0));
    };

    useEffect(() => {
        if (status === 'listening') startRings();
        else stopRings();
    }, [status]);

    // Slide + fade the review panel in once recognition resolves.
    useEffect(() => {
        if (status === 'review') {
            reviewAnim.setValue(0);
            Animated.timing(reviewAnim, {
                toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true,
            }).start();
        }
    }, [status]);

    // Gently pulse the amount field while it still needs a value typed in.
    useEffect(() => {
        const needsAmount = status === 'review' && parsed?.amount == null && !editAmount;
        amountPulseAnim.current?.stop();
        if (needsAmount) {
            amountPulse.setValue(0);
            amountPulseAnim.current = Animated.loop(
                Animated.sequence([
                    Animated.timing(amountPulse, { toValue: 1, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                    Animated.timing(amountPulse, { toValue: 0, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                ])
            );
            amountPulseAnim.current.start();
        } else {
            amountPulse.setValue(0);
        }
        return () => amountPulseAnim.current?.stop();
    }, [status, parsed, editAmount]);

    // ─── Speech recognition lifecycle ────────────────────────────
    const finalize = (text: string) => {
        if (finalizedRef.current) return;
        finalizedRef.current = true;
        try { getSpeech()?.stop(); } catch { /* noop */ }
        const result = parseVoiceTransaction(text, categoriesRef.current);
        setParsed(result);
        setEditAmount(result.amount != null ? String(result.amount) : '');
        setEditType(result.type);
        setEditCategoryId(result.categoryId);
        setStatus('review');
    };

    const startListening = async () => {
        finalizedRef.current = false;
        transcriptRef.current = '';
        setTranscript('');
        setParsed(null);
        setErrorMsg('');
        setStatus('listening');
        level.setValue(0);

        const speech = getSpeech();
        if (!speech) {
            setStatus('error');
            setErrorMsg(t('voiceUnavailable', langRef.current));
            return;
        }

        let granted = false;
        try {
            const cur = await speech.getPermissionsAsync();
            granted = cur.granted;
            if (!granted) {
                const req = await speech.requestPermissionsAsync();
                granted = req.granted;
            }
        } catch {
            setStatus('error');
            setErrorMsg(t('voiceUnavailable', langRef.current));
            return;
        }
        if (!granted) {
            setStatus('error');
            setErrorMsg(t('voicePermissionMsg', langRef.current));
            return;
        }

        const recogLang = langRef.current === 'ar' ? 'ar-EG' : 'en-US';
        const contextual = [
            ...categoriesRef.current.map((c) => c.name),
            'كهرباء', 'مياه', 'غاز', 'انترنت', 'بنزين', 'مواصلات', 'راتب', 'ايجار', 'مرتب',
        ].slice(0, 24);
        try {
            speech.start({
                lang: recogLang,
                interimResults: true,
                continuous: false,
                maxAlternatives: 1,
                contextualStrings: contextual,
                volumeChangeEventOptions: { enabled: true, intervalMillis: 120 },
                // Give the speaker more room: don't finalize the moment they pause.
                // MINIMUM keeps the session open at the start, POSSIBLY_COMPLETE tolerates
                // mid-sentence pauses, COMPLETE is how long of a silence ends it.
                androidIntentOptions: {
                    EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 2000,
                    EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 2000,
                    EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 2500,
                },
            });
        } catch {
            setStatus('error');
            setErrorMsg(t('voiceUnavailable', langRef.current));
        }
    };

    // Subscribe to native events while the modal is open.
    useEffect(() => {
        if (!visible) return;

        const onResult = (e: ExpoSpeechRecognitionResultEvent) => {
            const tr = e.results?.[0]?.transcript ?? '';
            transcriptRef.current = tr;
            setTranscript(tr);
            if (e.isFinal && tr.trim()) finalize(tr);
        };
        const onEnd = () => {
            if (finalizedRef.current) return;
            if (transcriptRef.current.trim()) finalize(transcriptRef.current);
            else { setStatus('error'); setErrorMsg(t('voiceNoSpeech', langRef.current)); }
        };
        const onError = (e: ExpoSpeechRecognitionErrorEvent) => {
            if (finalizedRef.current) return;
            if (e.error === 'no-speech') { setStatus('error'); setErrorMsg(t('voiceNoSpeech', langRef.current)); }
            else if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { setStatus('error'); setErrorMsg(t('voicePermissionMsg', langRef.current)); }
            else { setStatus('error'); setErrorMsg(e.message || t('voiceUnavailable', langRef.current)); }
        };
        const onVolume = (e: { value: number }) => {
            const v = Math.max(0, Math.min(1, e.value / 10));
            Animated.timing(level, { toValue: v, duration: 110, useNativeDriver: true }).start();
        };

        const speech = getSpeech();
        if (!speech) {
            setStatus('error');
            setErrorMsg(t('voiceUnavailable', langRef.current));
            return;
        }

        const subs: { remove: () => void }[] = [];
        try {
            subs.push(speech.addListener('result', onResult));
            subs.push(speech.addListener('end', onEnd));
            subs.push(speech.addListener('error', onError));
            subs.push(speech.addListener('volumechange', onVolume));
        } catch {
            setStatus('error');
            setErrorMsg(t('voiceUnavailable', langRef.current));
            return;
        }

        startListening();

        return () => {
            subs.forEach((s) => { try { s.remove(); } catch { /* noop */ } });
            try { speech.abort(); } catch { /* noop */ }
            stopRings();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    const handleManualStop = () => { try { getSpeech()?.stop(); } catch { /* noop */ } };

    const accent = editType === 'expense' ? colors.danger : colors.success;
    const reviewCats = categories.filter((c) => c.type === editType);
    const amountMissing = parsed?.amount == null && !editAmount;

    const numericAmount = parseFloat(toWesternDigits(editAmount).replace(/,/g, ''));
    const canApply = !isNaN(numericAmount) && numericAmount > 0 && !!editCategoryId;

    const handleApply = () => {
        if (!canApply || !editCategoryId) return;
        onApply({ amount: numericAmount, type: editType, categoryId: editCategoryId, note: parsed?.note ?? '' });
        onClose();
    };

    const switchType = (newType: TransactionType) => {
        setEditType(newType);
        // Keep the chosen category only if it belongs to the new type.
        const stillValid = categories.find((c) => c.id === editCategoryId && c.type === newType);
        if (!stillValid) setEditCategoryId(null);
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
            <View style={[styles.overlay, { paddingBottom: keyboardHeight }]}>
                <View style={[styles.sheet, { backgroundColor: colors.card }]}>
                    {/* Header */}
                    <View style={[styles.header, { flexDirection: getFlexDirection(lang) }]}>
                        <Text style={[styles.title, { color: colors.text }]}>{t('voiceTitle', lang)}</Text>
                        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Ionicons name="close" size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* ── Listening ── */}
                    {status === 'listening' && (
                        <View style={styles.centerBlock}>
                            <View style={styles.micWrap}>
                                {rings.map((rv, i) => (
                                    <Animated.View
                                        key={i}
                                        pointerEvents="none"
                                        style={[
                                            styles.ring,
                                            {
                                                borderColor: colors.primary,
                                                opacity: rv.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
                                                transform: [{ scale: rv.interpolate({ inputRange: [0, 1], outputRange: [0.7, 2.5] }) }],
                                            },
                                        ]}
                                    />
                                ))}
                                <TouchableOpacity activeOpacity={0.85} onPress={handleManualStop}>
                                    <Animated.View
                                        style={[
                                            styles.micCircle,
                                            { backgroundColor: colors.primary, transform: [{ scale: level.interpolate({ inputRange: [0, 1], outputRange: [1, 1.22] }) }] },
                                        ]}
                                    >
                                        <Ionicons name="mic" size={44} color="#FFFFFF" />
                                    </Animated.View>
                                </TouchableOpacity>
                            </View>

                            <Text style={[styles.listeningText, { color: colors.text }]}>{t('voiceListening', lang)}</Text>
                            <Text style={[styles.hint, { color: colors.textSecondary }]}>
                                {transcript ? transcript : t('voiceExample', lang)}
                            </Text>

                            <TouchableOpacity style={[styles.stopBtn, { borderColor: colors.border }]} onPress={handleManualStop} activeOpacity={0.7}>
                                <Ionicons name="stop" size={16} color={colors.danger} />
                                <Text style={[styles.stopText, { color: colors.danger }]}>{t('voiceStop', lang)}</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* ── Error ── */}
                    {status === 'error' && (
                        <View style={styles.centerBlock}>
                            <View style={[styles.errorCircle, { backgroundColor: colors.danger + '18' }]}>
                                <Ionicons name="mic-off" size={40} color={colors.danger} />
                            </View>
                            <Text style={[styles.hint, { color: colors.textSecondary, marginTop: Layout.spacing.md }]}>{errorMsg}</Text>
                            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: Layout.spacing.lg }]} onPress={startListening} activeOpacity={0.85}>
                                <Ionicons name="refresh" size={18} color="#FFFFFF" />
                                <Text style={styles.primaryBtnText}>{t('voiceTryAgain', lang)}</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* ── Review & confirm ── */}
                    {status === 'review' && (
                        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                            <Animated.View
                                style={{
                                    opacity: reviewAnim,
                                    transform: [{ translateY: reviewAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
                                }}
                            >
                            {/* What we understood */}
                            <View style={[styles.summaryRow, { flexDirection: getFlexDirection(lang) }]}>
                                <Ionicons name="sparkles" size={16} color={colors.primary} />
                                <Text style={[styles.summaryText, { color: colors.text }]}>{t('voiceUnderstood', lang)}</Text>
                            </View>

                            {/* Transcript */}
                            <View style={[styles.transcriptCard, { backgroundColor: colors.surface, borderColor: colors.border, flexDirection: getFlexDirection(lang) }]}>
                                <View style={[styles.quoteIcon, { backgroundColor: colors.primary + '14' }]}>
                                    <Ionicons name="chatbubble-ellipses" size={16} color={colors.primary} />
                                </View>
                                <View style={styles.transcriptTextWrap}>
                                    <Text style={[styles.transcriptLabel, { color: colors.textSecondary }, rtl && { textAlign: 'right' }]}>{t('voiceTranscript', lang)}</Text>
                                    <Text style={[styles.transcriptText, { color: colors.text }, rtl && { textAlign: 'right' }]} numberOfLines={2}>“{parsed?.rawText}”</Text>
                                </View>
                            </View>

                            {/* Type toggle */}
                            <View style={[styles.typeRow, { flexDirection: getFlexDirection(lang) }]}>
                                {(['expense', 'income'] as TransactionType[]).map((ty) => {
                                    const active = editType === ty;
                                    const c = ty === 'expense' ? colors.danger : colors.success;
                                    return (
                                        <TouchableOpacity
                                            key={ty}
                                            style={[styles.typePill, { flexDirection: getFlexDirection(lang), borderColor: colors.border }, active && { backgroundColor: c + '18', borderColor: c }]}
                                            onPress={() => switchType(ty)}
                                            activeOpacity={0.8}
                                        >
                                            <Ionicons name={ty === 'expense' ? 'arrow-down-circle' : 'arrow-up-circle'} size={17} color={active ? c : colors.textSecondary} />
                                            <Text style={[styles.typePillText, { color: active ? c : colors.textSecondary, fontFamily: active ? Fonts.bold : Fonts.medium }]}>
                                                {t(ty === 'expense' ? 'expense' : 'income', lang)}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Amount */}
                            <Text style={[styles.fieldLabel, { color: colors.textSecondary }, rtl && { textAlign: 'right' }]}>{t('amount', lang)}</Text>
                            <View
                                style={[
                                    styles.amountBox,
                                    {
                                        backgroundColor: colors.surface,
                                        borderColor: amountMissing ? colors.warning : accent + '55',
                                        flexDirection: lang === 'ar' ? 'row-reverse' : 'row',
                                    },
                                ]}
                            >
                                <TextInput
                                    style={[styles.amountInput, { color: amountMissing ? colors.warning : accent, textAlign: lang === 'ar' ? 'right' : 'left' }]}
                                    value={editAmount}
                                    onChangeText={(txt) => setEditAmount(toWesternDigits(txt).replace(/[^0-9.]/g, ''))}
                                    keyboardType="numeric"
                                    placeholder="0"
                                    placeholderTextColor={colors.textSecondary + '70'}
                                    autoFocus={!editAmount}
                                />
                                <Text style={[styles.currencyText, { color: amountMissing ? colors.warning : accent }]}>{lang === 'ar' ? currency?.symbol : currency?.code}</Text>
                            </View>
                            {amountMissing && (
                                <Animated.View
                                    style={[
                                        styles.warnRow,
                                        { flexDirection: getFlexDirection(lang), opacity: amountPulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }) },
                                    ]}
                                >
                                    <Ionicons name="alert-circle" size={14} color={colors.warning} />
                                    <Text style={[styles.warnText, { color: colors.warning }, rtl && { textAlign: 'right' }]}>{t('voiceNoAmount', lang)}</Text>
                                </Animated.View>
                            )}

                            {/* Category */}
                            <Text style={[styles.fieldLabel, { color: colors.textSecondary }, rtl && { textAlign: 'right' }]}>{t('category', lang)}</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={[styles.catScroll, rtl && { flexDirection: 'row-reverse' }]}
                                keyboardShouldPersistTaps="handled"
                            >
                                {reviewCats.map((cat) => {
                                    const sel = editCategoryId === cat.id;
                                    return (
                                        <TouchableOpacity
                                            key={cat.id}
                                            style={[styles.catChip, { flexDirection: getFlexDirection(lang), backgroundColor: colors.surface, borderColor: colors.border }, sel && { backgroundColor: accent, borderColor: accent }]}
                                            onPress={() => setEditCategoryId(cat.id)}
                                            activeOpacity={0.8}
                                        >
                                            <AppIcon name={cat.emoji} size={16} color={sel ? '#FFFFFF' : colors.text} />
                                            <Text style={[styles.catChipText, { color: sel ? '#FFFFFF' : colors.textSecondary, fontFamily: sel ? Fonts.bold : Fonts.medium }]} numberOfLines={1}>{cat.name}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                            {parsed?.usedFallback && parsed.matchedTerm && parsed.categoryName && (
                                <Text style={[styles.fallbackHint, { color: colors.textSecondary }, rtl && { textAlign: 'right' }]}>
                                    “{parsed.matchedTerm}” {t('voiceUnderParent', lang)} {parsed.categoryName}
                                </Text>
                            )}

                            {/* Actions */}
                            <View style={[styles.actionRow, { flexDirection: getFlexDirection(lang) }]}>
                                <TouchableOpacity style={[styles.secondaryBtn, { borderColor: colors.border }]} onPress={startListening} activeOpacity={0.8}>
                                    <Ionicons name="mic" size={16} color={colors.textSecondary} />
                                    <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>{t('voiceTryAgain', lang)}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.primaryBtn, { backgroundColor: accent, flex: 1, opacity: canApply ? 1 : 0.4 }]}
                                    onPress={handleApply}
                                    disabled={!canApply}
                                    activeOpacity={0.85}
                                >
                                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                                    <Text style={styles.primaryBtnText}>{t('voiceUse', lang)}</Text>
                                </TouchableOpacity>
                            </View>
                            </Animated.View>
                        </ScrollView>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    sheet: {
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingHorizontal: Layout.spacing.lg, paddingTop: Layout.spacing.md, paddingBottom: Layout.spacing.xl,
        maxHeight: '88%',
    },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Layout.spacing.sm },
    title: { fontFamily: Fonts.bold, fontSize: 18 },

    centerBlock: { alignItems: 'center', paddingVertical: Layout.spacing.xl },
    micWrap: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center' },
    ring: { position: 'absolute', width: 110, height: 110, borderRadius: 55, borderWidth: 2 },
    micCircle: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 8 },
    listeningText: { fontFamily: Fonts.bold, fontSize: 18, marginTop: Layout.spacing.md },
    hint: { fontFamily: Fonts.regular, fontSize: 14, marginTop: 6, textAlign: 'center', paddingHorizontal: Layout.spacing.md, lineHeight: 20 },
    stopBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 24, borderWidth: 1.5, marginTop: Layout.spacing.lg },
    stopText: { fontFamily: Fonts.semiBold, fontSize: 14 },

    errorCircle: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },

    summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, marginBottom: Layout.spacing.sm },
    summaryText: { fontFamily: Fonts.bold, fontSize: 15 },

    transcriptCard: { flexDirection: 'row', alignItems: 'center', gap: Layout.spacing.sm, borderRadius: Layout.borderRadius.md, borderWidth: 1, paddingVertical: Layout.spacing.sm, paddingHorizontal: Layout.spacing.md, marginBottom: Layout.spacing.md },
    quoteIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    transcriptTextWrap: { flex: 1 },
    transcriptLabel: { fontFamily: Fonts.semiBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
    transcriptText: { fontFamily: Fonts.medium, fontSize: 16 },

    typeRow: { flexDirection: 'row', gap: Layout.spacing.sm, marginBottom: Layout.spacing.md },
    typePill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: Layout.borderRadius.sm, borderWidth: 1.5 },
    typePillText: { fontFamily: Fonts.medium, fontSize: 15 },

    fieldLabel: { fontFamily: Fonts.semiBold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
    amountBox: { flexDirection: 'row', alignItems: 'center', borderRadius: Layout.borderRadius.md, borderWidth: 1.5, paddingHorizontal: Layout.spacing.md, marginBottom: Layout.spacing.sm },
    amountInput: { flex: 1, fontFamily: Fonts.bold, fontSize: 32, paddingVertical: Layout.spacing.sm },
    currencyText: { fontFamily: Fonts.bold, fontSize: 18, marginHorizontal: 6 },
    warnRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: Layout.spacing.sm },
    warnText: { fontFamily: Fonts.medium, fontSize: 12, flex: 1 },

    catScroll: { gap: Layout.spacing.sm, paddingVertical: 4, marginBottom: 4 },
    catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 22, borderWidth: 1.5 },
    catChipText: { fontFamily: Fonts.medium, fontSize: 13, maxWidth: 120 },
    fallbackHint: { fontFamily: Fonts.regular, fontSize: 12, marginTop: 6, fontStyle: 'italic' },

    actionRow: { flexDirection: 'row', alignItems: 'center', gap: Layout.spacing.sm, marginTop: Layout.spacing.lg },
    secondaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 14, borderRadius: Layout.borderRadius.md, borderWidth: 1.5 },
    secondaryBtnText: { fontFamily: Fonts.semiBold, fontSize: 14 },
    primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 14, borderRadius: Layout.borderRadius.md },
    primaryBtnText: { fontFamily: Fonts.bold, fontSize: 16, color: '#FFFFFF' },
});

export default VoiceInputModal;

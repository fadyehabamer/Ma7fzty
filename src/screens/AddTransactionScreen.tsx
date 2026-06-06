import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, ScrollView, Alert, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import dayjs from 'dayjs';
import { useApp } from '../context/AppContext';
import { Layout, Fonts } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';
import { TransactionType, Transaction } from '../types';
import { t, isRTL, getFlexDirection } from '../utils/i18n';
import { evaluateExpression, hasOperator } from '../utils/calc';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';

const AddTransactionScreen = ({ route, navigation }: any) => {
    const { state, dispatch } = useApp();
    const { colors } = useTheme();
    const lang = state.settings.language || 'en';
    const fontScale = state.settings.fontScale || 1;
    const rtl = isRTL(lang);
    const editTx = route.params?.editTransaction as Transaction | undefined;
    const initData = route.params?.initData;
    const isEditing = !!editTx;
    const fmtPlain = (clean: string): string => {
        const parts = clean.split('.');
        const intPart = parts[0];
        let formattedInt = '';
        if (intPart) formattedInt = intPart === '0' ? '0' : parseInt(intPart, 10).toLocaleString('en-US');
        else if (clean.startsWith('.')) formattedInt = '0';
        let final = formattedInt;
        if (clean.includes('.')) final += '.' + (parts[1] || '').slice(0, 2);
        return final;
    };
    const [amount, setAmount] = useState<string>(editTx ? fmtPlain(String(editTx.amount)) : (initData?.amount || ''));
    const [note, setNote] = useState(editTx?.note ?? initData?.note ?? '');
    const [date, setDate] = useState(editTx ? new Date(editTx.date) : new Date());
    const [imageUri, setImageUri] = useState<string | null>(editTx?.imageUri ?? null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [calMonth, setCalMonth] = useState(editTx ? dayjs(editTx.date) : dayjs());
    const [type, setType] = useState<TransactionType>(editTx?.type ?? initData?.type ?? 'expense');
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(editTx?.categoryId ?? initData?.categoryId ?? null);
    const [selectorWidth, setSelectorWidth] = useState(0);
    const slideAnim = useRef(new Animated.Value(0)).current;
    
    const isFirstRender = useRef(true);

    useEffect(() => { 
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        setSelectedCategoryId(null); 
    }, [type]);
    
    useEffect(() => {
        Animated.timing(slideAnim, { toValue: type === 'expense' ? 0 : 1, duration: 200, useNativeDriver: false }).start();
    }, [type]);

    const categories = state.categories.filter((c) => c.type === type);

    const pickImage = async () => {
        Alert.alert(
            lang === 'ar' ? 'أضف صورة' : 'Add Photo',
            lang === 'ar' ? 'من أين تريد إضافة الصورة؟' : 'Where would you like to add the photo from?',
            [
                { text: t('cancel', lang), style: 'cancel' },
                {
                    text: lang === 'ar' ? 'الكاميرا' : 'Camera',
                    onPress: async () => {
                        const { status } = await ImagePicker.requestCameraPermissionsAsync();
                        if (status !== 'granted') {
                            Alert.alert('Permission Denied', 'Sorry, we need camera permissions to make this work!');
                            return;
                        }
                        const result = await ImagePicker.launchCameraAsync({
                            mediaTypes: ImagePicker.MediaTypeOptions.Images,
                            allowsEditing: true,
                            aspect: [4, 3],
                            quality: 0.5,
                        });
                        if (!result.canceled) setImageUri(result.assets[0].uri);
                    }
                },
                {
                    text: lang === 'ar' ? 'المعرض' : 'Gallery',
                    onPress: async () => {
                        const result = await ImagePicker.launchImageLibraryAsync({
                            mediaTypes: ImagePicker.MediaTypeOptions.Images,
                            allowsEditing: true,
                            aspect: [4, 3],
                            quality: 0.5,
                        });
                        if (!result.canceled) setImageUri(result.assets[0].uri);
                    }
                }
            ]
        );
    };

    const handleSave = () => {
        const numericAmount = evaluateExpression(amount);
        if (numericAmount == null || isNaN(numericAmount) || numericAmount <= 0) {
            Alert.alert(t('invalidAmount', lang), t('enterValidNumber', lang)); return;
        }
        if (!selectedCategoryId) {
            Alert.alert(t('noCategory', lang), t('pleaseSelectCategory', lang)); return;
        }
        if (isEditing && editTx) {
            dispatch({
                type: 'UPDATE_TRANSACTION',
                payload: {
                    ...editTx,
                    amount: numericAmount,
                    categoryId: selectedCategoryId,
                    date: date.getTime(),
                    note,
                    imageUri: imageUri || undefined,
                    type,
                },
            });
        } else {
            dispatch({
                type: 'ADD_TRANSACTION',
                payload: {
                    id: Date.now().toString(),
                    amount: numericAmount,
                    categoryId: selectedCategoryId,
                    date: date.getTime(),
                    note,
                    imageUri: imageUri || undefined,
                    type,
                },
            });
        }
        navigation.goBack();
    };

    const handleAmountChange = (text: string) => {
        let clean = text.replace(/[^0-9.+\-*/×÷]/g, '').replace(/×/g, '*').replace(/÷/g, '/');
        if (hasOperator(clean)) {
            setAmount(clean); // arithmetic expression — keep raw
        } else {
            const parts = clean.split('.');
            if (parts.length > 2) clean = parts[0] + '.' + parts.slice(1).join('');
            setAmount(fmtPlain(clean));
        }
    };

    const appendOperator = (op: string) => {
        setAmount((prev) => {
            const p = prev || '';
            if (p === '') return p; // don't start with an operator
            if (/[+\-*/]/.test(p[p.length - 1])) return p.slice(0, -1) + op; // replace a trailing operator
            return p + op;
        });
    };

    const applyEquals = () => {
        const v = evaluateExpression(amount);
        if (v != null && isFinite(v)) setAmount(fmtPlain(String(v)));
    };

    const selectedCat = categories.find((c) => c.id === selectedCategoryId);
    const computed = hasOperator(amount) ? evaluateExpression(amount) : null;
    const SELECTOR_PAD = 4;
    const half = selectorWidth > 0 ? (selectorWidth - SELECTOR_PAD * 2) / 2 : 0;
    const indicatorWidth = half > 0 ? half : '50%';
    const indicatorTranslate = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [SELECTOR_PAD, SELECTOR_PAD + half] });

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <View style={[styles.header, { flexDirection: getFlexDirection(lang), backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                    <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.goBack()}>
                        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                            <Path d={rtl ? "M5 12h14M12 5l7 7-7 7" : "M19 12H5M12 19l-7-7 7-7"} stroke={colors.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: colors.text, fontSize: 18 * fontScale }]}>{isEditing ? (lang === 'ar' ? 'تعديل المعاملة' : 'Edit Transaction') : t('addTransaction', lang)}</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    {/* Type Selector */}
                    <View
                        style={[styles.typeSelectorOuter, { backgroundColor: colors.card }]}
                        onLayout={(e) => setSelectorWidth(e.nativeEvent.layout.width)}
                    >
                        <Animated.View style={[styles.typeIndicator, { width: indicatorWidth, transform: [{ translateX: indicatorTranslate }], backgroundColor: type === 'expense' ? colors.danger + '18' : colors.success + '18' }]} />
                        <TouchableOpacity style={styles.typeButton} onPress={() => setType('expense')} activeOpacity={0.7}>
                            <Text style={[styles.typeText, { color: colors.textSecondary, fontSize: 16 * fontScale }, type === 'expense' && { color: colors.danger, fontFamily: Fonts.bold }]}>{t('expense', lang)}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.typeButton} onPress={() => setType('income')} activeOpacity={0.7}>
                            <Text style={[styles.typeText, { color: colors.textSecondary, fontSize: 16 * fontScale }, type === 'income' && { color: colors.success, fontFamily: Fonts.bold }]}>{t('income', lang)}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Amount */}
                    <View style={[styles.amountCard, { backgroundColor: colors.card }]}>
                        <Text style={[styles.amountLabel, { color: colors.textSecondary, fontSize: 12 * fontScale }]}>{t('amount', lang)}</Text>
                        <View style={[styles.amountRow, { flexDirection: lang === 'ar' ? 'row-reverse' : 'row' }]}>
                            {lang === 'ar' ? (
                                <Text style={[styles.currencySymbol, { color: type === 'expense' ? colors.danger : colors.success, marginRight: 8, fontSize: 28 * fontScale }]}>
                                    {state.settings.currency?.symbol}
                                </Text>
                            ) : null}
                            <TextInput
                                style={[styles.amountInput, { color: type === 'expense' ? colors.danger : colors.success, fontSize: 48 * fontScale }]}
                                placeholder="0.00"
                                keyboardType="numeric"
                                value={amount}
                                onChangeText={handleAmountChange}
                                placeholderTextColor={colors.textSecondary + '60'}
                                autoFocus
                            />
                            {lang !== 'ar' ? (
                                <Text style={[styles.currencySymbol, { color: type === 'expense' ? colors.danger : colors.success, marginLeft: 8, fontSize: 28 * fontScale }]}>
                                    {state.settings.currency?.code}
                                </Text>
                            ) : null}
                        </View>
                    </View>

                    {/* Calculator row */}
                    <View style={styles.calcRow}>
                        {['/', '*', '-', '+'].map((op) => (
                            <TouchableOpacity key={op} style={[styles.calcBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => appendOperator(op)} activeOpacity={0.7}>
                                <Text style={[styles.calcBtnText, { color: colors.text, fontSize: 20 * fontScale }]}>{op === '*' ? '×' : op === '/' ? '÷' : op}</Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity style={[styles.calcBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={applyEquals} activeOpacity={0.7}>
                            <Text style={[styles.calcBtnText, { color: '#FFF', fontSize: 20 * fontScale }]}>=</Text>
                        </TouchableOpacity>
                    </View>
                    {computed != null && (
                        <Text style={[styles.calcResult, { color: type === 'expense' ? colors.danger : colors.success, fontSize: 15 * fontScale }]}>
                            = {Math.abs(computed).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {lang === 'ar' ? state.settings.currency?.symbol : state.settings.currency?.code}
                        </Text>
                    )}

                    {/* Category */}
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontSize: 14 * fontScale }, rtl && { textAlign: 'right' }]}>{t('category', lang)}</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.categoriesScroll}
                        contentContainerStyle={[styles.categoriesScrollContent, rtl && { flexDirection: 'row-reverse' }]}
                        keyboardShouldPersistTaps="handled"
                    >
                        {categories.map((cat) => {
                            const isSelected = selectedCategoryId === cat.id;
                            const selColor = type === 'expense' ? colors.danger : colors.success;
                            return (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[styles.categoryChip, { flexDirection: getFlexDirection(lang), backgroundColor: colors.card, borderColor: colors.border }, isSelected && { backgroundColor: selColor, borderColor: selColor }]}
                                    onPress={() => setSelectedCategoryId(cat.id)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.chipEmoji, { fontSize: 18 * fontScale }]}>{cat.emoji}</Text>
                                    <Text style={[styles.chipName, { color: colors.textSecondary, fontSize: 14 * fontScale }, isSelected && { color: '#FFFFFF', fontFamily: Fonts.bold }]} numberOfLines={1}>{cat.name}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* Note & Photo */}
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontSize: 14 * fontScale }, rtl && { textAlign: 'right' }]}>{t('note', lang)}</Text>
                    <View style={[styles.noteCard, { backgroundColor: colors.card }]}>
                        <TextInput
                            style={[styles.noteInput, { color: colors.text, fontSize: 16 * fontScale }, rtl && { textAlign: 'right' }]}
                            placeholder={t('whatsThisFor', lang)}
                            value={note}
                            onChangeText={setNote}
                            placeholderTextColor={colors.textSecondary}
                            multiline
                        />
                        <View style={[styles.photoRow, { flexDirection: getFlexDirection(lang) }]}>
                            <TouchableOpacity onPress={pickImage} style={[styles.addPhotoBtn, { borderColor: colors.border }]}>
                                <Text style={{ fontSize: 20 * fontScale }}>📷</Text>
                                <Text style={[styles.addPhotoText, { color: colors.primary, fontSize: 13 * fontScale }]}>{imageUri ? (lang === 'ar' ? 'تغيير' : 'Change') : (lang === 'ar' ? 'صورة' : 'Add Photo')}</Text>
                            </TouchableOpacity>
                            {imageUri && (
                                <View style={styles.imagePreviewContainer}>
                                    <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                                    <TouchableOpacity style={styles.removeImageBtn} onPress={() => setImageUri(null)}>
                                        <Text style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold' }}>✕</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Date Picker */}
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontSize: 14 * fontScale }, rtl && { textAlign: 'right' }]}>{t('date', lang)}</Text>
                    <TouchableOpacity style={[styles.datePickerBtn, { backgroundColor: colors.card }]} onPress={() => setShowDatePicker(!showDatePicker)} activeOpacity={0.7}>
                        <View style={[styles.datePickerRow, { flexDirection: getFlexDirection(lang) }]}>
                            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                                <Path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" stroke={colors.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                            <Text style={[styles.datePickerText, { color: colors.text, fontSize: 15 * fontScale }]}>{dayjs(date).format('dddd, MMM D, YYYY')}</Text>
                            <Text style={[styles.datePickerChevron, { color: colors.textSecondary, fontSize: 10 * fontScale }]}>{showDatePicker ? '▲' : '▼'}</Text>
                        </View>
                    </TouchableOpacity>
                    {showDatePicker && (
                        <View style={[styles.dateGrid, { backgroundColor: colors.card }]}>
                            {/* Quick date buttons */}
                            <View style={styles.quickDates}>
                                {[
                                    { label: lang === 'ar' ? 'اليوم' : 'Today', d: dayjs() },
                                    { label: lang === 'ar' ? 'أمس' : 'Yesterday', d: dayjs().subtract(1, 'day') },
                                    { label: lang === 'ar' ? 'قبل أسبوع' : '1 week ago', d: dayjs().subtract(7, 'day') },
                                    { label: lang === 'ar' ? 'قبل شهر' : '1 month ago', d: dayjs().subtract(1, 'month') },
                                ].map((item, idx) => {
                                    const isActive = dayjs(date).format('YYYY-MM-DD') === item.d.format('YYYY-MM-DD');
                                    return (
                                        <TouchableOpacity
                                            key={idx}
                                            style={[styles.quickDateBtn, { borderColor: colors.border }, isActive && { backgroundColor: colors.primary + '18', borderColor: colors.primary }]}
                                            onPress={() => { setDate(item.d.toDate()); setCalMonth(item.d); setShowDatePicker(false); }}
                                        >
                                            <Text style={[styles.quickDateText, { color: colors.textSecondary, fontSize: 13 * fontScale }, isActive && { color: colors.primary, fontFamily: Fonts.bold }]}>{item.label}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Calendar month nav */}
                            <View style={[styles.calNav, { flexDirection: getFlexDirection(lang) }]}>
                                <TouchableOpacity onPress={() => setCalMonth((m) => m.subtract(1, 'month'))} style={[styles.calNavBtn, { borderColor: colors.border }]}>
                                    <Text style={[styles.calNavArrow, { color: colors.text, fontSize: 18 * fontScale }]}>{rtl ? '›' : '‹'}</Text>
                                </TouchableOpacity>
                                <Text style={[styles.calNavTitle, { color: colors.text, fontSize: 16 * fontScale }]}>{calMonth.format('MMMM YYYY')}</Text>
                                <TouchableOpacity
                                    onPress={() => { if (!calMonth.isSame(dayjs(), 'month')) setCalMonth((m) => m.add(1, 'month')); }}
                                    style={[styles.calNavBtn, { borderColor: colors.border }, calMonth.isSame(dayjs(), 'month') && { opacity: 0.3 }]}
                                    disabled={calMonth.isSame(dayjs(), 'month')}
                                >
                                    <Text style={[styles.calNavArrow, { color: colors.text, fontSize: 18 * fontScale }]}>{rtl ? '‹' : '›'}</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Weekday headers */}
                            <View style={styles.calWeekRow}>
                                {(lang === 'ar' ? ['أحد', 'إثن', 'ثلا', 'أرب', 'خمس', 'جمع', 'سبت'] : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']).map((wd, i) => (
                                    <View key={i} style={styles.calWeekCell}>
                                        <Text style={[styles.calWeekText, { color: colors.textSecondary, fontSize: 11 * fontScale }]}>{wd}</Text>
                                    </View>
                                ))}
                            </View>

                            {/* Calendar days */}
                            {(() => {
                                const startOfMonth = calMonth.startOf('month');
                                const daysInMonth = calMonth.daysInMonth();
                                const startDow = startOfMonth.day();
                                const today = dayjs();
                                const cells: React.ReactNode[] = [];

                                // leading blanks
                                for (let i = 0; i < startDow; i++) cells.push(<View key={`b${i}`} style={styles.calDayCell} />);

                                for (let d = 1; d <= daysInMonth; d++) {
                                    const thisDay = startOfMonth.date(d);
                                    const isFuture = thisDay.isAfter(today, 'day');
                                    const isActive = dayjs(date).format('YYYY-MM-DD') === thisDay.format('YYYY-MM-DD');
                                    const isTodayDate = thisDay.isSame(today, 'day');
                                    cells.push(
                                        <TouchableOpacity
                                            key={d}
                                            style={[styles.calDayCell, isActive && { backgroundColor: colors.primary, borderRadius: 10 }, isTodayDate && !isActive && { borderWidth: 1.5, borderColor: colors.primary, borderRadius: 10 }]}
                                            onPress={() => { if (!isFuture) { setDate(thisDay.toDate()); setShowDatePicker(false); } }}
                                            disabled={isFuture}
                                            activeOpacity={0.6}
                                        >
                                            <Text style={[styles.calDayNum, { color: colors.text, fontSize: 15 * fontScale }, isFuture && { color: colors.textSecondary, opacity: 0.3 }, isActive && { color: '#FFF' }]}>{d}</Text>
                                        </TouchableOpacity>
                                    );
                                }

                                // Render in rows of 7
                                const rows: React.ReactNode[] = [];
                                for (let i = 0; i < cells.length; i += 7) {
                                    rows.push(<View key={`r${i}`} style={styles.calWeekRow}>{cells.slice(i, i + 7)}</View>);
                                }
                                return rows;
                            })()}
                        </View>
                    )}

                    {/* Info summary */}
                    <View style={[styles.infoRow, { flexDirection: getFlexDirection(lang) }]}>
                        <View style={[styles.infoItem, { backgroundColor: colors.card }]}>
                            <Text style={[styles.infoLabel, { color: colors.textSecondary, fontSize: 12 * fontScale }, rtl && { textAlign: 'right' }]}>{t('date', lang)}</Text>
                            <Text style={[styles.infoValue, { color: colors.text, fontSize: 16 * fontScale }, rtl && { textAlign: 'right' }]}>{dayjs(date).format('MMM D, YYYY')}</Text>
                        </View>
                        <View style={[styles.infoItem, { backgroundColor: colors.card }]}>
                            <Text style={[styles.infoLabel, { color: colors.textSecondary, fontSize: 12 * fontScale }, rtl && { textAlign: 'right' }]}>{t('category', lang)}</Text>
                            <Text style={[styles.infoValue, { color: colors.text, fontSize: 16 * fontScale }, rtl && { textAlign: 'right' }]}>{selectedCat ? `${selectedCat.emoji} ${selectedCat.name}` : '—'}</Text>
                        </View>
                    </View>
                </ScrollView>

                {/* Bottom Action Buttons */}
                <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                    <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                        <Text style={[styles.cancelBtnText, { color: colors.textSecondary, fontSize: 16 * fontScale }]}>{t('cancel', lang)}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.saveBtn, { backgroundColor: type === 'expense' ? colors.danger : colors.success, opacity: amount && selectedCategoryId ? 1 : 0.4 }]}
                        onPress={handleSave} activeOpacity={0.8} disabled={!amount || !selectedCategoryId}
                    >
                        <Text style={[styles.saveBtnText, { fontSize: 18 * fontScale }]}>{isEditing ? (lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes') : (type === 'expense' ? t('addExpense', lang) : t('addIncome', lang))}</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Layout.spacing.md, paddingVertical: Layout.spacing.sm, borderBottomWidth: 1 },
    headerBackBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20 },
    title: { flex: 1, fontFamily: Fonts.bold, fontSize: 18, textAlign: 'center' },
    content: { padding: Layout.spacing.md, paddingBottom: Layout.spacing.md },
    typeSelectorOuter: {
        flexDirection: 'row', borderRadius: Layout.borderRadius.md, padding: 4,
        marginBottom: Layout.spacing.lg, position: 'relative', shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 2
    },
    typeIndicator: { position: 'absolute', top: 4, bottom: 4, width: '50%', borderRadius: Layout.borderRadius.sm },
    typeButton: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: Layout.borderRadius.sm, zIndex: 1 },
    typeText: { fontFamily: Fonts.medium, fontSize: 16 },
    amountCard: { borderRadius: Layout.borderRadius.lg, padding: Layout.spacing.lg, alignItems: 'center', marginBottom: Layout.spacing.lg, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3 },
    amountLabel: { fontFamily: Fonts.semiBold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: Layout.spacing.sm },
    amountRow: { flexDirection: 'row', alignItems: 'center' },
    currencySymbol: {
        fontFamily: Fonts.bold,
        fontSize: 28,
    },
    amountInput: { fontFamily: Fonts.bold, fontSize: 48, minWidth: 120, textAlign: 'center' },
    sectionTitle: { fontFamily: Fonts.semiBold, fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Layout.spacing.sm, marginTop: Layout.spacing.xs },
    calcRow: { flexDirection: 'row', gap: Layout.spacing.sm, marginBottom: Layout.spacing.sm },
    calcBtn: { flex: 1, height: 44, borderRadius: Layout.borderRadius.sm, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    calcBtnText: { fontFamily: Fonts.bold, fontSize: 20 },
    calcResult: { fontFamily: Fonts.bold, fontSize: 15, textAlign: 'center', marginBottom: Layout.spacing.md, marginTop: -2 },
    categoriesScroll: { marginHorizontal: -Layout.spacing.md, marginBottom: Layout.spacing.lg },
    categoriesScrollContent: { paddingHorizontal: Layout.spacing.md, gap: Layout.spacing.sm, alignItems: 'center' },
    categoryChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, borderWidth: 1.5, gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 2, elevation: 1 },
    chipEmoji: { fontSize: 18 },
    chipName: { fontFamily: Fonts.medium, fontSize: 14 },
    noteCard: { borderRadius: Layout.borderRadius.md, marginBottom: Layout.spacing.lg, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 2 },
    noteInput: { padding: Layout.spacing.md, fontFamily: Fonts.regular, fontSize: 16, minHeight: 80, textAlignVertical: 'top' },
    photoRow: { padding: Layout.spacing.md, paddingTop: 0, alignItems: 'center', gap: Layout.spacing.md },
    addPhotoBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: Layout.borderRadius.sm, borderWidth: 1, gap: 6 },
    addPhotoText: { fontFamily: Fonts.medium, fontSize: 13 },
    imagePreviewContainer: { position: 'relative' },
    imagePreview: { width: 60, height: 60, borderRadius: 8 },
    removeImageBtn: { position: 'absolute', top: -5, right: -5, width: 18, height: 18, borderRadius: 9, backgroundColor: 'red', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#FFF' },
    datePickerBtn: { borderRadius: Layout.borderRadius.md, padding: Layout.spacing.md, marginBottom: Layout.spacing.sm, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 2 },
    datePickerRow: { flexDirection: 'row', alignItems: 'center', gap: Layout.spacing.sm },
    datePickerText: { flex: 1, fontFamily: Fonts.semiBold, fontSize: 15 },
    datePickerChevron: { fontFamily: Fonts.bold, fontSize: 10 },
    dateGrid: { borderRadius: Layout.borderRadius.md, padding: Layout.spacing.md, marginBottom: Layout.spacing.md, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 2 },
    quickDates: { flexDirection: 'row', flexWrap: 'wrap', gap: Layout.spacing.sm, marginBottom: Layout.spacing.md },
    quickDateBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Layout.borderRadius.sm, borderWidth: 1.5 },
    quickDateText: { fontFamily: Fonts.medium, fontSize: 13 },
    calNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Layout.spacing.sm },
    calNavBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    calNavArrow: { fontFamily: Fonts.bold, fontSize: 18, marginTop: -1 },
    calNavTitle: { fontFamily: Fonts.bold, fontSize: 16 },
    calWeekRow: { flexDirection: 'row' },
    calWeekCell: { flex: 1, alignItems: 'center', paddingVertical: 6 },
    calWeekText: { fontFamily: Fonts.semiBold, fontSize: 11, textTransform: 'uppercase' },
    calDayCell: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, minHeight: 40 },
    calDayNum: { fontFamily: Fonts.semiBold, fontSize: 15 },
    infoRow: { flexDirection: 'row', gap: Layout.spacing.md, marginBottom: Layout.spacing.sm, marginTop: Layout.spacing.md },
    infoItem: { flex: 1, borderRadius: Layout.borderRadius.md, padding: Layout.spacing.md, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 2 },
    infoLabel: { fontFamily: Fonts.medium, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
    infoValue: { fontFamily: Fonts.semiBold, fontSize: 16 },
    bottomBar: { flexDirection: 'row', padding: Layout.spacing.md, gap: Layout.spacing.md, borderTopWidth: 1 },
    cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: Layout.borderRadius.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
    cancelBtnText: { fontFamily: Fonts.semiBold, fontSize: 16 },
    saveBtn: { flex: 2, paddingVertical: 14, borderRadius: Layout.borderRadius.md, alignItems: 'center', justifyContent: 'center' },
    saveBtnText: { fontFamily: Fonts.bold, fontSize: 18, color: '#FFFFFF' },
});

export default AddTransactionScreen;

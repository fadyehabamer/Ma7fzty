import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Alert, TextInput, Modal, Switch, Linking, Image, Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Layout, Fonts, PRIMARY_COLORS } from '../constants/theme';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../hooks/useTheme';
import { useApp } from '../context/AppContext';
import { clearAllData } from '../utils/storage';
import { t, isRTL, getFlexDirection } from '../utils/i18n';
import { exportToPdf, exportToCsv } from '../utils/exportData';
// Fix for deprecation warning: using legacy API
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { exportBackup, importBackup } from '../utils/storage';

const SettingsScreen = () => {
    const { state, dispatch } = useApp();
    const { colors, isDark } = useTheme();
    const navigation = useNavigation();
    const lang = state.settings.language || 'en';
    const fontScale = state.settings.fontScale || 1;
    const rtl = isRTL(lang);
    const isAr = lang === 'ar';
    const [showBudgetModal, setShowBudgetModal] = useState(false);
    const [budgetInput, setBudgetInput] = useState(
        state.settings.monthlyBudget > 0 ? state.settings.monthlyBudget.toString() : ''
    );
    const [showPasscodeModal, setShowPasscodeModal] = useState(false);
    const [passcodeStep, setPasscodeStep] = useState<'enter' | 'confirm' | 'remove'>('enter');
    const [newPasscode, setNewPasscode] = useState('');
    const [passcodeInput, setPasscodeInput] = useState('');
    const [isDevSectionOpen, setIsDevSectionOpen] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    const scheduleDailyReminder = async (time: string) => {
        try {
            const [hour, minute] = (time || '20:00').split(':').map(Number);
            await Notifications.cancelAllScheduledNotificationsAsync();
            
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: lang === 'ar' ? 'وقت تسجيل المصروفات! 💸' : 'Time to log expenses! 💸',
                    body: lang === 'ar' ? 'لا تنس تسجيل مصروفاتك أو دخلك لليوم.' : 'Don\'t forget to log your daily income and expenses.',
                    sound: true,
                    // Android settings
                    ...(Platform.OS === 'android' ? { channelId: 'default' } : {}),
                },
                trigger: {
                    hour,
                    minute,
                    repeats: true,
                    type: Notifications.SchedulableTriggerInputTypes.DAILY,
                } as any,
            });
        } catch (e: any) {
            console.error('Schedule reminder error:', e);
            throw e;
        }
    };

    const handleReset = () => {
        Alert.alert(
            t('resetAllData', lang),
            lang === 'ar'
                ? 'سيتم حذف جميع المعاملات والفئات والإعدادات. لا يمكن التراجع.'
                : 'This will delete all your transactions, categories, and settings. This cannot be undone.',
            [
                { text: t('cancel', lang), style: 'cancel' },
                {
                    text: t('resetAllData', lang),
                    style: 'destructive',
                    onPress: async () => {
                        await clearAllData();
                        dispatch({ type: 'RESET_DATA' });
                    },
                },
            ]
        );
    };

    const handleChangeCurrency = () => {
        Alert.alert(
            t('currency', lang),
            lang === 'ar' ? 'سينقلك هذا إلى شاشة اختيار العملة.' : 'This will take you to the currency selection screen.',
            [
                { text: t('cancel', lang), style: 'cancel' },
                {
                    text: lang === 'ar' ? 'تغيير' : 'Change',
                    onPress: () => dispatch({ type: 'SET_CURRENCY', payload: null as any }),
                },
            ]
        );
    };

    const handleSaveBudget = () => {
        const value = parseFloat(budgetInput);
        if (isNaN(value) || value < 0) {
            Alert.alert(
                lang === 'ar' ? 'غير صالح' : 'Invalid',
                lang === 'ar' ? 'يرجى إدخال مبلغ صالح' : 'Please enter a valid budget amount'
            );
            return;
        }
        dispatch({ type: 'SET_MONTHLY_BUDGET', payload: value });
        setShowBudgetModal(false);
    };

    const handleToggleLanguage = () => {
        dispatch({ type: 'SET_LANGUAGE', payload: lang === 'en' ? 'ar' : 'en' });
    };

    const handleToggleDarkMode = () => {
        dispatch({ type: 'SET_THEME', payload: isDark ? 'light' : 'dark' });
    };

    const handleExportPdf = async () => {
        if (!state.settings.currency) return;
        try { await exportToPdf(state.transactions, state.categories, state.settings.currency); }
        catch (e: any) { Alert.alert('Error', e.message || 'Could not export'); }
    };

    const handleExportCsv = async () => {
        if (!state.settings.currency) return;
        try { await exportToCsv(state.transactions, state.categories, state.settings.currency); }
        catch (e: any) { Alert.alert('Error', e.message || 'Could not export'); }
    };

    const handleExportBackup = async () => {
        try {
            const json = await exportBackup();
            if (!json) throw new Error('Failed to generate backup');
            const fileName = `mahfazty_backup_${new Date().getTime()}.json`;
            const filePath = `${(FileSystem as any).documentDirectory}${fileName}`;
            await FileSystem.writeAsStringAsync(filePath, json);
            await Sharing.shareAsync(filePath, { mimeType: 'application/json', dialogTitle: 'Save Backup' });
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Backup failed');
        }
    };

    const handleImportBackup = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
            if (result.canceled) return;

            const file = result.assets[0];
            const content = await FileSystem.readAsStringAsync(file.uri);
            const data = await importBackup(content);

            Alert.alert(
                t('backupRestored', lang) || 'Backup Restored',
                lang === 'ar' ? 'تم استعادة البيانات بنجاح' : 'Your data has been successfully restored.',
                [{ text: 'OK', onPress: () => dispatch({ type: 'IMPORT_STATE', payload: data }) }]
            );
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Import failed');
        }
    };

    const hasPasscode = !!state.settings.passcode;
    const hasDailyReminder = !!state.settings.dailyReminder;

    const handleToggleReminder = async (value: boolean) => {
        try {
            if (value) {
                // Android 8+ requires a notification channel
                if (Platform.OS === 'android') {
                    await Notifications.setNotificationChannelAsync('default', {
                        name: 'default',
                        importance: Notifications.AndroidImportance.MAX,
                        vibrationPattern: [0, 250, 250, 250],
                        lightColor: colors.primary,
                    });
                }

                const { status } = await Notifications.requestPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert(
                        lang === 'ar' ? 'إذن مرفوض' : 'Permission Denied',
                        lang === 'ar' ? 'نحتاج إلى إذن الإشعارات لتذكيرك.' : 'We need notification permissions to remind you.'
                    );
                    return;
                }

                const timeStr = state.settings.dailyReminderTime || '20:00';
                await scheduleDailyReminder(timeStr);
                dispatch({ type: 'SET_DAILY_REMINDER', payload: true });

                const [h, m] = timeStr.split(':');
                const alertDate = dayjs().hour(Number(h)).minute(Number(m));
                
                Alert.alert(
                    lang === 'ar' ? 'تم التفعيل' : 'Enabled',
                    lang === 'ar' ? `سيتم تذكيرك يومياً في الساعة ${alertDate.format('h:mm A')}.` : `You will be reminded daily at ${alertDate.format('h:mm A')}.`
                );
            } else {
                await Notifications.cancelAllScheduledNotificationsAsync();
                dispatch({ type: 'SET_DAILY_REMINDER', payload: false });
            }
        } catch (e: any) {
            console.error('Toggle reminder error:', e);
            Alert.alert(
                lang === 'ar' ? 'خطأ' : 'Error',
                (lang === 'ar' 
                    ? 'حدث خطأ أثناء إعداد الإشعار: '
                    : 'Error setting up notification: ') + (e.message || 'Unknown error')
            );
        }
    };

    const onTimeChange = async (event: any, selectedDate?: Date) => {
        setShowTimePicker(false);
        if (selectedDate && event.type === 'set') {
            const timeStr = dayjs(selectedDate).format('HH:mm');
            dispatch({ type: 'SET_DAILY_REMINDER_TIME', payload: timeStr });
            if (hasDailyReminder) {
                try {
                    await scheduleDailyReminder(timeStr);
                    Alert.alert(
                        lang === 'ar' ? 'تم التحديث' : 'Updated',
                        lang === 'ar' ? `تم تغيير وقت التذكير إلى ${dayjs(selectedDate).format('h:mm A')}` : `Reminder time changed to ${dayjs(selectedDate).format('h:mm A')}`
                    );
                } catch (e: any) {
                    Alert.alert('Error', 'Failed to update reminder time.');
                }
            }
        }
    };

    const handlePasscodeToggle = () => {
        if (hasPasscode) {
            // Remove: ask current passcode first
            setPasscodeStep('remove');
            setPasscodeInput('');
            setShowPasscodeModal(true);
        } else {
            // Set new passcode
            setPasscodeStep('enter');
            setNewPasscode('');
            setPasscodeInput('');
            setShowPasscodeModal(true);
        }
    };

    const handlePasscodeDigit = (digit: string) => {
        if (passcodeInput.length < 4) {
            const next = passcodeInput + digit;
            setPasscodeInput(next);
            if (next.length === 4) {
                setTimeout(() => handlePasscodeComplete(next), 200);
            }
        }
    };

    const handlePasscodeDelete = () => setPasscodeInput((p) => p.slice(0, -1));

    const handlePasscodeComplete = (code: string) => {
        if (passcodeStep === 'enter') {
            setNewPasscode(code);
            setPasscodeInput('');
            setPasscodeStep('confirm');
        } else if (passcodeStep === 'confirm') {
            if (code === newPasscode) {
                dispatch({ type: 'SET_PASSCODE', payload: code });
                setShowPasscodeModal(false);
                Alert.alert(
                    isAr ? '\u062a\u0645 \u0627\u0644\u062a\u0641\u0639\u064a\u0644' : 'Enabled',
                    isAr ? '\u062a\u0645 \u062a\u0641\u0639\u064a\u0644 \u0631\u0645\u0632 \u0627\u0644\u0645\u0631\u0648\u0631 \u0628\u0646\u062c\u0627\u062d' : 'Passcode has been set successfully'
                );
            } else {
                Alert.alert(
                    isAr ? '\u063a\u064a\u0631 \u0645\u062a\u0637\u0627\u0628\u0642' : 'Mismatch',
                    isAr ? '\u0631\u0645\u0632 \u0627\u0644\u0645\u0631\u0648\u0631 \u063a\u064a\u0631 \u0645\u062a\u0637\u0627\u0628\u0642. \u062d\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649.' : 'Passcodes do not match. Try again.'
                );
                setPasscodeStep('enter');
                setNewPasscode('');
                setPasscodeInput('');
            }
        } else if (passcodeStep === 'remove') {
            if (code === state.settings.passcode) {
                dispatch({ type: 'SET_PASSCODE', payload: null });
                setShowPasscodeModal(false);
                Alert.alert(
                    isAr ? '\u062a\u0645 \u0627\u0644\u062a\u0639\u0637\u064a\u0644' : 'Disabled',
                    isAr ? '\u062a\u0645 \u0625\u0632\u0627\u0644\u0629 \u0631\u0645\u0632 \u0627\u0644\u0645\u0631\u0648\u0631' : 'Passcode has been removed'
                );
            } else {
                Alert.alert(
                    isAr ? '\u062e\u0637\u0623' : 'Wrong',
                    isAr ? '\u0631\u0645\u0632 \u0627\u0644\u0645\u0631\u0648\u0631 \u063a\u064a\u0631 \u0635\u062d\u064a\u062d' : 'Incorrect passcode'
                );
                setPasscodeInput('');
            }
        }
    };


    const totalTransactions = state.transactions.length;
    const totalExpenses = state.transactions.filter((tx) => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);
    const totalIncomes = state.transactions.filter((tx) => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
            <View style={[styles.header, { flexDirection: getFlexDirection(lang) }]}>
                <Text style={[styles.headerTitle, { color: colors.text, fontSize: 24 * fontScale }]}>{t('settings', lang)}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Account Stats */}
                <View style={[styles.statsCard, { backgroundColor: colors.primary }]}>
                    <View style={[styles.statRow, { flexDirection: getFlexDirection(lang) }]}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{totalTransactions}</Text>
                            <Text style={styles.statLabel}>{t('transactions', lang)}</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{state.categories.length}</Text>
                            <Text style={styles.statLabel}>{t('categories', lang)}</Text>
                        </View>
                    </View>
                </View>

                {/* Appearance */}
                <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontSize: 12 * fontScale }, rtl && { textAlign: 'right' }]}>
                    {lang === 'ar' ? 'المظهر' : 'APPEARANCE'}
                </Text>
                <View style={[styles.section, { backgroundColor: colors.card }]}>
                    <SettingsRow icon="🌙" label={lang === 'ar' ? 'الوضع الداكن' : 'Dark Mode'} value={isDark ? 'ON' : 'OFF'} onPress={handleToggleDarkMode} rtl={rtl} colors={colors} fontScale={fontScale} />
                    <View style={[styles.separator, { backgroundColor: colors.border }, rtl && { marginLeft: 0, marginRight: 52 }]} />
                    {/* Font Scale */}
                    <View style={[styles.row, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
                        <Text style={[styles.rowIcon, { fontSize: 20 * fontScale }, rtl ? { marginLeft: Layout.spacing.md, marginRight: 0 } : {}]}>🔍</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.rowLabel, { color: colors.text, fontSize: 16 * fontScale }, rtl && { textAlign: 'right' }]}>
                                {lang === 'ar' ? 'حجم الخط' : 'Font Size (Zoom)'}
                            </Text>
                        </View>
                        <View style={[styles.fontScaleRow, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
                            <TouchableOpacity
                                style={[styles.fontScaleBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                                onPress={() => {
                                    const current = state.settings.fontScale || 1.0;
                                    if (current > 0.8) dispatch({ type: 'SET_FONT_SCALE', payload: Math.max(0.8, current - 0.1) });
                                }}
                            >
                                <Text style={[styles.fontScaleBtnText, { color: colors.text, fontSize: 20 * fontScale }]}>-</Text>
                            </TouchableOpacity>
                            <Text style={[styles.fontScaleValue, { color: colors.primary, fontSize: 16 * fontScale }]}>
                                {Math.round((state.settings.fontScale || 1.0) * 100)}%
                            </Text>
                            <TouchableOpacity
                                style={[styles.fontScaleBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                                onPress={() => {
                                    const current = state.settings.fontScale || 1.0;
                                    if (current < 1.5) dispatch({ type: 'SET_FONT_SCALE', payload: Math.min(1.5, current + 0.1) });
                                }}
                            >
                                <Text style={[styles.fontScaleBtnText, { color: colors.text, fontSize: 20 * fontScale }]}>+</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={[styles.separator, { backgroundColor: colors.border }, rtl && { marginLeft: 0, marginRight: 52 }]} />
                    {/* Primary Color */}
                    <View style={[styles.row, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
                        <Text style={[styles.rowIcon, { fontSize: 20 * fontScale }, rtl ? { marginLeft: Layout.spacing.md, marginRight: 0 } : {}]}>🎨</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.rowLabel, { color: colors.text, fontSize: 16 * fontScale }, rtl && { textAlign: 'right' }]}>
                                {lang === 'ar' ? 'اللون الرئيسي' : 'Primary Color'}
                            </Text>
                            <View style={[styles.colorRow, rtl && { flexDirection: 'row-reverse' }]}>
                                {PRIMARY_COLORS.map((c) => (
                                    <TouchableOpacity
                                        key={c.value}
                                        onPress={() => dispatch({ type: 'SET_PRIMARY_COLOR', payload: c.value })}
                                        activeOpacity={0.7}
                                    >
                                        <View
                                            style={[
                                                styles.colorDot,
                                                { backgroundColor: c.value },
                                                state.settings.primaryColor === c.value && styles.colorDotActive,
                                            ]}
                                        />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>
                </View>

                {/* Security */}
                <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontSize: 12 * fontScale }, rtl && { textAlign: 'right' }]}>
                    {isAr ? '\u0627\u0644\u0623\u0645\u0627\u0646' : 'SECURITY'}
                </Text>
                <View style={[styles.section, { backgroundColor: colors.card }]}>
                    <View style={[styles.row, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
                        <Text style={[styles.rowIcon, { fontSize: 20 * fontScale }, rtl ? { marginLeft: Layout.spacing.md, marginRight: 0 } : {}]}>{'🔒'}</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.rowLabel, { color: colors.text, fontSize: 16 * fontScale }, rtl && { textAlign: 'right' }]}>
                                {isAr ? '\u0631\u0645\u0632 \u0627\u0644\u0645\u0631\u0648\u0631' : 'Passcode Lock'}
                            </Text>
                            <Text style={[styles.rowSubLabel, { color: colors.textSecondary, fontSize: 12 * fontScale }, rtl && { textAlign: 'right' }]}>
                                {isAr ? '\u0637\u0644\u0628 \u0631\u0645\u0632 \u0627\u0644\u0645\u0631\u0648\u0631 \u0639\u0646\u062f \u0641\u062a\u062d \u0627\u0644\u062a\u0637\u0628\u064a\u0642' : 'Require passcode to open app'}
                            </Text>
                        </View>
                        <Switch
                            value={hasPasscode}
                            onValueChange={handlePasscodeToggle}
                            trackColor={{ false: colors.border, true: colors.primary + '60' }}
                            thumbColor={hasPasscode ? colors.primary : colors.textSecondary}
                        />
                    </View>
                    {hasPasscode && (
                        <>
                            <View style={[styles.separator, { backgroundColor: colors.border }, rtl && { marginLeft: 0, marginRight: 52 }]} />
                            <SettingsRow
                                icon="🔑"
                                label={isAr ? '\u062a\u063a\u064a\u064a\u0631 \u0631\u0645\u0632 \u0627\u0644\u0645\u0631\u0648\u0631' : 'Change Passcode'}
                                value=""
                                onPress={() => { setPasscodeStep('enter'); setNewPasscode(''); setPasscodeInput(''); setShowPasscodeModal(true); }}
                                rtl={rtl} colors={colors} fontScale={fontScale}
                            />
                        </>
                    )}
                </View>

                {/* Notifications */}
                <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontSize: 12 * fontScale }, rtl && { textAlign: 'right' }]}>
                    {isAr ? 'الإشعارات' : 'NOTIFICATIONS'}
                </Text>
                <View style={[styles.section, { backgroundColor: colors.card }]}>
                    <View style={[styles.row, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
                        <Text style={[styles.rowIcon, { fontSize: 20 * fontScale }, rtl ? { marginLeft: Layout.spacing.md, marginRight: 0 } : {}]}>{'🔔'}</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.rowLabel, { color: colors.text, fontSize: 16 * fontScale }, rtl && { textAlign: 'right' }]}>
                                {isAr ? 'تذكير يومي' : 'Daily Reminder'}
                            </Text>
                        </View>
                        <Switch
                            value={hasDailyReminder}
                            onValueChange={handleToggleReminder}
                            trackColor={{ false: colors.border, true: colors.primary + '60' }}
                            thumbColor={hasDailyReminder ? colors.primary : colors.textSecondary}
                        />
                    </View>
                    <View style={[styles.separator, { backgroundColor: colors.border }, rtl && { marginLeft: 0, marginRight: 52 }]} />
                    <SettingsRow 
                        icon="⏰" 
                        label={isAr ? 'وقت التذكير' : 'Reminder Time'} 
                        value={dayjs().hour(Number((state.settings.dailyReminderTime || '20:00').split(':')[0])).minute(Number((state.settings.dailyReminderTime || '20:00').split(':')[1])).format('h:mm A')}
                        onPress={() => setShowTimePicker(true)} 
                        rtl={rtl} colors={colors} fontScale={fontScale} 
                    />
                </View>

                {/* General */}
                <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontSize: 12 * fontScale }, rtl && { textAlign: 'right' }]}>
                    {t('general', lang)}
                </Text>
                <View style={[styles.section, { backgroundColor: colors.card }]}>
                    <SettingsRow icon="💰" label={t('currency', lang)} value={`${state.settings.currency?.code} (${state.settings.currency?.symbol})`} onPress={handleChangeCurrency} rtl={rtl} colors={colors} fontScale={fontScale} />
                    <View style={[styles.separator, { backgroundColor: colors.border }, rtl && { marginLeft: 0, marginRight: 52 }]} />
                    <SettingsRow
                        icon="🎯" label={t('monthlyBudget', lang)}
                        value={state.settings.monthlyBudget > 0 ? `${state.settings.currency?.symbol}${state.settings.monthlyBudget.toLocaleString()}` : t('notSet', lang)}
                        onPress={() => { setBudgetInput(state.settings.monthlyBudget > 0 ? state.settings.monthlyBudget.toString() : ''); setShowBudgetModal(true); }}
                        rtl={rtl} colors={colors} fontScale={fontScale}
                    />
                    <View style={[styles.separator, { backgroundColor: colors.border }, rtl && { marginLeft: 0, marginRight: 52 }]} />
                    <SettingsRow icon="🌐" label={t('language', lang)} value={lang === 'en' ? 'English' : 'عربي'} onPress={handleToggleLanguage} rtl={rtl} colors={colors} fontScale={fontScale} />
                    <View style={[styles.separator, { backgroundColor: colors.border }, rtl && { marginLeft: 0, marginRight: 52 }]} />
                    <SettingsRow icon="📂" label={t('manageCategories', lang)} value={`${state.categories.length}`} onPress={() => (navigation as any).navigate('Categories')} rtl={rtl} colors={colors} fontScale={fontScale} />
                    <View style={[styles.separator, { backgroundColor: colors.border }, rtl && { marginLeft: 0, marginRight: 52 }]} />
                    <SettingsRow icon="💳" label={lang === 'ar' ? 'معلومات الدفع' : 'Payment Info'} value={`${(state.paymentMethods || []).length}`} onPress={() => (navigation as any).navigate('PaymentMethods')} rtl={rtl} colors={colors} fontScale={fontScale} />
                </View>

                {/* Export */}
                <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontSize: 12 * fontScale }, rtl && { textAlign: 'right' }]}>
                    {t('exportData', lang)}
                </Text>
                <View style={[styles.section, { backgroundColor: colors.card }]}>
                    <SettingsRow icon="📄" label={t('exportPdf', lang)} value="PDF" onPress={handleExportPdf} rtl={rtl} colors={colors} fontScale={fontScale} />
                    <View style={[styles.separator, { backgroundColor: colors.border }, rtl && { marginLeft: 0, marginRight: 52 }]} />
                    <SettingsRow icon="📊" label={t('exportCsv', lang)} value="CSV" onPress={handleExportCsv} rtl={rtl} colors={colors} fontScale={fontScale} />
                </View>

                {/* Lifetime Stats */}
                <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontSize: 12 * fontScale }, rtl && { textAlign: 'right' }]}>
                    {t('lifetimeStats', lang)}
                </Text>
                <View style={[styles.section, { backgroundColor: colors.card }]}>
                    <View style={[styles.statsDataRow, { flexDirection: getFlexDirection(lang) }]}>
                        <Text style={[styles.statsLabel, { color: colors.text, fontSize: 16 * fontScale }]}>{t('totalIncome', lang)}</Text>
                        <Text style={[styles.statsDataValue, { color: colors.success, fontSize: 16 * fontScale }]}>
                            {state.settings.currency?.symbol}{totalIncomes.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </Text>
                    </View>
                    <View style={[styles.separator, { backgroundColor: colors.border }, rtl && { marginLeft: 0, marginRight: 16 }]} />
                    <View style={[styles.statsDataRow, { flexDirection: getFlexDirection(lang) }]}>
                        <Text style={[styles.statsLabel, { color: colors.text, fontSize: 16 * fontScale }]}>{t('totalExpenses', lang)}</Text>
                        <Text style={[styles.statsDataValue, { color: colors.danger, fontSize: 16 * fontScale }]}>
                            {state.settings.currency?.symbol}{totalExpenses.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </Text>
                    </View>
                    <View style={[styles.separator, { backgroundColor: colors.border }, rtl && { marginLeft: 0, marginRight: 16 }]} />
                    <View style={[styles.statsDataRow, { flexDirection: getFlexDirection(lang) }]}>
                        <Text style={[styles.statsLabel, { color: colors.text, fontSize: 16 * fontScale }]}>{t('netBalance', lang)}</Text>
                        <Text style={[styles.statsDataValue, { color: colors.primary, fontSize: 16 * fontScale }]}>
                            {state.settings.currency?.symbol}{(totalIncomes - totalExpenses).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </Text>
                    </View>
                </View>

                {/* Backup & Restore */}
                <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontSize: 12 * fontScale }, rtl && { textAlign: 'right' }]}>
                    {lang === 'ar' ? 'النسخ الاحتياطي' : 'BACKUP & RESTORE'}
                </Text>
                <View style={[styles.section, { backgroundColor: colors.card }]}>
                    <SettingsRow icon="☁️" label={lang === 'ar' ? 'تصدير نسخة احتياطية' : 'Export Backup (JSON)'} value="" onPress={handleExportBackup} rtl={rtl} colors={colors} fontScale={fontScale} />
                    <View style={[styles.separator, { backgroundColor: colors.border }, rtl && { marginLeft: 0, marginRight: 52 }]} />
                    <SettingsRow icon="📥" label={lang === 'ar' ? 'استيراد نسخة احتياطية' : 'Import Backup (JSON)'} value="" onPress={handleImportBackup} rtl={rtl} colors={colors} fontScale={fontScale} />
                </View>

                {/* Danger Zone */}
                <Text style={[styles.sectionTitle, { color: colors.textSecondary, fontSize: 12 * fontScale }, rtl && { textAlign: 'right' }]}>
                    {t('data', lang)}
                </Text>
                <View style={[styles.section, { backgroundColor: colors.card }]}>
                    <TouchableOpacity style={[styles.dangerRow, { flexDirection: getFlexDirection(lang) }]} onPress={handleReset}>
                        <Text style={[styles.dangerIcon, { fontSize: 20 * fontScale }, rtl && { marginRight: 0, marginLeft: Layout.spacing.md }]}>⚠️</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.dangerText, { color: colors.danger, fontSize: 16 * fontScale }, rtl && { textAlign: 'right' }]}>{t('resetAllData', lang)}</Text>
                            <Text style={[styles.dangerSubText, { color: colors.textSecondary, fontSize: 12 * fontScale }, rtl && { textAlign: 'right' }]}>{t('deleteAllTransactions', lang)}</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* About Developer Section */}
                <View style={[styles.section, { backgroundColor: colors.card, marginBottom: isDevSectionOpen ? 0 : Layout.spacing.md, borderBottomLeftRadius: isDevSectionOpen ? 0 : Layout.borderRadius.md, borderBottomRightRadius: isDevSectionOpen ? 0 : Layout.borderRadius.md }]}>
                    <TouchableOpacity
                        onPress={() => setIsDevSectionOpen(!isDevSectionOpen)}
                        activeOpacity={0.7}
                        style={[styles.row, { flexDirection: getFlexDirection(lang) }]}
                    >
                        <Text style={[styles.rowIcon, { fontSize: 20 * fontScale }]}>👨‍💻</Text>
                        <Text style={[styles.rowLabel, { color: colors.text, fontSize: 16 * fontScale, flex: 1 }, rtl && { textAlign: 'right' }]}>
                            {lang === 'ar' ? 'عن المطور' : 'About Developer'}
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{isDevSectionOpen ? '▼' : (rtl ? '◀' : '▶')}</Text>
                    </TouchableOpacity>
                </View>

                {isDevSectionOpen && (
                    <View style={[styles.section, {
                        backgroundColor: colors.card,
                        padding: Layout.spacing.md,
                        marginTop: -Layout.spacing.md,
                        borderTopLeftRadius: 0,
                        borderTopRightRadius: 0,
                        borderTopWidth: 1,
                        borderTopColor: colors.border
                    }]}>
                        <View style={{ alignItems: 'center', marginBottom: Layout.spacing.md }}>
                            <View style={[styles.avatarContainer, { backgroundColor: colors.primary + '15' }]}>
                                <Image source={require('../../assets/fady.png')} style={styles.devAvatar} />
                            </View>
                            <Text style={[styles.devName, { color: colors.text, fontSize: 20 * fontScale }]}>Fady Ehab Amer</Text>
                            <Text style={[styles.devRole, { color: colors.primary, fontSize: 14 * fontScale }]}>Software Engineer</Text>
                        </View>
                        <Text style={[styles.devBio, { color: colors.textSecondary, fontSize: 14 * fontScale, textAlign: isAr ? 'right' : 'left' }]}>
                            {lang === 'ar'
                                ? 'مهندس برمجيات، شغوف لعلوم الحاسوب، ومحب للقطط. متخصص في بناء حلول ويب وسهلة الاستخدام مع التركيز على تطوير الواجهات الأمامية والأنظمة الخلفية. أنا متحمس لتقديم تجارب رقمية عالية الجودة تلبي احتياجاتك الفريدة.'
                                : 'Software Engineer, CS geek, and proud cat dad. I specialize in building modern, user-friendly solutions with a focus on both frontend and backend development. I’m passionate about delivering high-quality digital experiences that meet your unique needs.'}
                        </Text>
                        <View style={[styles.devLinks, { flexDirection: getFlexDirection(lang) }]}>
                            {/* Website */}
                            <TouchableOpacity onPress={() => Linking.openURL('https://fadyehabamer.com')} style={styles.devLinkBtn}>
                                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                                    <Path d="M12 2a10 10 0 1010 10A10 10 0 0012 2zm0 18a8 8 0 118-8 8 8 0 01-8 8z" fill={colors.primary} />
                                    <Path d="M12 6a6 6 0 106 6 6 6 0 00-6-6zm0 10a4 4 0 114-4 4 4 0 01-4 4z" fill={colors.primary} />
                                </Svg>
                            </TouchableOpacity>
                            {/* GitHub */}
                            <TouchableOpacity onPress={() => Linking.openURL('https://github.com/fadyehabamer')} style={styles.devLinkBtn}>
                                <Svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor">
                                    <Path d="M12 2A10 10 0 008.84 21.5c.5.08.66-.23.66-.5V19.3c-2.78.6-3.37-1.34-3.37-1.34-.45-1.15-1.11-1.46-1.11-1.46-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.08.39-1.97 1.03-2.67-.1-.26-.45-1.27.1-2.64 0 0 .83-.27 2.72 1.02a9.45 9.45 0 015 0c1.89-1.3 2.72-1.02 2.72-1.02.55 1.37.2 2.38.1 2.64.64.7 1.03 1.59 1.03 2.67 0 3.82-2.33 4.66-4.56 4.91.36.31.68.92.68 1.85v2.74c0 .27.16.59.67.5A10 10 0 0012 2z" />
                                </Svg>
                            </TouchableOpacity>
                            {/* LinkedIn */}
                            <TouchableOpacity onPress={() => Linking.openURL('https://linkedin.com/in/fadyehabamer')} style={styles.devLinkBtn}>
                                <Svg width={20} height={20} viewBox="0 0 24 24" fill="#0077B5">
                                    <Path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a2.7 2.7 0 0 0-2.7-2.7c-1.2 0-1.8.7-2.1 1.2v-1h-2.5v7.8h2.5v-4.2c0-.2 0-.4.1-.6a1.3 1.3 0 0 1 1.2-1c.8 0 1.1.6 1.1 1.6v4.2h2.4M8.1 7.3c-.9 0-1.5.6-1.5 1.3s.6 1.3 1.5 1.3 1.5-.6 1.5-1.3-.6-1.3-1.5-1.3m1.2 11.2V10.7H6.9v7.8h2.4z" />
                                </Svg>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => Linking.openURL('whatsapp://send?phone=+2014489085')} style={[styles.devLinkBtn, { backgroundColor: '#25D366' }]}>
                                <Svg width={20} height={20} viewBox="0 0 24 24" fill="white">
                                    <Path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.878-.788-1.46-1.761-1.633-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                </Svg>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                <Text style={[styles.version, { color: colors.textSecondary }]}>Mahfazty v1.0.0</Text>
            </ScrollView>

            {/* Budget Modal */}
            <Modal visible={showBudgetModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>
                            {lang === 'ar' ? 'تعيين الميزانية الشهرية' : 'Set Monthly Budget'}
                        </Text>
                        <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                            {lang === 'ar' ? 'حدد حد إنفاق شهري لتتبع ميزانيتك' : 'Set a monthly spending limit to track your budget progress'}
                        </Text>
                        <View style={[styles.budgetInputRow, { flexDirection: getFlexDirection(lang) }]}>
                            <Text style={[styles.budgetCurrency, { color: colors.text }]}>{state.settings.currency?.symbol}</Text>
                            <TextInput
                                style={[styles.budgetInput, { color: colors.text, borderBottomColor: colors.primary }]}
                                placeholder="0" keyboardType="numeric" value={budgetInput}
                                onChangeText={setBudgetInput} autoFocus placeholderTextColor={colors.textSecondary}
                            />
                        </View>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={[styles.modalCancelBtn, { borderColor: colors.border }]} onPress={() => setShowBudgetModal(false)}>
                                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>{t('cancel', lang)}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]} onPress={handleSaveBudget}>
                                <Text style={styles.modalSaveText}>{t('save', lang)}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Passcode Modal */}
            <Modal visible={showPasscodeModal} animationType="slide">
                <View style={[styles.passcodeScreen, { backgroundColor: colors.background }]}>
                    {/* Close button */}
                    <SafeAreaView edges={['top']} style={{ width: '100%' }}>
                        <TouchableOpacity style={styles.passcodeCloseBtn} onPress={() => setShowPasscodeModal(false)}>
                            <Text style={[styles.passcodeCloseText, { color: colors.textSecondary }]}>{isAr ? 'إلغاء' : 'Cancel'}</Text>
                        </TouchableOpacity>
                    </SafeAreaView>

                    {/* Lock icon */}
                    <View style={[styles.passcodeLockIcon, { backgroundColor: colors.primary + '15' }]}>
                        <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
                            <Path d="M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z" stroke={colors.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                            <Path d="M7 11V7a5 5 0 0110 0v4" stroke={colors.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                    </View>

                    {/* Title */}
                    <Text style={[styles.passcodeTitle, { color: colors.text }]}>
                        {passcodeStep === 'remove'
                            ? (isAr ? 'أدخل رمز المرور الحالي' : 'Enter Current Passcode')
                            : passcodeStep === 'confirm'
                                ? (isAr ? 'أعد إدخال رمز المرور' : 'Confirm Passcode')
                                : (isAr ? 'أدخل رمز المرور الجديد' : 'Enter New Passcode')}
                    </Text>
                    <Text style={[styles.passcodeSubtitle, { color: colors.textSecondary }]}>
                        {passcodeStep === 'confirm'
                            ? (isAr ? 'أعد إدخال نفس الأرقام للتأكيد' : 'Re-enter the same digits to confirm')
                            : (isAr ? 'أدخل 4 أرقام' : 'Enter 4 digits')}
                    </Text>

                    {/* Step indicator */}
                    {passcodeStep !== 'remove' && (
                        <View style={styles.stepRow}>
                            <View style={[styles.stepDot, { backgroundColor: colors.primary }]} />
                            <View style={[styles.stepLine, { backgroundColor: passcodeStep === 'confirm' ? colors.primary : colors.border }]} />
                            <View style={[styles.stepDot, { backgroundColor: passcodeStep === 'confirm' ? colors.primary : colors.border }]} />
                        </View>
                    )}

                    {/* PIN dots */}
                    <View style={styles.pcdDotsRow}>
                        {[0, 1, 2, 3].map((i) => (
                            <View key={i} style={[
                                styles.pcdDot,
                                { borderColor: colors.primary },
                                passcodeInput.length > i && { backgroundColor: colors.primary, transform: [{ scale: 1.15 }] },
                            ]} />
                        ))}
                    </View>

                    {/* Numpad */}
                    <View style={styles.numpad}>
                        {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['', '0', 'del']].map((row, ri) => (
                            <View key={ri} style={styles.numpadRow}>
                                {row.map((d, ci) => {
                                    if (d === '') return <View key={ci} style={styles.numpadKey} />;
                                    if (d === 'del') return (
                                        <TouchableOpacity key={ci} style={styles.numpadKey} onPress={handlePasscodeDelete} activeOpacity={0.5}>
                                            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                                                <Path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z" stroke={colors.textSecondary} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                                                <Path d="M18 9l-6 6M12 9l6 6" stroke={colors.textSecondary} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                                            </Svg>
                                        </TouchableOpacity>
                                    );
                                    return (
                                        <TouchableOpacity
                                            key={ci}
                                            style={[styles.numpadKey, styles.numpadKeyCircle, { backgroundColor: colors.card }]}
                                            onPress={() => handlePasscodeDigit(d)}
                                            activeOpacity={0.6}
                                        >
                                            <Text style={[styles.numpadKeyText, { color: colors.text }]}>{d}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        ))}
                    </View>
                </View>
            </Modal>

            {/* Time Picker Modal */}
            {showTimePicker && (
                <DateTimePicker
                    value={dayjs().hour(Number((state.settings.dailyReminderTime || '20:00').split(':')[0])).minute(Number((state.settings.dailyReminderTime || '20:00').split(':')[1])).toDate()}
                    mode="time"
                    is24Hour={false}
                    display="default"
                    onChange={onTimeChange}
                />
            )}
        </SafeAreaView>
    );
};

const SettingsRow = ({ icon, label, value, onPress, rtl = false, colors, fontScale = 1 }: {
    icon: string; label: string; value: string; onPress: () => void; rtl?: boolean; colors: any; fontScale?: number;
}) => (
    <TouchableOpacity style={[styles.row, { flexDirection: rtl ? 'row-reverse' : 'row' }]} onPress={onPress} activeOpacity={0.6}>
        <Text style={[styles.rowIcon, { fontSize: 20 * fontScale }, rtl ? { marginLeft: Layout.spacing.md, marginRight: 0 } : {}]}>{icon}</Text>
        <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: colors.text, fontSize: 16 * fontScale }, rtl && { textAlign: 'right' }]}>{label}</Text>
        </View>
        <Text style={[styles.rowValue, { color: colors.textSecondary, fontSize: 14 * fontScale }]}>{value}</Text>
        <Text style={[styles.rowChevron, { color: colors.textSecondary, fontSize: 20 * fontScale }]}>{rtl ? '‹' : '›'}</Text>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: Layout.spacing.lg, paddingTop: Layout.spacing.md, paddingBottom: Layout.spacing.md },
    headerTitle: { fontFamily: Fonts.bold, fontSize: 24 },
    scrollContent: { paddingBottom: 80 },
    statsCard: {
        marginHorizontal: Layout.spacing.md, marginBottom: Layout.spacing.lg,
        borderRadius: Layout.borderRadius.md, padding: Layout.spacing.lg,
    },
    statRow: { flexDirection: 'row', alignItems: 'center' },
    statItem: { flex: 1, alignItems: 'center' },
    statValue: { fontFamily: Fonts.bold, fontSize: 24, color: '#FFFFFF' },
    statLabel: { fontFamily: Fonts.medium, fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
    statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.2)' },
    sectionTitle: { fontFamily: Fonts.semiBold, fontSize: 12, paddingHorizontal: Layout.spacing.lg, marginBottom: Layout.spacing.sm, marginTop: Layout.spacing.sm, letterSpacing: 1 },
    section: {
        marginHorizontal: Layout.spacing.md, marginBottom: Layout.spacing.md,
        borderRadius: Layout.borderRadius.md,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 2,
    },
    row: { flexDirection: 'row', alignItems: 'center', padding: Layout.spacing.md },
    rowIcon: { fontSize: 20, marginRight: Layout.spacing.md },
    rowLabel: { fontFamily: Fonts.medium, fontSize: 16 },
    rowValue: { fontFamily: Fonts.regular, fontSize: 14, marginRight: 4 },
    rowChevron: { fontSize: 20 },
    rowSubLabel: { fontFamily: Fonts.regular, fontSize: 12, marginTop: 2 },
    colorRow: { flexDirection: 'row', gap: 10, marginTop: 10, flexWrap: 'wrap' },
    colorDot: { width: 28, height: 28, borderRadius: 14 },
    colorDotActive: { borderWidth: 3, borderColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
    separator: { height: 1, marginLeft: 52 },
    statsDataRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Layout.spacing.md },
    statsLabel: { fontFamily: Fonts.regular, fontSize: 16 },
    statsDataValue: { fontFamily: Fonts.bold, fontSize: 16 },
    dangerRow: { flexDirection: 'row', alignItems: 'center', padding: Layout.spacing.md },
    dangerIcon: { fontSize: 20, marginRight: Layout.spacing.md },
    dangerText: { fontFamily: Fonts.semiBold, fontSize: 16 },
    dangerSubText: { fontFamily: Fonts.regular, fontSize: 12, marginTop: 2 },
    version: { fontFamily: Fonts.regular, textAlign: 'center', fontSize: 12, marginTop: Layout.spacing.lg },
    modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: Layout.spacing.lg },
    modalContent: { borderRadius: Layout.borderRadius.lg, padding: Layout.spacing.lg },
    modalTitle: { fontFamily: Fonts.bold, fontSize: 20, textAlign: 'center', marginBottom: 4 },
    modalSubtitle: { fontFamily: Fonts.regular, fontSize: 14, textAlign: 'center', marginBottom: Layout.spacing.lg },
    budgetInputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: Layout.spacing.lg },
    budgetCurrency: { fontFamily: Fonts.bold, fontSize: 28, marginRight: 8 },
    budgetInput: { fontFamily: Fonts.bold, fontSize: 36, minWidth: 120, textAlign: 'center', borderBottomWidth: 2, paddingVertical: 8 },
    modalButtons: { flexDirection: 'row', gap: Layout.spacing.md },
    modalCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: Layout.borderRadius.sm, borderWidth: 1, alignItems: 'center' },
    modalCancelText: { fontFamily: Fonts.semiBold, fontSize: 16 },
    modalSaveBtn: { flex: 1, paddingVertical: 12, borderRadius: Layout.borderRadius.sm, alignItems: 'center' },
    modalSaveText: { fontFamily: Fonts.bold, fontSize: 16, color: '#FFFFFF' },
    // Passcode full-screen modal
    passcodeScreen: { flex: 1, alignItems: 'center', paddingTop: 0 },
    passcodeCloseBtn: { alignSelf: 'flex-start', padding: Layout.spacing.md, paddingTop: Layout.spacing.sm },
    passcodeCloseText: { fontFamily: Fonts.semiBold, fontSize: 16 },
    passcodeLockIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginTop: Layout.spacing.lg, marginBottom: Layout.spacing.md },
    passcodeTitle: { fontFamily: Fonts.bold, fontSize: 22, textAlign: 'center', marginBottom: 4 },
    passcodeSubtitle: { fontFamily: Fonts.regular, fontSize: 14, textAlign: 'center', marginBottom: Layout.spacing.md },
    stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Layout.spacing.lg },
    stepDot: { width: 10, height: 10, borderRadius: 5 },
    stepLine: { width: 40, height: 2 },
    pcdDotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: Layout.spacing.xl },
    pcdDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2.5 },
    numpad: { width: '100%', maxWidth: 300, marginTop: Layout.spacing.sm },
    numpadRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 12 },
    numpadKey: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center', marginHorizontal: 10 },
    numpadKeyCircle: { borderRadius: 36, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
    numpadKeyText: { fontFamily: Fonts.semiBold, fontSize: 28 },
    fontScaleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 40, justifyContent: 'center' },
    fontScaleBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', padding: 0 },
    fontScaleBtnText: { fontSize: 20, fontFamily: Fonts.bold, lineHeight: 22, textAlign: 'center', textAlignVertical: 'center' },
    fontScaleValue: { fontSize: 16, fontFamily: Fonts.bold, minWidth: 45, textAlign: 'center' },
    avatarContainer: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: Layout.spacing.sm, overflow: 'hidden' },
    devAvatar: { width: '100%', height: '100%', resizeMode: 'cover' },
    devName: { fontFamily: Fonts.bold, fontSize: 20, marginBottom: 2 },
    devRole: { fontFamily: Fonts.semiBold, fontSize: 14, marginBottom: Layout.spacing.md },
    devBio: { fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20, marginBottom: Layout.spacing.lg },
    devLinks: { flexDirection: 'row', justifyContent: 'center', gap: Layout.spacing.md },
    devLinkBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F8F9FA', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
    sectionHeaderRow: { paddingHorizontal: Layout.spacing.lg, marginBottom: Layout.spacing.sm, marginTop: Layout.spacing.sm, flexDirection: 'row', alignItems: 'center' },
});

export default SettingsScreen;

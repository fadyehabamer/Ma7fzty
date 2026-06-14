import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useApp } from '../context/AppContext';
import { Layout, Fonts } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';
import { Currency } from '../types';
import { isRTL, getFlexDirection } from '../utils/i18n';

const ARAB_CURRENCIES: Currency[] = [
    { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal', nameAr: 'ريال سعودي', flag: '🇸🇦' },
    { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', nameAr: 'درهم إماراتي', flag: '🇦🇪' },
    { code: 'EGP', symbol: 'ج.م', name: 'Egyptian Pound', nameAr: 'جنيه مصري', flag: '🇪🇬' },
    { code: 'IQD', symbol: 'ع.د', name: 'Iraqi Dinar', nameAr: 'دينار عراقي', flag: '🇮🇶' },
    { code: 'JOD', symbol: 'د.أ', name: 'Jordanian Dinar', nameAr: 'دينار أردني', flag: '🇯🇴' },
    { code: 'KWD', symbol: 'د.ك', name: 'Kuwaiti Dinar', nameAr: 'دينار كويتي', flag: '🇰🇼' },
    { code: 'QAR', symbol: 'ر.ق', name: 'Qatari Riyal', nameAr: 'ريال قطري', flag: '🇶🇦' },
    { code: 'BHD', symbol: 'د.ب', name: 'Bahraini Dinar', nameAr: 'دينار بحريني', flag: '🇧🇭' },
    { code: 'OMR', symbol: 'ر.ع', name: 'Omani Rial', nameAr: 'ريال عماني', flag: '🇴🇲' },
    { code: 'LBP', symbol: 'ل.ل', name: 'Lebanese Pound', nameAr: 'ليره لبنانيه', flag: '🇱🇧' },
    { code: 'MAD', symbol: 'د.م', name: 'Moroccan Dirham', nameAr: 'درهم مغربي', flag: '🇲🇦' },
    { code: 'TND', symbol: 'د.ت', name: 'Tunisian Dinar', nameAr: 'دينار تونسي', flag: '🇹🇳' },
    { code: 'DZD', symbol: 'د.ج', name: 'Algerian Dinar', nameAr: 'دينار جزائري', flag: '🇩🇿' },
    { code: 'LYD', symbol: 'ل.د', name: 'Libyan Dinar', nameAr: 'دينار ليبي', flag: '🇱🇾' },
    { code: 'SDG', symbol: 'ج.س', name: 'Sudanese Pound', nameAr: 'جنيه سوداني', flag: '🇸🇩' },
    { code: 'SYP', symbol: 'ل.س', name: 'Syrian Pound', nameAr: 'ليره سوريه', flag: '🇸🇾' },
    { code: 'YER', symbol: 'ر.ي', name: 'Yemeni Rial', nameAr: 'ريال يمني', flag: '🇾🇪' },
    { code: 'USD', symbol: '$', name: 'US Dollar', nameAr: 'دولار أمريكي', flag: '🇺🇸' },
    { code: 'EUR', symbol: '€', name: 'Euro', nameAr: 'يورو', flag: '🇪🇺' },
    { code: 'GBP', symbol: '£', name: 'British Pound', nameAr: 'جنيه إسترليني', flag: '🇬🇧' },
    { code: 'TRY', symbol: '₺', name: 'Turkish Lira', nameAr: 'ليرة تركية', flag: '🇹🇷' },
];

const CurrencySelectScreen = ({ navigation }: any) => {
    const { dispatch, state } = useApp();
    const { colors } = useTheme();
    const lang = state.settings.language || 'en';
    const rtl = isRTL(lang);
    const [searchQuery, setSearchQuery] = useState('');
    const canGoBack = !!navigation?.canGoBack?.();

    const filteredCurrencies = useMemo(() => {
        if (!searchQuery.trim()) return ARAB_CURRENCIES;
        const q = searchQuery.toLowerCase().trim();
        return ARAB_CURRENCIES.filter((c) =>
            c.code.toLowerCase().includes(q) ||
            c.name.toLowerCase().includes(q) ||
            c.nameAr.includes(q) ||
            c.symbol.includes(q)
        );
    }, [searchQuery]);

    const handleSelect = (currency: Currency) => {
        dispatch({ type: 'SET_CURRENCY', payload: currency });
        // When opened from Settings (pushed on the stack) return to it; during
        // first-run onboarding there's nothing to go back to and the gate flips.
        if (canGoBack) navigation.goBack();
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.headerBlock}>
                {canGoBack && (
                    <TouchableOpacity
                        style={[styles.backBtn, rtl ? { right: Layout.spacing.md } : { left: Layout.spacing.md }]}
                        onPress={() => navigation.goBack()}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
                            <Path d={rtl ? 'M5 12h14M12 5l7 7-7 7' : 'M19 12H5M12 19l-7-7 7-7'} stroke={colors.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                    </TouchableOpacity>
                )}
                <Text style={[styles.title, { color: colors.text }]}>
                    {lang === 'ar' ? 'اختر العملة' : 'Select Currency'}
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    {lang === 'ar' ? 'اختر العملة التي تريد استخدامها' : 'Choose your preferred currency'}
                </Text>
            </View>

            {/* Search Input */}
            <View style={styles.searchContainer}>
                <TextInput
                    style={[
                        styles.searchInput,
                        { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
                        rtl && { textAlign: 'right' }
                    ]}
                    placeholder={lang === 'ar' ? 'ابحث عن العملة...' : 'Search currencies...'}
                    placeholderTextColor={colors.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            <FlatList
                data={filteredCurrencies}
                keyExtractor={(item) => item.code}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: Layout.spacing.md, paddingBottom: Layout.spacing.xxl }}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[styles.currencyCard, { backgroundColor: colors.card }]}
                        onPress={() => handleSelect(item)}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.currencyRow, { flexDirection: getFlexDirection(lang), gap: 20 }]}>
                            <Text style={styles.flag}>{item.flag}</Text>
                            <View style={[styles.currencyInfo, rtl && { alignItems: 'flex-end' }]}>
                                <Text style={[styles.currencyCode, { color: colors.text }]}>{item.code}</Text>
                                <Text style={[styles.currencyName, { color: colors.textSecondary }]}>
                                    {lang === 'ar' ? `${item.nameAr} (${item.name})` : `${item.name} (${item.nameAr})`}
                                </Text>
                            </View>
                            <View style={[styles.symbolBadge, { backgroundColor: colors.primary + '12' }]}>
                                <Text style={[styles.symbolText, { color: colors.primary }]}>{item.symbol}</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                )}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    headerBlock: { paddingHorizontal: Layout.spacing.lg, paddingTop: Layout.spacing.xl, paddingBottom: Layout.spacing.sm, alignItems: 'center' },
    backBtn: { position: 'absolute', top: Layout.spacing.xl, width: 40, height: 40, justifyContent: 'center', alignItems: 'center', zIndex: 2 },
    title: { fontFamily: Fonts.bold, fontSize: 26, marginBottom: Layout.spacing.xs },
    subtitle: { fontFamily: Fonts.regular, fontSize: 15 },
    searchContainer: { paddingHorizontal: Layout.spacing.md, marginBottom: Layout.spacing.md },
    searchInput: { borderRadius: Layout.borderRadius.sm, paddingHorizontal: Layout.spacing.md, paddingVertical: 12, fontFamily: Fonts.regular, fontSize: 16, borderWidth: 1 },
    currencyCard: { borderRadius: Layout.borderRadius.md, marginBottom: Layout.spacing.sm, padding: Layout.spacing.md, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 2 },
    currencyRow: { flexDirection: 'row', alignItems: 'center' },
    flag: { fontSize: 30, marginRight: Layout.spacing.md },
    currencyInfo: { flex: 1 },
    currencyCode: { fontFamily: Fonts.bold, fontSize: 17 },
    currencyName: { fontFamily: Fonts.regular, fontSize: 13, marginTop: 2 },
    symbolBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: Layout.borderRadius.sm },
    symbolText: { fontFamily: Fonts.bold, fontSize: 16 },
});

export default CurrencySelectScreen;

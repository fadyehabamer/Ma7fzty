import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { Layout, Fonts } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const LanguageSelectScreen = () => {
    const { dispatch } = useApp();
    const { colors } = useTheme();

    const handleSelectLanguage = (lang: 'en' | 'ar') => {
        dispatch({ type: 'SET_LANGUAGE', payload: lang });
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header Icon */}
            <View style={[styles.iconCircle, { backgroundColor: colors.primary + '15' }]}>
                <Text style={styles.iconEmoji}>🌍</Text>
            </View>

            {/* Title */}
            <Text style={[styles.title, { color: colors.text }]}>Choose Your Language</Text>
            <Text style={[styles.titleAr, { color: colors.text }]}>اختر لغتك</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Select your preferred language
            </Text>

            {/* Language Options */}
            <View style={styles.optionsContainer}>
                {/* English */}
                <TouchableOpacity
                    style={[styles.languageCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => handleSelectLanguage('en')}
                    activeOpacity={0.7}
                >
                    <Text style={styles.flag}>🇺🇸</Text>
                    <View style={styles.langInfo}>
                        <Text style={[styles.langName, { color: colors.text }]}>English</Text>
                        <Text style={[styles.langNative, { color: colors.textSecondary }]}>English</Text>
                    </View>
                    <View style={[styles.selectIndicator, { borderColor: colors.primary }]}>
                        <View style={[styles.selectInner, { backgroundColor: colors.primary }]} />
                    </View>
                </TouchableOpacity>

                {/* Arabic */}
                <TouchableOpacity
                    style={[styles.languageCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => handleSelectLanguage('ar')}
                    activeOpacity={0.7}
                >
                    <Text style={styles.flag}>🇸🇦</Text>
                    <View style={styles.langInfo}>
                        <Text style={[styles.langName, { color: colors.text }]}>Arabic</Text>
                        <Text style={[styles.langNative, { color: colors.textSecondary }]}>العربية</Text>
                    </View>
                    <View style={[styles.selectIndicator, { borderColor: colors.primary }]}>
                        <View style={[styles.selectInner, { backgroundColor: colors.primary }]} />
                    </View>
                </TouchableOpacity>
            </View>

            {/* Footer hint */}
            <Text style={[styles.footerHint, { color: colors.textSecondary }]}>
                You can change this later in Settings
            </Text>
            <Text style={[styles.footerHintAr, { color: colors.textSecondary }]}>
                يمكنك تغيير هذا لاحقاً من الإعدادات
            </Text>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: Layout.spacing.xl,
        paddingTop: 60,
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Layout.spacing.xl,
    },
    iconEmoji: {
        fontSize: 48,
    },
    title: {
        fontFamily: Fonts.bold,
        fontSize: 28,
        textAlign: 'center',
        marginBottom: 4,
    },
    titleAr: {
        fontFamily: Fonts.bold,
        fontSize: 24,
        textAlign: 'center',
        marginBottom: Layout.spacing.sm,
    },
    subtitle: {
        fontFamily: Fonts.regular,
        fontSize: 16,
        textAlign: 'center',
        marginBottom: Layout.spacing.xxl,
    },
    optionsContainer: {
        width: '100%',
        gap: Layout.spacing.md,
    },
    languageCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Layout.spacing.lg,
        borderRadius: Layout.borderRadius.lg,
        borderWidth: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    flag: {
        fontSize: 40,
        marginRight: Layout.spacing.md,
    },
    langInfo: {
        flex: 1,
    },
    langName: {
        fontFamily: Fonts.bold,
        fontSize: 20,
    },
    langNative: {
        fontFamily: Fonts.medium,
        fontSize: 14,
        marginTop: 2,
    },
    selectIndicator: {
        width: 26,
        height: 26,
        borderRadius: 13,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectInner: {
        width: 14,
        height: 14,
        borderRadius: 7,
        opacity: 0,
    },
    footerHint: {
        fontFamily: Fonts.regular,
        fontSize: 13,
        textAlign: 'center',
        marginTop: 'auto',
        marginBottom: 4,
    },
    footerHintAr: {
        fontFamily: Fonts.regular,
        fontSize: 13,
        textAlign: 'center',
        marginBottom: Layout.spacing.xl,
    },
});

export default LanguageSelectScreen;

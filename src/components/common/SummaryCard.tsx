import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Layout, Fonts } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { useApp } from '../../context/AppContext';
import { Currency } from '../../types';
import { t, formatCurrency } from '../../utils/i18n';
import Svg, { Path, Rect, Circle, Text as SvgText, LinearGradient, Stop, Defs } from 'react-native-svg';

interface Props {
    income: number;
    expense: number;
    currency: Currency;
    lang?: string;
}

const SummaryCard = ({ income, expense, currency, lang = 'en' }: Props) => {
    const { state } = useApp();
    const { colors } = useTheme();
    const [isVisible, setIsVisible] = useState(true);
    const balance = income - expense;
    const isAr = lang === 'ar';

    return (
        <View style={styles.container}>
            <View style={styles.svgBackground}>
                <Svg height="100%" width="100%" viewBox="0 0 400 150" preserveAspectRatio="none">
                    <Defs>
                        <LinearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <Stop offset="0%" stopColor={colors.primary} stopOpacity="1" />
                            <Stop offset="100%" stopColor={colors.primaryDark || colors.primary} stopOpacity="1" />
                        </LinearGradient>
                    </Defs>
                    <Rect width="400" height="150" fill="url(#grad)" />
                    {/* Fancy mesh/patterns */}
                    <Circle cx="350" cy="20" r="100" fill="rgba(255,255,255,0.06)" />
                    <Circle cx="50" cy="130" r="80" fill="rgba(255,255,255,0.08)" />
                    <Path
                        d="M0 100 Q 100 70, 200 100 T 400 100"
                        stroke="rgba(255,255,255,0.12)"
                        strokeWidth="1.5"
                        fill="none"
                    />
                    <Path
                        d="M0 110 Q 100 80, 200 110 T 400 110"
                        stroke="rgba(255,255,255,0.06)"
                        strokeWidth="1"
                        fill="none"
                    />
                </Svg>
            </View>

            {/* Content Overlay */}
            <View style={styles.content}>
                {/* Top row: Label and Eye Toggle */}
                <View style={[styles.header, { flexDirection: isAr ? 'row-reverse' : 'row' }]}>
                    <Text style={[styles.label, { fontSize: 17 * (state.settings.fontScale || 1) }]}>{t('balance', lang)}</Text>
                    <TouchableOpacity onPress={() => setIsVisible(!isVisible)} style={styles.eyeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                            {isVisible ? (
                                <Path
                                    d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                                    stroke="rgba(255,255,255,0.9)"
                                    strokeWidth={2}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            ) : (
                                <Path
                                    d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 011.24-2.33M1 1l22 22M6.73 6.73A10.08 10.08 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M10.94 10.94a3 3 0 114.12 4.12"
                                    stroke="rgba(255,255,255,0.9)"
                                    strokeWidth={2}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            )}
                            {isVisible && <Circle cx="12" cy="12" r="3" stroke="rgba(255,255,255,0.9)" strokeWidth={2} />}
                        </Svg>
                    </TouchableOpacity>
                </View>

                {/* Middle: Large Balance */}
                <View style={[styles.amountContainer, { flexDirection: isAr ? 'row-reverse' : 'row' }]}>
                    {isVisible ? (
                        <View style={[styles.amountWrapper, { flexDirection: isAr ? 'row-reverse' : 'row' }]}>
                            {isAr && (
                                <Text style={[styles.currency, { fontSize: 18 * (state.settings.fontScale || 1), marginRight: 6 }]}>
                                    {currency.symbol}
                                </Text>
                            )}
                            <Text
                                style={[styles.amount, { fontSize: 42 * (state.settings.fontScale || 1) }]}
                                adjustsFontSizeToFit
                                numberOfLines={1}
                                minimumFontScale={0.4}
                            >
                                {balance < 0 ? '-' : ''}
                                {Math.abs(balance).toLocaleString('en-US', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
                            </Text>
                            {!isAr && (
                                <Text style={[styles.currency, { fontSize: 18 * (state.settings.fontScale || 1), marginLeft: 8 }]}>
                                    {currency.code}
                                </Text>
                            )}
                        </View>
                    ) : (
                        <Text style={[styles.amount, { fontSize: 38 * (state.settings.fontScale || 1) }]}>••••••••</Text>
                    )}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 150,
        borderRadius: Layout.borderRadius.xl,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
    },
    svgBackground: {
        ...StyleSheet.absoluteFillObject,
    },
    content: {
        flex: 1,
        padding: Layout.spacing.lg,
        paddingHorizontal: Layout.spacing.xl,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Layout.spacing.sm,
    },
    label: {
        fontFamily: Fonts.medium,
        fontSize: 17,
        color: 'rgba(255,255,255,0.9)',
        textShadowColor: 'rgba(0,0,0,0.15)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    eyeBtn: {
        padding: 4,
    },
    amountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: Layout.spacing.xs,
        flex: 1,
    },
    amountWrapper: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'center',
    },
    currency: {
        fontFamily: Fonts.medium,
        color: 'rgba(255,255,255,0.85)',
        marginBottom: 4, // Alight slightly differently for modern look
    },
    amount: {
        fontFamily: Fonts.bold,
        color: '#FFFFFF',
        letterSpacing: 0.5,
        textShadowColor: 'rgba(0,0,0,0.25)',
        textShadowOffset: { width: 0, height: 3 },
        textShadowRadius: 6,
    },
});

export default SummaryCard;

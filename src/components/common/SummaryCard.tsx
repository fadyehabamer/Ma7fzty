import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Layout, Fonts } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { useApp } from '../../context/AppContext';
import { Currency } from '../../types';
import { t, formatCurrency } from '../../utils/i18n';
import Svg, { Rect, Circle, LinearGradient, RadialGradient, Stop, Defs } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

interface Props {
    income: number;
    expense: number;
    currency: Currency;
    lang?: string;
}

const SummaryCard = ({ income, expense, currency, lang = 'en' }: Props) => {
    const { state } = useApp();
    const { colors } = useTheme();
    const balance = income - expense;
    const isAr = lang === 'ar';
    const hidden = !!state.settings.privacyMode;
    const fs = state.settings.fontScale || 1;

    return (
        <View style={styles.container}>
            <View style={styles.svgBackground}>
                <Svg height="100%" width="100%" viewBox="0 0 400 150" preserveAspectRatio="none">
                    <Defs>
                        <LinearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <Stop offset="0%" stopColor={colors.primary} stopOpacity="1" />
                            <Stop offset="100%" stopColor={colors.primaryDark || colors.primary} stopOpacity="1" />
                        </LinearGradient>
                        {/* Soft light source in the top corner for a modern, glassy feel */}
                        <RadialGradient id="glow" cx="82%" cy="10%" r="70%">
                            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.22" />
                            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                        </RadialGradient>
                    </Defs>
                    <Rect width="400" height="150" fill="url(#grad)" />
                    <Rect width="400" height="150" fill="url(#glow)" />
                    <Circle cx="362" cy="16" r="66" fill="rgba(255,255,255,0.05)" />
                    <Circle cx="34" cy="150" r="62" fill="rgba(0,0,0,0.06)" />
                </Svg>
            </View>

            {/* Content Overlay */}
            <View style={styles.content}>
                {/* Top row: Label */}
                <View style={[styles.header, { flexDirection: isAr ? 'row-reverse' : 'row' }]}>
                    <View style={[styles.labelRow, { flexDirection: isAr ? 'row-reverse' : 'row' }]}>
                        <Ionicons name="wallet-outline" size={13} color="rgba(255,255,255,0.85)" />
                        <Text style={[styles.label, { fontSize: 12 * fs }]}>{t('balance', lang)}</Text>
                    </View>
                </View>

                {/* Main row: large balance + vertical income/expense stack on the side */}
                <View style={[styles.mainRow, { flexDirection: isAr ? 'row-reverse' : 'row' }]}>
                    {/* Large Balance */}
                    <View style={[styles.balanceCol, { alignItems: isAr ? 'flex-end' : 'flex-start' }]}>
                        {!hidden ? (
                            <View style={[styles.amountWrapper, { flexDirection: isAr ? 'row-reverse' : 'row' }]}>
                                <Text
                                    style={[styles.amount, { fontSize: 32 * fs }]}
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
                                {/* In Arabic the symbol sits to the left of the number; in LTR the code sits to the right. */}
                                <Text style={[styles.currency, { fontSize: 15 * fs }]}>
                                    {isAr ? currency.symbol : currency.code}
                                </Text>
                            </View>
                        ) : (
                            <Text style={[styles.amount, { fontSize: 30 * fs }]}>••••••••</Text>
                        )}
                    </View>

                    <View style={styles.vDivider} />

                    {/* Income / Expense, stacked vertically. Align items stretch lets short and
                        long values share the same container width, aligning both icons and text. */}
                    <View style={[styles.statsCol, { alignItems: 'stretch' }]}>
                        <View style={[styles.statItem, { flexDirection: isAr ? 'row-reverse' : 'row', justifyContent: 'space-between' }]}>
                            <Ionicons name="arrow-up" size={12} color="#86EFAC" />
                            <Text style={[styles.statValue, { fontSize: 12 * fs, textAlign: isAr ? 'left' : 'right' }]} numberOfLines={1}>
                                {formatCurrency(income, currency, lang, false)}
                            </Text>
                        </View>
                        <View style={[styles.statItem, { flexDirection: isAr ? 'row-reverse' : 'row', justifyContent: 'space-between' }]}>
                            <Ionicons name="arrow-down" size={12} color="#FDA4AF" />
                            <Text style={[styles.statValue, { fontSize: 12 * fs, textAlign: isAr ? 'left' : 'right' }]} numberOfLines={1}>
                                {formatCurrency(expense, currency, lang, false)}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 112,
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
        paddingTop: Layout.spacing.sm,
        paddingBottom: Layout.spacing.sm,
        paddingHorizontal: Layout.spacing.lg,
        justifyContent: 'space-between',
    },
    header: {
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
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
    mainRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    balanceCol: {
        flex: 1,
        justifyContent: 'center',
    },
    amountWrapper: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 6,
    },
    vDivider: {
        width: 1,
        height: 36,
        backgroundColor: 'rgba(255,255,255,0.22)',
        marginHorizontal: 14,
    },
    statsCol: {
        justifyContent: 'center',
        gap: 8,
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
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    statValue: {
        fontFamily: Fonts.semiBold,
        fontSize: 13,
        color: '#FFFFFF',
    },
});

export default SummaryCard;

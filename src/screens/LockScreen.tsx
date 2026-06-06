import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Animated, Vibration,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { Layout, Fonts } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';
import { useApp } from '../context/AppContext';
import { isBiometricAvailable, getBiometricLabel, authenticateBiometric } from '../utils/biometrics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface LockScreenProps {
    onUnlock: () => void;
}

const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
    const { state } = useApp();
    const { colors } = useTheme();
    const lang = state.settings.language || 'en';
    const isAr = lang === 'ar';
    const passcode = state.settings.passcode || '';

    const [entered, setEntered] = useState('');
    const [error, setError] = useState(false);
    const shakeAnim = useRef(new Animated.Value(0)).current;

    const biometricEnabled = !!state.settings.biometricEnabled;
    const [bioAvailable, setBioAvailable] = useState(false);
    const [bioLabel, setBioLabel] = useState('');
    const bioTried = useRef(false);

    const runBiometric = async () => {
        const ok = await authenticateBiometric(isAr ? 'افتح التطبيق' : 'Unlock Ma7fzty');
        if (ok) onUnlock();
    };

    // On mount: if biometric is enabled and available, prompt automatically once.
    useEffect(() => {
        let mounted = true;
        (async () => {
            if (!biometricEnabled) return;
            const avail = await isBiometricAvailable();
            if (!mounted) return;
            setBioAvailable(avail);
            if (!avail) return;
            const label = await getBiometricLabel(lang);
            if (mounted) setBioLabel(label);
            if (!bioTried.current) {
                bioTried.current = true;
                const ok = await authenticateBiometric(isAr ? 'افتح التطبيق' : 'Unlock Ma7fzty');
                if (ok && mounted) onUnlock();
            }
        })();
        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        if (entered.length === 4) {
            if (entered === passcode) {
                onUnlock();
            } else {
                setError(true);
                Vibration.vibrate(200);
                Animated.sequence([
                    Animated.timing(shakeAnim, { toValue: 15, duration: 50, useNativeDriver: true }),
                    Animated.timing(shakeAnim, { toValue: -15, duration: 50, useNativeDriver: true }),
                    Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
                    Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
                    Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
                ]).start(() => {
                    setEntered('');
                    setError(false);
                });
            }
        }
    }, [entered]);

    const handlePress = (digit: string) => {
        if (entered.length < 4) setEntered((prev) => prev + digit);
    };

    const handleDelete = () => {
        setEntered((prev) => prev.slice(0, -1));
    };

    const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.topSection}>
                {/* Lock Icon */}
                <View style={[styles.lockCircle, { backgroundColor: colors.primary + '15' }]}>
                    <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
                        <Rect x="3" y="11" width="18" height="11" rx="2" stroke={colors.primary} strokeWidth={2} />
                        <Path d="M7 11V7a5 5 0 0110 0v4" stroke={colors.primary} strokeWidth={2} strokeLinecap="round" />
                    </Svg>
                </View>

                <Text style={[styles.title, { color: colors.text }]}>
                    {isAr ? 'أدخل رمز المرور' : 'Enter Passcode'}
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    {error
                        ? (isAr ? 'رمز المرور غير صحيح' : 'Incorrect passcode')
                        : (isAr ? 'أدخل رمز المرور المكون من 4 أرقام' : 'Enter your 4-digit passcode')}
                </Text>

                {/* PIN Dots */}
                <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
                    {[0, 1, 2, 3].map((i) => (
                        <View
                            key={i}
                            style={[
                                styles.dot,
                                { borderColor: error ? colors.danger : colors.primary },
                                entered.length > i && {
                                    backgroundColor: error ? colors.danger : colors.primary,
                                },
                            ]}
                        />
                    ))}
                </Animated.View>
            </View>

            {/* Number Pad */}
            <View style={styles.padContainer}>
                <View style={styles.padGrid}>
                    {digits.map((digit, idx) => {
                        if (digit === '') {
                            return <View key={idx} style={styles.padBtn} />;
                        }
                        if (digit === 'del') {
                            return (
                                <TouchableOpacity
                                    key={idx}
                                    style={styles.padBtn}
                                    onPress={handleDelete}
                                    activeOpacity={0.5}
                                    disabled={entered.length === 0}
                                >
                                    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                                        <Path
                                            d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2zM18 9l-6 6M12 9l6 6"
                                            stroke={entered.length > 0 ? colors.text : colors.textSecondary}
                                            strokeWidth={2}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </Svg>
                                </TouchableOpacity>
                            );
                        }
                        return (
                            <TouchableOpacity
                                key={idx}
                                style={[styles.padBtn, styles.padBtnCircle, { backgroundColor: colors.card }]}
                                onPress={() => handlePress(digit)}
                                activeOpacity={0.6}
                            >
                                <Text style={[styles.padDigit, { color: colors.text }]}>{digit}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {bioAvailable && (
                    <TouchableOpacity style={styles.bioBtn} onPress={runBiometric} activeOpacity={0.7}>
                        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                            <Path d="M18.9 7a8 8 0 0 1 1.1 5v1a6 6 0 0 0 .8 3" stroke={colors.primary} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                            <Path d="M8 11a4 4 0 0 1 8 0v1a10 10 0 0 0 2 6" stroke={colors.primary} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                            <Path d="M12 11v2a14 14 0 0 0 2.5 8" stroke={colors.primary} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                            <Path d="M8 15a18 18 0 0 0 1.8 6" stroke={colors.primary} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                            <Path d="M4.9 19a22 22 0 0 1 -.9 -7v-1a8 8 0 0 1 12 -6.95" stroke={colors.primary} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                        <Text style={[styles.bioBtnText, { color: colors.primary }]}>
                            {isAr ? `استخدم ${bioLabel}` : `Use ${bioLabel}`}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        </SafeAreaView>
    );
};

const PAD_SIZE = Math.min(SCREEN_WIDTH * 0.2, 72);

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'space-between' },
    topSection: { alignItems: 'center', paddingTop: 60 },
    lockCircle: {
        width: 72, height: 72, borderRadius: 36,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: Layout.spacing.lg,
    },
    title: { fontFamily: Fonts.bold, fontSize: 24, marginBottom: 6 },
    subtitle: { fontFamily: Fonts.regular, fontSize: 15, marginBottom: Layout.spacing.xl },
    dotsRow: { flexDirection: 'row', gap: 18 },
    dot: {
        width: 16, height: 16, borderRadius: 8,
        borderWidth: 2,
    },
    padContainer: { paddingHorizontal: Layout.spacing.xl, paddingBottom: Layout.spacing.xl },
    padGrid: {
        flexDirection: 'row', flexWrap: 'wrap',
        justifyContent: 'center',
    },
    padBtn: {
        width: PAD_SIZE, height: PAD_SIZE,
        alignItems: 'center', justifyContent: 'center',
        margin: 10,
    },
    padBtnCircle: {
        borderRadius: PAD_SIZE / 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    padDigit: { fontFamily: Fonts.bold, fontSize: 28 },
    bioBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: Layout.spacing.md, paddingVertical: Layout.spacing.sm },
    bioBtnText: { fontFamily: Fonts.semiBold, fontSize: 15 },
});

export default LockScreen;

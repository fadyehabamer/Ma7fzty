import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Animated, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { Layout, Fonts } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const slides = [
    { emoji: 'cash', title: 'Track Your Expenses', titleAr: 'تتبع مصروفاتك', desc: 'Keep a detailed record of every transaction to understand where your money goes.', descAr: 'سجل كل معاملاتك المالية لمعرفة أين تذهب أموالك.' },
    { emoji: 'bar-chart', title: 'Visualize & Analyze', titleAr: 'حلل وتابع', desc: 'Beautiful charts and insights to help you make smarter financial decisions.', descAr: 'رسومات بيانية وتحليلات لمساعدتك على اتخاذ قرارات مالية أذكى.' },
    { emoji: 'flag', title: 'Set Budgets & Goals', titleAr: 'حدد ميزانيتك', desc: 'Set monthly budgets and track your progress towards financial goals.', descAr: 'حدد ميزانيات شهرية وتابع تقدمك نحو أهدافك المالية.' },
];

const OnboardingScreen = ({ navigation }: any) => {
    const { dispatch } = useApp();
    const { colors } = useTheme();
    const { state } = useApp();
    const lang = state.settings.language || 'en';
    const isAr = lang === 'ar';

    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const scrollX = useRef(new Animated.Value(0)).current;

    const handleNext = () => {
        if (currentIndex < slides.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
        } else {
            dispatch({ type: 'SET_ONBOARDING_SEEN' });
        }
    };

    const handleSkip = () => {
        dispatch({ type: 'SET_ONBOARDING_SEEN' });
    };

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) setCurrentIndex(viewableItems[0].index || 0);
    }).current;

    const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.skipRow}>
                {currentIndex < slides.length - 1 ? (
                    <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
                        <Text style={[styles.skipText, { color: colors.textSecondary }]}>{isAr ? 'تخطي' : 'Skip'}</Text>
                    </TouchableOpacity>
                ) : <View />}
            </View>

            <FlatList
                ref={flatListRef}
                data={slides}
                keyExtractor={(_, i) => i.toString()}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                bounces={false}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                renderItem={({ item }) => (
                    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
                        <View style={[styles.emojiCircle, { backgroundColor: colors.primary + '12' }]}>
                            <Ionicons name={item.emoji as any} size={56} color={colors.primary} />
                        </View>
                        <Text style={[styles.slideTitle, { color: colors.text }]}>
                            {isAr ? item.titleAr : item.title}
                        </Text>
                        <Text style={[styles.slideDesc, { color: colors.textSecondary }]}>
                            {isAr ? item.descAr : item.desc}
                        </Text>
                    </View>
                )}
            />

            {/* Pagination */}
            <View style={styles.pagination}>
                {slides.map((_, i) => {
                    const inputRange = [(i - 1) * SCREEN_WIDTH, i * SCREEN_WIDTH, (i + 1) * SCREEN_WIDTH];
                    const dotWidth = scrollX.interpolate({ inputRange, outputRange: [8, 28, 8], extrapolate: 'clamp' });
                    const dotOpacity = scrollX.interpolate({ inputRange, outputRange: [0.3, 1, 0.3], extrapolate: 'clamp' });
                    return (
                        <Animated.View
                            key={i}
                            style={[styles.dot, { width: dotWidth, opacity: dotOpacity, backgroundColor: colors.primary }]}
                        />
                    );
                })}
            </View>

            {/* Action Button */}
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={handleNext} activeOpacity={0.85}>
                <Text style={styles.actionText}>
                    {currentIndex === slides.length - 1
                        ? (isAr ? 'ابدأ الآن' : 'Get Started')
                        : (isAr ? 'التالي' : 'Next')}
                </Text>
            </TouchableOpacity>

            <View style={{ height: Layout.spacing.xl }} />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    skipRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: Layout.spacing.lg, paddingTop: Layout.spacing.sm },
    skipBtn: { padding: Layout.spacing.sm },
    skipText: { fontFamily: Fonts.medium, fontSize: 16 },
    slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Layout.spacing.xl },
    emojiCircle: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', marginBottom: Layout.spacing.xl },
    slideEmoji: { fontSize: 56 },
    slideTitle: { fontFamily: Fonts.bold, fontSize: 28, textAlign: 'center', marginBottom: Layout.spacing.md },
    slideDesc: { fontFamily: Fonts.regular, fontSize: 17, textAlign: 'center', lineHeight: 26 },
    pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: Layout.spacing.xl, gap: 8 },
    dot: { height: 8, borderRadius: 4 },
    actionBtn: { marginHorizontal: Layout.spacing.xl, paddingVertical: 16, borderRadius: Layout.borderRadius.lg, alignItems: 'center' },
    actionText: { fontFamily: Fonts.bold, fontSize: 18, color: '#FFFFFF' },
});

export default OnboardingScreen;

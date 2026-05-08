import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Layout, Fonts } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import dayjs from 'dayjs';

interface Props {
    currentDate: Date;
    onPrev: () => void;
    onNext: () => void;
}

const MonthSelector: React.FC<Props> = ({ currentDate, onPrev, onNext }) => {
    const { colors } = useTheme();
    const isCurrentMonth =
        dayjs(currentDate).month() === dayjs().month() &&
        dayjs(currentDate).year() === dayjs().year();

    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={onPrev} style={[styles.arrow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.arrowText, { color: colors.text }]}>‹</Text>
            </TouchableOpacity>
            <View style={styles.labelWrap}>
                <Text style={[styles.month, { color: colors.text }]}>{dayjs(currentDate).format('MMMM')}</Text>
                <Text style={[styles.year, { color: colors.textSecondary }]}>{dayjs(currentDate).format('YYYY')}</Text>
            </View>
            <TouchableOpacity
                onPress={onNext}
                style={[styles.arrow, { backgroundColor: colors.card, borderColor: colors.border }, isCurrentMonth && styles.disabled]}
                disabled={isCurrentMonth}
            >
                <Text style={[styles.arrowText, { color: colors.text }, isCurrentMonth && { color: colors.textSecondary }]}>›</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Layout.spacing.lg, paddingVertical: Layout.spacing.xs },
    arrow: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    arrowText: {
        fontSize: 22,
        fontFamily: Fonts.medium,
        textAlign: 'center',
        includeFontPadding: false,
        lineHeight: 30, // Match container height minus borders/padding if needed
    },
    disabled: { opacity: 0.3 },
    labelWrap: { alignItems: 'center', justifyContent: 'center' },
    month: { fontSize: 17, fontFamily: Fonts.bold, lineHeight: 22 },
    year: { fontSize: 11, fontFamily: Fonts.regular, lineHeight: 14 },
});

export default MonthSelector;

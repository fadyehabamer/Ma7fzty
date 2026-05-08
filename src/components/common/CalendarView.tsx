import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import dayjs from 'dayjs';
import { Layout, Fonts } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { useApp } from '../../context/AppContext';
import { Transaction, Currency } from '../../types';

interface Props {
    currentDate: Date;
    transactions: Transaction[];
    currency: Currency;
    onSelectDate: (date: Date) => void;
    selectedDate: Date | null;
    lang?: string;
}

const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_AR = ['أحد', 'إثن', 'ثلا', 'أرب', 'خمس', 'جمع', 'سبت'];

const CalendarView: React.FC<Props> = ({ currentDate, transactions, currency, onSelectDate, selectedDate, lang = 'en' }) => {
    const { state } = useApp();
    const { colors } = useTheme();
    const fontScale = state.settings.fontScale || 1;
    const weekdays = lang === 'ar' ? WEEKDAYS_AR : WEEKDAYS_EN;

    const calendarData = useMemo(() => {
        const startOfMonth = dayjs(currentDate).startOf('month');
        const endOfMonth = dayjs(currentDate).endOf('month');
        const startDayOfWeek = startOfMonth.day();
        const daysInMonth = endOfMonth.date();

        const days: Array<{ date: number | null; fullDate: dayjs.Dayjs | null; income: number; expense: number }> = [];
        for (let i = 0; i < startDayOfWeek; i++) days.push({ date: null, fullDate: null, income: 0, expense: 0 });
        for (let d = 1; d <= daysInMonth; d++) {
            const dayDate = startOfMonth.date(d);
            const dayStart = dayDate.startOf('day').valueOf();
            const dayEnd = dayDate.endOf('day').valueOf();
            const dayTxs = transactions.filter((t) => t.date >= dayStart && t.date <= dayEnd);
            const income = dayTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
            const expense = dayTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
            days.push({ date: d, fullDate: dayDate, income, expense });
        }
        return days;
    }, [currentDate, transactions]);

    const today = dayjs();
    const isToday = (day: number) => dayjs(currentDate).month() === today.month() && dayjs(currentDate).year() === today.year() && day === today.date();
    const isSelected = (day: number) => selectedDate && dayjs(selectedDate).date() === day && dayjs(selectedDate).month() === dayjs(currentDate).month() && dayjs(selectedDate).year() === dayjs(currentDate).year();

    const weeks: typeof calendarData[] = [];
    for (let i = 0; i < calendarData.length; i += 7) weeks.push(calendarData.slice(i, i + 7));

    return (
        <View style={[styles.container, { backgroundColor: colors.card }]}>
            <View style={styles.weekdayRow}>
                {weekdays.map((day, idx) => (
                    <View key={idx} style={styles.weekdayCell}>
                        <Text style={[styles.weekdayText, { color: colors.textSecondary, fontSize: 11 * fontScale }]}>{day}</Text>
                    </View>
                ))}
            </View>
            {weeks.map((week, weekIdx) => (
                <View key={weekIdx} style={styles.weekRow}>
                    {week.map((day, dayIdx) => {
                        if (!day.date) return <View key={dayIdx} style={styles.dayCell} />;
                        const hasExpense = day.expense > 0;
                        const hasIncome = day.income > 0;
                        const isTodayDate = isToday(day.date);
                        const isSelectedDate = isSelected(day.date);
                        return (
                            <TouchableOpacity
                                key={dayIdx}
                                style={[styles.dayCell, isTodayDate && { backgroundColor: colors.primary + '10', borderWidth: 1, borderColor: colors.primary + '30' }, isSelectedDate && { backgroundColor: colors.primary }]}
                                onPress={() => { if (day.fullDate) onSelectDate(day.fullDate.toDate()); }}
                                activeOpacity={0.6}
                            >
                                <Text style={[styles.dayNumber, { color: colors.text, fontSize: 13 * fontScale }, isTodayDate && { color: colors.primary, fontFamily: Fonts.bold }, isSelectedDate && { color: '#FFFFFF', fontFamily: Fonts.bold }]}>{day.date}</Text>
                                <View style={styles.indicators}>
                                    {hasIncome && <View style={[styles.dot, { backgroundColor: colors.success }]} />}
                                    {hasExpense && <View style={[styles.dot, { backgroundColor: colors.danger }]} />}
                                </View>
                                {(hasIncome || hasExpense) && (
                                    <Text
                                        style={[styles.dayAmount, { color: hasExpense && !hasIncome ? colors.danger : hasIncome && !hasExpense ? colors.success : colors.primary, fontSize: 8 * fontScale }]}
                                        numberOfLines={1}
                                        adjustsFontSizeToFit
                                        minimumFontScale={0.7}
                                    >
                                        {(day.income - day.expense) < 0 ? '-' : ''}
                                        {Math.abs(day.income - day.expense) >= 1000000
                                            ? `${(Math.abs(day.income - day.expense) / 1000000).toFixed(1)}m`
                                            : Math.abs(day.income - day.expense) >= 1000
                                                ? `${(Math.abs(day.income - day.expense) / 1000).toFixed(1)}k`
                                                : Math.abs(day.income - day.expense).toFixed(0)}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                    {week.length < 7 && Array.from({ length: 7 - week.length }).map((_, idx) => <View key={`pad-${idx}`} style={styles.dayCell} />)}
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { borderRadius: Layout.borderRadius.md, padding: Layout.spacing.sm, marginHorizontal: Layout.spacing.md, marginBottom: Layout.spacing.md, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3 },
    weekdayRow: { flexDirection: 'row', marginBottom: 4 },
    weekdayCell: { flex: 1, alignItems: 'center', paddingVertical: 6 },
    weekdayText: { fontSize: 11, fontFamily: Fonts.semiBold, textTransform: 'uppercase' },
    weekRow: { flexDirection: 'row' },
    dayCell: { flex: 1, alignItems: 'center', paddingVertical: 6, minHeight: 52, borderRadius: 8, margin: 1 },
    dayNumber: { fontSize: 13, fontFamily: Fonts.semiBold },
    indicators: { flexDirection: 'row', gap: 2, marginTop: 2 },
    dot: { width: 4, height: 4, borderRadius: 2 },
    dayAmount: { fontSize: 8, fontFamily: Fonts.semiBold, marginTop: 1 },
});

export default CalendarView;

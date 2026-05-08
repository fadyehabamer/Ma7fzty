import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';
import { Fonts } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';
import { useApp } from '../context/AppContext';
import { t } from '../utils/i18n';
import { useNavigation } from '@react-navigation/native';

import HomeScreen from '../screens/HomeScreen';
import ChartsScreen from '../screens/ChartsScreen';
import CalendarScreen from '../screens/CalendarScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

const HomeIcon = ({ color, size }: { color: string; size: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M9 22V12H15V22" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

const ChartIcon = ({ color, size }: { color: string; size: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M18 20V10" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M12 20V4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M6 20V14" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

const CalendarIcon = ({ color, size }: { color: string; size: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect x="3" y="4" width="18" height="18" rx="2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M16 2v4M8 2v4M3 10h18" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

const SettingsIcon = ({ color, size }: { color: string; size: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={2} />
        <Path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

const PlusIcon = ({ size = 28 }: { size?: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Line x1="12" y1="5" x2="12" y2="19" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" />
        <Line x1="5" y1="12" x2="19" y2="12" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
);

/* ─── Custom Tab Bar ───────────────────────────────────── */
const CustomTabBar = ({ state, descriptors, navigation }: any) => {
    const { colors } = useTheme();
    const rootNavigation = useNavigation<any>();
    const { state: appState } = useApp();
    const lang = appState.settings.language || 'en';

    const leftTabs = state.routes.slice(0, 2);
    const rightTabs = state.routes.slice(2);

    const renderTab = (route: any) => {
        const routeIndex = state.routes.indexOf(route);
        const { options } = descriptors[route.key];
        const isFocused = state.index === routeIndex;
        const color = isFocused ? colors.primary : colors.textSecondary;

        const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
            }
        };

        const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
        };

        const label = typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : options.title ?? route.name;

        const icon = options.tabBarIcon?.({ color, size: 24, focused: isFocused });

        return (
            <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                onPress={onPress}
                onLongPress={onLongPress}
                style={styles.tab}
                activeOpacity={0.7}
            >
                {icon}
                <Text
                    style={[styles.tabLabel, { color }]}
                    numberOfLines={1}
                >
                    {label}
                </Text>
            </TouchableOpacity>
        );
    };

    const addLabel = lang === 'ar' ? 'إضافة' : 'Add';

    return (
        <View style={styles.outerWrapper} pointerEvents="box-none">
            {/* The raised center button — sits ABOVE the bar */}
            <View style={styles.centerButtonOuter} pointerEvents="box-none">
                <View style={[styles.centerButtonRing, { backgroundColor: colors.card }]}>
                    <TouchableOpacity
                        style={[styles.centerButton, { backgroundColor: colors.primary }]}
                        onPress={() => rootNavigation.navigate('AddTransaction')}
                        activeOpacity={0.8}
                    >
                        <PlusIcon size={30} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* The actual tab bar */}
            <View style={[styles.tabBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                {leftTabs.map((route: any) => renderTab(route))}

                {/* Spacer for center button */}
                <View style={styles.centerSpacer}>
                    <Text style={[styles.tabLabel, { color: colors.primary, marginTop: 2 }]} numberOfLines={1}>
                        {addLabel}
                    </Text>
                </View>

                {rightTabs.map((route: any) => renderTab(route))}
            </View>
        </View>
    );
};

/* ─── Styles ───────────────────────────────────────────── */
const CENTER_BUTTON_SIZE = 64;
const RING_SIZE = CENTER_BUTTON_SIZE + 16;
const TAB_BAR_HEIGHT = 72;
const BUTTON_OVERLAP = RING_SIZE / 2 - 4;

const styles = StyleSheet.create({
    outerWrapper: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: TAB_BAR_HEIGHT + BUTTON_OVERLAP,
        alignItems: 'center',
    },
    centerButtonOuter: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 10,
    },
    centerButtonRing: {
        width: RING_SIZE,
        height: RING_SIZE,
        borderRadius: RING_SIZE / 2,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
        elevation: 6,
    },
    centerButton: {
        width: CENTER_BUTTON_SIZE,
        height: CENTER_BUTTON_SIZE,
        borderRadius: CENTER_BUTTON_SIZE / 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: TAB_BAR_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        paddingBottom: Platform.OS === 'ios' ? 20 : 8,
        elevation: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 8,
    },
    tabLabel: {
        fontSize: 12,
        fontFamily: Fonts.semiBold,
        marginTop: 4,
    },
    centerSpacer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingBottom: 2,
    },
});

/* ─── Navigator ────────────────────────────────────────── */
const TabNavigator = () => {
    const { state } = useApp();
    const { colors } = useTheme();
    const lang = state.settings.language || 'en';

    return (
        <Tab.Navigator
            tabBar={(props) => <CustomTabBar {...props} />}
            screenOptions={{
                headerShown: false,
            }}
        >
            <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: lang === 'ar' ? 'الرئيسية' : 'Home', tabBarIcon: ({ color, size }) => <HomeIcon color={color} size={size} /> }} />
            <Tab.Screen name="Charts" component={ChartsScreen} options={{ tabBarLabel: t('analytics', lang), tabBarIcon: ({ color, size }) => <ChartIcon color={color} size={size} /> }} />
            <Tab.Screen name="Calendar" component={CalendarScreen} options={{ tabBarLabel: t('calendar', lang), tabBarIcon: ({ color, size }) => <CalendarIcon color={color} size={size} /> }} />
            <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: t('settings', lang), tabBarIcon: ({ color, size }) => <SettingsIcon color={color} size={size} /> }} />
        </Tab.Navigator>
    );
};

export default TabNavigator;

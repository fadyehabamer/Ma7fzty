import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useApp } from '../context/AppContext';
import { useTheme } from '../hooks/useTheme';
import { ActivityIndicator, View, AppState, AppStateStatus } from 'react-native';

import CurrencySelectScreen from '../screens/CurrencySelectScreen';
import LanguageSelectScreen from '../screens/LanguageSelectScreen';
import AllTransactionsScreen from '../screens/AllTransactionsScreen';
import TabNavigator from './TabNavigator';
import AddTransactionScreen from '../screens/AddTransactionScreen';
import CategoriesScreen from '../screens/CategoriesScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import LockScreen from '../screens/LockScreen';

const Stack = createStackNavigator();

const RootNavigator = () => {
    const { state, isLoading } = useApp();
    const { colors } = useTheme();
    const [isLocked, setIsLocked] = useState(true);
    const appState = useRef(AppState.currentState);

    // Re-lock when app goes to background
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
            if (
                appState.current === 'active' &&
                (nextState === 'background' || nextState === 'inactive') &&
                state.settings.passcode
            ) {
                setIsLocked(true);
            }
            appState.current = nextState;
        });
        return () => subscription.remove();
    }, [state.settings.passcode]);

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    // Show lock screen if passcode is set and app is locked
    if (state.settings.passcode && isLocked) {
        return <LockScreen onUnlock={() => setIsLocked(false)} />;
    }

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {state.settings.language === null ? (
                    <Stack.Screen name="LanguageSelect" component={LanguageSelectScreen} />
                ) : !state.settings.hasSeenOnboarding ? (
                    <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                ) : !state.settings.currency ? (
                    <Stack.Screen name="CurrencySelect" component={CurrencySelectScreen} />
                ) : (
                    <>
                        <Stack.Screen name="Main" component={TabNavigator} />
                        <Stack.Screen name="AddTransaction" component={AddTransactionScreen} options={{ presentation: 'modal', headerShown: false }} />
                        <Stack.Screen name="Categories" component={CategoriesScreen} />
                        <Stack.Screen name="AllTransactions" component={AllTransactionsScreen} />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default RootNavigator;

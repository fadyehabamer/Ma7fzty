import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import {
    Cairo_400Regular,
    Cairo_500Medium,
    Cairo_600SemiBold,
    Cairo_700Bold,
} from '@expo-google-fonts/cairo';
import * as Notifications from 'expo-notifications';
import { AppProvider } from './src/context/AppContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
    React.useEffect(() => {
        try {
            Notifications.setNotificationHandler({
                handleNotification: async () => ({
                    shouldShowAlert: true,
                    shouldPlaySound: true,
                    shouldSetBadge: false,
                    shouldShowBanner: true,
                    shouldShowList: true,
                }),
            });
        } catch (e) {
            console.error('Notification handler setup failed:', e);
        }
    }, []);

    const [fontsLoaded] = useFonts({
        Cairo_400Regular,
        Cairo_500Medium,
        Cairo_600SemiBold,
        Cairo_700Bold,
    });

    if (!fontsLoaded) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F6FA' }}>
                <ActivityIndicator size="large" color="#4F46E5" />
            </View>
        );
    }

    return (
        <SafeAreaProvider>
            <AppProvider>
                <RootNavigator />
                <StatusBar style="auto" />
            </AppProvider>
        </SafeAreaProvider>
    );
}

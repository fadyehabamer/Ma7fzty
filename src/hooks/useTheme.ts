import { useColorScheme } from 'react-native';
import { useApp } from '../context/AppContext';
import { generateTheme, ThemeColors, Fonts } from '../constants/theme';

export const useTheme = () => {
    const { state } = useApp();
    const systemScheme = useColorScheme();
    const { theme, primaryColor } = state.settings;

    const isDark =
        theme === 'dark' || (theme === 'system' && systemScheme === 'dark');

    const colors: ThemeColors = generateTheme(primaryColor || '#4F46E5', isDark);

    return {
        colors,
        isDark,
        primaryColor: primaryColor || '#4F46E5',
        fonts: Fonts,
    };
};

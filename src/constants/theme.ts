import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// ─── Color Utilities ────────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
        : [79, 70, 229]; // fallback indigo
}

function rgbToHex(r: number, g: number, b: number): string {
    return (
        '#' +
        [r, g, b]
            .map((x) =>
                Math.max(0, Math.min(255, Math.round(x)))
                    .toString(16)
                    .padStart(2, '0')
            )
            .join('')
    );
}

export function lighten(hex: string, amount: number): string {
    const [r, g, b] = hexToRgb(hex);
    return rgbToHex(
        r + (255 - r) * amount,
        g + (255 - g) * amount,
        b + (255 - b) * amount
    );
}

export function darken(hex: string, amount: number): string {
    const [r, g, b] = hexToRgb(hex);
    return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

// ─── Primary Color Presets ─────────────────────────────────────────
export const PRIMARY_COLORS = [
    { label: 'Indigo', value: '#4F46E5' },
    { label: 'Blue', value: '#3B82F6' },
    { label: 'Purple', value: '#7C3AED' },
    { label: 'Rose', value: '#E11D48' },
    { label: 'Emerald', value: '#059669' },
    { label: 'Teal', value: '#0D9488' },
    { label: 'Orange', value: '#EA580C' },
    { label: 'Slate', value: '#475569' },
];

// ─── Theme Color Generation ───────────────────────────────────────
export interface ThemeColors {
    primary: string;
    primaryLight: string;
    primaryDark: string;
    background: string;
    surface: string;       // slightly elevated bg
    card: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    danger: string;
    warning: string;
    info: string;
    shadow: string;
    isDark: boolean;
}

export function generateTheme(primaryColor: string, isDark: boolean): ThemeColors {
    if (isDark) {
        return {
            primary: lighten(primaryColor, 0.12),
            primaryLight: primaryColor + '1A', // 10% opacity
            primaryDark: darken(primaryColor, 0.25),
            background: '#0B0D14',
            surface: '#12151E',
            card: '#1A1E2C',
            text: '#F1F3F8',
            textSecondary: '#8B92A8',
            border: '#252A3A',
            success: '#34D399',
            danger: '#FB7185',
            warning: '#FBBF24',
            info: '#60A5FA',
            shadow: '#000000',
            isDark: true,
        };
    }
    return {
        primary: primaryColor,
        primaryLight: lighten(primaryColor, 0.92),
        primaryDark: darken(primaryColor, 0.15),
        background: '#F5F6FA',
        surface: '#FFFFFF',
        card: '#FFFFFF',
        text: '#1A1D26',
        textSecondary: '#6B7280',
        border: '#E5E7EB',
        success: '#10B981',
        danger: '#EF4444',
        warning: '#F59E0B',
        info: '#3B82F6',
        shadow: '#000000',
        isDark: false,
    };
}

// ─── Legacy Colors (used by old static refs, prefer useTheme) ─────
export const Colors = {
    light: {
        primary: '#4F46E5',
        background: '#F5F6FA',
        card: '#FFFFFF',
        text: '#1A1D26',
        textSecondary: '#6B7280',
        border: '#E5E7EB',
        success: '#10B981',
        danger: '#EF4444',
        warning: '#F59E0B',
        info: '#3B82F6',
    },
    dark: {
        primary: '#6366F1',
        background: '#0B0D14',
        card: '#1A1E2C',
        text: '#F1F3F8',
        textSecondary: '#8B92A8',
        border: '#252A3A',
        success: '#34D399',
        danger: '#FB7185',
        warning: '#FBBF24',
        info: '#60A5FA',
    },
};

// ─── Layout ────────────────────────────────────────────────────────
export const Layout = {
    window: { width, height },
    isSmallDevice: width < 375,
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        xxl: 40,
    },
    borderRadius: {
        sm: 8,
        md: 12,
        lg: 16,
        xl: 24,
    },
};

// ─── Typography ────────────────────────────────────────────────────
export const Typography = {
    sizes: {
        xs: 12,
        sm: 14,
        md: 16,
        lg: 18,
        xl: 20,
        xxl: 24,
        xxxl: 30,
    },
    weights: {
        regular: '400',
        medium: '500',
        bold: '700',
    } as const,
};

// ─── Font Families (Cairo) ─────────────────────────────────────────
export const Fonts = {
    regular: 'Cairo_400Regular',
    medium: 'Cairo_500Medium',
    semiBold: 'Cairo_600SemiBold',
    bold: 'Cairo_700Bold',
};

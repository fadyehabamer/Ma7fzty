import { formatCurrency, getFlexDirection, getTextAlign, isRTL, MASK, setPrivacyMode, t } from '../i18n';

const EGP = { code: 'EGP', symbol: 'ج.م' };

describe('t', () => {
    it('returns the Arabic string when available', () => {
        expect(t('income', 'ar')).toBe('الدخل');
    });

    it('falls back to English, then to the key itself', () => {
        expect(t('income', 'fr')).toBe('Income');
        expect(t('noSuchKey', 'ar')).toBe('noSuchKey');
    });
});

describe('RTL helpers', () => {
    it('flips layout for Arabic only', () => {
        expect(isRTL('ar')).toBe(true);
        expect(isRTL('en')).toBe(false);
        expect(getFlexDirection('ar')).toBe('row-reverse');
        expect(getFlexDirection('en')).toBe('row');
        expect(getTextAlign('ar')).toBe('right');
    });
});

describe('formatCurrency', () => {
    afterEach(() => setPrivacyMode(false));

    it('formats English amounts with the currency code after the number', () => {
        expect(formatCurrency(1234.5, EGP, 'en')).toBe('1,234.50 EGP');
        expect(formatCurrency(-60, EGP, 'en')).toBe('-60.00 EGP');
        expect(formatCurrency(60, EGP, 'en', false)).toBe('60.00');
    });

    it('formats Arabic amounts with the symbol first and a trailing minus', () => {
        expect(formatCurrency(-60, EGP, 'ar')).toBe('ج.م 60.00-');
        expect(formatCurrency(60, EGP, 'ar', false)).toBe('60.00');
    });

    it('falls back to a plain number when no currency is set', () => {
        expect(formatCurrency(12.5, null)).toBe('12.50');
    });

    it('masks every amount in privacy mode', () => {
        setPrivacyMode(true);
        expect(formatCurrency(1234.5, EGP, 'en')).toBe(`${MASK} EGP`);
        expect(formatCurrency(1234.5, EGP, 'ar')).toBe(`ج.م ${MASK}`);
        expect(formatCurrency(1234.5, null)).toBe(MASK);
    });
});

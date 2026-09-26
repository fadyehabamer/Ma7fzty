import { darken, lighten } from '../theme';
import { DEFAULT_ICON, resolveIcon } from '../icons';

describe('color helpers', () => {
    it('mixes towards white and black', () => {
        expect(lighten('#000000', 0.5)).toBe('#808080');
        expect(darken('#ffffff', 0.5)).toBe('#808080');
        expect(lighten('#3B82F6', 1)).toBe('#ffffff');
        expect(darken('#3B82F6', 1)).toBe('#000000');
    });

    it('returns a normalized hex for a zero amount', () => {
        expect(lighten('#3B82F6', 0)).toBe('#3b82f6');
        expect(darken('3B82F6', 0)).toBe('#3b82f6');
    });

    it('falls back to indigo for invalid colors', () => {
        expect(darken('not-a-color', 0)).toBe('#4f46e5');
    });
});

describe('resolveIcon', () => {
    it('keeps valid Ionicons names', () => {
        expect(resolveIcon('car')).toBe('car');
    });

    it('maps legacy emoji, with or without a variation selector', () => {
        expect(resolveIcon('🍔')).toBe('fast-food');
        expect(resolveIcon('✈️')).toBe('airplane');
        expect(resolveIcon('☕️')).toBe('cafe');
    });

    it('falls back to the default icon', () => {
        expect(resolveIcon(undefined)).toBe(DEFAULT_ICON);
        expect(resolveIcon('unknown-icon')).toBe(DEFAULT_ICON);
    });
});

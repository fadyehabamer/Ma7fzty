import { buildShareText, getQRValue, methodPreview, methodTitle } from '../paymentShare';
import { PaymentMethod } from '../../types';

const wallet: PaymentMethod = {
    id: 'w1',
    type: 'wallet',
    fields: { provider: 'vodafone', phone: ' 01001234567 ' },
    createdAt: 0,
};

describe('payment sharing helpers', () => {
    it('uses the nickname as the title, falling back to the localized type name', () => {
        expect(methodTitle(wallet, 'en')).toBe('Mobile Wallet');
        expect(methodTitle(wallet, 'ar')).toBe('محفظة موبايل');
        expect(methodTitle({ ...wallet, label: '  My Cash  ' }, 'en')).toBe('My Cash');
    });

    it('encodes the trimmed primary field in the QR code', () => {
        expect(getQRValue(wallet)).toBe('01001234567');
        expect(getQRValue({ ...wallet, fields: {} })).toBe('');
    });

    it('previews the primary value, then the first filled field as a localized option', () => {
        expect(methodPreview(wallet, 'en')).toBe('01001234567');
        const noPhone = { ...wallet, fields: { provider: 'vodafone' } };
        expect(methodPreview(noPhone, 'en')).toBe('Vodafone Cash');
        expect(methodPreview(noPhone, 'ar')).toBe('فودافون كاش');
        expect(methodPreview({ ...wallet, fields: {} }, 'en')).toBe('Mobile Wallet');
    });

    it('builds share text with a header and one block per method', () => {
        const paypal: PaymentMethod = { id: 'p1', type: 'paypal', fields: { value: 'me@example.com' }, createdAt: 0 };
        expect(buildShareText([wallet, paypal], ' Fady ', 'en')).toBe(
            [
                'Fady — Payment Info',
                '',
                'Mobile Wallet',
                '   Provider: Vodafone Cash',
                '   Phone number: 01001234567',
                'PayPal',
                '   PayPal email or link: me@example.com',
            ].join('\n')
        );
        expect(buildShareText([], undefined, 'ar')).toBe('معلومات الدفع\n');
    });
});

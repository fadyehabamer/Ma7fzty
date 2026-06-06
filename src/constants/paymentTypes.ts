import { PaymentMethodType } from '../types';

export interface PaymentFieldOption {
    value: string;
    en: string;
    ar: string;
}

export interface PaymentField {
    key: string;
    en: string;
    ar: string;
    placeholder?: string;
    keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
    optional?: boolean;
    options?: PaymentFieldOption[]; // When present, render as a chip selector
}

export interface PaymentTypeDef {
    key: PaymentMethodType;
    emoji: string;
    en: string;
    ar: string;
    color: string; // accent color for the icon badge
    primaryField: string; // field used as the QR / primary share value
    fields: PaymentField[];
}

export const PAYMENT_TYPES: PaymentTypeDef[] = [
    {
        key: 'instapay',
        emoji: '⚡',
        en: 'InstaPay',
        ar: 'إنستا باي',
        color: '#6C2BD9',
        primaryField: 'address',
        fields: [
            { key: 'address', en: 'InstaPay address (IPA)', ar: 'عنوان إنستا باي', placeholder: 'name@instapay' },
        ],
    },
    {
        key: 'wallet',
        emoji: '📱',
        en: 'Mobile Wallet',
        ar: 'محفظة موبايل',
        color: '#E11D48',
        primaryField: 'phone',
        fields: [
            {
                key: 'provider',
                en: 'Provider',
                ar: 'المحفظة',
                options: [
                    { value: 'vodafone', en: 'Vodafone Cash', ar: 'فودافون كاش' },
                    { value: 'orange', en: 'Orange Cash', ar: 'أورنج كاش' },
                    { value: 'etisalat', en: 'e& Cash', ar: 'اتصالات كاش' },
                    { value: 'we', en: 'WE Pay', ar: 'وي باي' },
                    { value: 'other', en: 'Other', ar: 'أخرى' },
                ],
            },
            { key: 'phone', en: 'Phone number', ar: 'رقم الهاتف', placeholder: '0100 000 0000', keyboardType: 'phone-pad' },
        ],
    },
    {
        key: 'paypal',
        emoji: '🅿️',
        en: 'PayPal',
        ar: 'باي بال',
        color: '#0070BA',
        primaryField: 'value',
        fields: [
            { key: 'value', en: 'PayPal email or link', ar: 'بريد أو رابط باي بال', placeholder: 'you@email.com', keyboardType: 'email-address' },
        ],
    },
    {
        key: 'iban',
        emoji: '🏦',
        en: 'IBAN',
        ar: 'آيبان',
        color: '#1E40AF',
        primaryField: 'iban',
        fields: [
            { key: 'iban', en: 'IBAN', ar: 'الآيبان', placeholder: 'EG00 0000 0000 ...' },
            { key: 'bank', en: 'Bank name', ar: 'اسم البنك' },
            { key: 'holder', en: 'Account holder', ar: 'اسم صاحب الحساب', optional: true },
            { key: 'swift', en: 'SWIFT / BIC', ar: 'سويفت', optional: true },
        ],
    },
    {
        key: 'bank',
        emoji: '💳',
        en: 'Bank Account',
        ar: 'حساب بنكي',
        color: '#0F766E',
        primaryField: 'account',
        fields: [
            { key: 'bank', en: 'Bank name', ar: 'اسم البنك' },
            { key: 'account', en: 'Account number', ar: 'رقم الحساب', keyboardType: 'numeric' },
            { key: 'holder', en: 'Account holder', ar: 'اسم صاحب الحساب', optional: true },
        ],
    },
    {
        key: 'crypto',
        emoji: '₿',
        en: 'Crypto',
        ar: 'عملة رقمية',
        color: '#F7931A',
        primaryField: 'address',
        fields: [
            { key: 'network', en: 'Network / Coin', ar: 'الشبكة / العملة', placeholder: 'BTC, USDT (TRC20)...' },
            { key: 'address', en: 'Wallet address', ar: 'عنوان المحفظة' },
        ],
    },
    {
        key: 'other',
        emoji: '🔗',
        en: 'Other',
        ar: 'أخرى',
        color: '#64748B',
        primaryField: 'value',
        fields: [
            { key: 'label', en: 'Label', ar: 'الاسم' },
            { key: 'value', en: 'Value / link', ar: 'القيمة / الرابط' },
        ],
    },
];

export const getPaymentType = (key: PaymentMethodType): PaymentTypeDef =>
    PAYMENT_TYPES.find((p) => p.key === key) || PAYMENT_TYPES[PAYMENT_TYPES.length - 1];

// Localized name for a type
export const typeLabel = (def: PaymentTypeDef, lang: string): string => (lang === 'ar' ? def.ar : def.en);

// Localized label for a field
export const fieldLabel = (field: PaymentField, lang: string): string => (lang === 'ar' ? field.ar : field.en);

// Map a stored option value (e.g. 'vodafone') back to its localized display label
export const optionLabel = (field: PaymentField, value: string, lang: string): string => {
    const opt = field.options?.find((o) => o.value === value);
    if (!opt) return value;
    return lang === 'ar' ? opt.ar : opt.en;
};

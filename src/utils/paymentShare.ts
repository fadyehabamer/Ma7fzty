import { PaymentMethod } from '../types';
import { getPaymentType, typeLabel, fieldLabel, optionLabel } from '../constants/paymentTypes';

// A short title for a method: custom nickname if set, otherwise the type name.
export const methodTitle = (method: PaymentMethod, lang: string): string => {
    const def = getPaymentType(method.type);
    return method.label?.trim() || typeLabel(def, lang);
};

// The single value used for the QR code (and copy) — the type's primary field.
export const getQRValue = (method: PaymentMethod): string => {
    const def = getPaymentType(method.type);
    return (method.fields[def.primaryField] || '').trim();
};

// A one-line preview of the method's primary value (for list rows).
export const methodPreview = (method: PaymentMethod, lang: string): string => {
    const def = getPaymentType(method.type);
    const primary = (method.fields[def.primaryField] || '').trim();
    if (primary) return primary;
    // Fall back to the first non-empty field
    for (const f of def.fields) {
        const v = (method.fields[f.key] || '').trim();
        if (v) return optionLabel(f, v, lang);
    }
    return typeLabel(def, lang);
};

// Format a single method's full details as text lines.
export const buildMethodLines = (method: PaymentMethod, lang: string): string => {
    const def = getPaymentType(method.type);
    const lines: string[] = [methodTitle(method, lang)];
    def.fields.forEach((f) => {
        const raw = (method.fields[f.key] || '').trim();
        if (!raw) return;
        const display = optionLabel(f, raw, lang);
        lines.push(`   ${fieldLabel(f, lang)}: ${display}`);
    });
    return lines.join('\n');
};

// Build the full shareable text for one or more methods.
export const buildShareText = (
    methods: PaymentMethod[],
    profileName: string | undefined,
    lang: string
): string => {
    const heading = lang === 'ar' ? 'معلومات الدفع' : 'Payment Info';
    const name = profileName?.trim();
    const header = name ? `${name} — ${heading}` : heading;
    return [header, '', ...methods.map((m) => buildMethodLines(m, lang))].join('\n');
};

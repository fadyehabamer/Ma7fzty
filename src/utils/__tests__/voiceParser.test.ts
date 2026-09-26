import { parseVoiceTransaction } from '../voiceParser';
import { initialState } from '../../context/AppContext';
import { Category } from '../../types';

const defaults = initialState.categories;
const byName = (name: string) => defaults.find((c) => c.name === name)!;

describe('parseVoiceTransaction', () => {
    it('parses Arabic-Indic digits and falls back to the parent category', () => {
        const r = parseVoiceTransaction('صرفت ٢٥٠ كهرباء', defaults);
        expect(r.amount).toBe(250);
        expect(r.type).toBe('expense');
        expect(r.categoryId).toBe(byName('Utilities').id);
        expect(r.matchedTerm).toBe('كهرباء');
        expect(r.usedFallback).toBe(true);
    });

    it('understands the same sentence in English', () => {
        const r = parseVoiceTransaction('I spent 250 on electricity', defaults);
        expect(r.amount).toBe(250);
        expect(r.type).toBe('expense');
        expect(r.categoryName).toBe('Utilities');
        expect(r.usedFallback).toBe(true);
    });

    it('detects income from the category keyword alone', () => {
        const r = parseVoiceTransaction('راتب 5000', defaults);
        expect(r.amount).toBe(5000);
        expect(r.type).toBe('income');
        expect(r.categoryId).toBe(byName('Salary').id);
        expect(r.usedFallback).toBe(false);
    });

    it('adds up spoken Egyptian number words when there are no digits', () => {
        const r = parseVoiceTransaction('مية وخمسين أكل', defaults);
        expect(r.amount).toBe(150);
        expect(r.categoryId).toBe(byName('Food').id);
    });

    it('strips thousands separators and keeps decimals', () => {
        const r = parseVoiceTransaction('Paid 1,250.50 for groceries', defaults);
        expect(r.amount).toBe(1250.5);
        expect(r.categoryName).toBe('Food');
        expect(r.usedFallback).toBe(true);
    });

    it('prefers a user category named after the spoken term over the parent', () => {
        const custom: Category = { id: 'elec', name: 'كهرباء', emoji: 'flash', type: 'expense' };
        const r = parseVoiceTransaction('دفعت 300 كهرباء', [...defaults, custom]);
        expect(r.categoryId).toBe('elec');
        expect(r.usedFallback).toBe(false);
    });

    it('does not file income under an expense category', () => {
        const r = parseVoiceTransaction('received 300 for pizza', defaults);
        expect(r.type).toBe('income');
        expect(r.categoryId).toBeNull();
        expect(r.matchedTerm).toBeNull();
    });

    it('keeps the transcript as the note and never throws on empty input', () => {
        expect(parseVoiceTransaction('  taxi 40  ', defaults).note).toBe('taxi 40');
        const empty = parseVoiceTransaction('', defaults);
        expect(empty).toMatchObject({ amount: null, type: 'expense', categoryId: null, note: '' });
    });
});


import { Category, TransactionType } from '../types';

/**
 * Lightweight, dependency-free NLU that turns a spoken sentence (Arabic — esp.
 * Egyptian colloquial — or English) into a draft transaction.
 *
 *   "صرفت ٢٥٠ كهرباء"      -> { amount: 250, type: 'expense', category: Utilities }
 *   "I spent 250 on electricity" -> same
 *   "راتب 5000"            -> { amount: 5000, type: 'income',  category: Salary }
 *
 * It never throws and never guesses silently: the screen always shows the
 * parsed result for the user to confirm/correct before saving.
 */

export interface ParsedVoiceResult {
    rawText: string;
    amount: number | null;
    type: TransactionType;
    categoryId: string | null;
    categoryName: string | null; // resolved (existing) category display name
    matchedTerm: string | null;  // the spoken keyword we recognised, e.g. "كهرباء"
    usedFallback: boolean;       // true when we resolved to a parent (e.g. Electricity -> Utilities)
    note: string;
}

// ─── Text normalisation ──────────────────────────────────────────────
const normalizeDigits = (s: string): string =>
    s
        .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)) // Arabic-Indic ٠-٩
        .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0)); // Persian ۰-۹

// Unify Arabic letter variants + strip tashkeel so keyword matching is robust.
const normalizeArabic = (s: string): string =>
    s
        .replace(/[ً-ْٰ]/g, '') // tashkeel / dagger alef
        .replace(/ـ/g, '') // tatweel ـ
        .replace(/[أإآ]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/ئ/g, 'ي')
        .replace(/ؤ/g, 'و')
        .replace(/ة/g, 'ه');

const norm = (s: string): string =>
    normalizeArabic(normalizeDigits(s.toLowerCase())).replace(/\s+/g, ' ').trim();

// ─── Spoken-number fallback (used only when no digits are present) ────
// Egyptian/MSA round numbers — additive composition ("مية وخمسين" -> 150).
const NUMBER_WORDS: Record<string, number> = {
    'صفر': 0, 'zero': 0,
    'واحد': 1, 'واحده': 1, 'one': 1,
    'اثنين': 2, 'اتنين': 2, 'اثنان': 2, 'two': 2,
    'ثلاثه': 3, 'تلاته': 3, 'three': 3,
    'اربعه': 4, 'four': 4,
    'خمسه': 5, 'five': 5,
    'سته': 6, 'six': 6,
    'سبعه': 7, 'seven': 7,
    'ثمانيه': 8, 'تمانيه': 8, 'eight': 8,
    'تسعه': 9, 'nine': 9,
    'عشره': 10, 'ten': 10,
    'عشرين': 20, 'twenty': 20,
    'ثلاثين': 30, 'تلاتين': 30, 'thirty': 30,
    'اربعين': 40, 'forty': 40,
    'خمسين': 50, 'fifty': 50,
    'ستين': 60, 'sixty': 60,
    'سبعين': 70, 'seventy': 70,
    'ثمانين': 80, 'تمانين': 80, 'eighty': 80,
    'تسعين': 90, 'ninety': 90,
    'ميه': 100, 'مايه': 100, 'مئه': 100, 'hundred': 100,
    'ميتين': 200,
    'تلتميه': 300, 'ثلاثميه': 300,
    'ربعميه': 400, 'اربعميه': 400,
    'خمسميه': 500,
    'ستميه': 600,
    'سبعميه': 700,
    'تمنميه': 800,
    'تسعميه': 900,
    'الف': 1000, 'thousand': 1000,
    'الفين': 2000,
};

const extractAmount = (rawText: string): number | null => {
    const digits = normalizeDigits(rawText).replace(/(\d),(?=\d{3}\b)/g, '$1'); // drop thousands commas
    const m = digits.match(/\d+(?:[.,]\d+)?/);
    if (m) {
        const n = parseFloat(m[0].replace(',', '.'));
        return isNaN(n) ? null : n;
    }
    // No digits — try additive composition of spoken number words.
    const tokens = norm(rawText).split(' ').map((t) => t.replace(/^و/, '')); // strip leading "و" (and)
    let sum = 0;
    let found = false;
    for (const tok of tokens) {
        if (tok in NUMBER_WORDS) {
            sum += NUMBER_WORDS[tok];
            found = true;
        }
    }
    return found && sum > 0 ? sum : null;
};

// ─── Verb / intent cues ──────────────────────────────────────────────
const EXPENSE_VERBS = ['صرفت', 'صرف', 'دفعت', 'دفع', 'اشتريت', 'شريت', 'خسرت', 'spent', 'spend', 'paid', 'pay', 'bought', 'buy'].map(norm);
const INCOME_VERBS = ['قبضت', 'استلمت', 'كسبت', 'ربحت', 'جالي', 'وصلني', 'received', 'receive', 'earned', 'earn', 'income'].map(norm);

// ─── Category concepts ───────────────────────────────────────────────
// Each concept maps spoken keywords to a `canonical` category (the ideal,
// specific one — e.g. "Electricity") and a `parent` default category that is
// guaranteed to exist out of the box (e.g. "Utilities"). When the user has no
// category matching the canonical, we file the transaction under the parent and
// flag `usedFallback` so the UI can explain "Electricity → added under Utilities".
// When canonical === parent the spoken term *is* the category, so no hint shows.
interface Concept {
    type: TransactionType;
    canonical: string;
    parent: string;
    keywords: string[];
}

const CONCEPTS: Concept[] = [
    // ── Expense: Utilities & its sub-bills ──
    { type: 'expense', canonical: 'Electricity', parent: 'Utilities', keywords: ['كهرباء', 'كهربا', 'electricity'] },
    { type: 'expense', canonical: 'Water', parent: 'Utilities', keywords: ['مياه', 'المياه', 'water'] },
    { type: 'expense', canonical: 'Gas', parent: 'Utilities', keywords: ['غاز', 'بوتاجاز', 'gas'] },
    { type: 'expense', canonical: 'Internet', parent: 'Utilities', keywords: ['انترنت', 'internet', 'wifi', 'واي فاي', 'راوتر'] },
    { type: 'expense', canonical: 'Phone', parent: 'Utilities', keywords: ['تليفون', 'موبايل', 'phone', 'mobile'] },
    { type: 'expense', canonical: 'Bills', parent: 'Utilities', keywords: ['فاتوره', 'فواتير', 'bill', 'bills'] },
    { type: 'expense', canonical: 'Utilities', parent: 'Utilities', keywords: ['utilities', 'مرافق'] },
    // ── Expense: Food ──
    { type: 'expense', canonical: 'Food', parent: 'Food', keywords: ['اكل', 'طعام', 'food', 'وجبه', 'meal', 'فطار', 'غداء', 'عشاء', 'breakfast', 'lunch', 'dinner', 'بيتزا', 'pizza', 'برجر', 'burger'] },
    { type: 'expense', canonical: 'Restaurant', parent: 'Food', keywords: ['مطعم', 'restaurant'] },
    { type: 'expense', canonical: 'Coffee', parent: 'Food', keywords: ['قهوه', 'كافيه', 'coffee', 'cafe', 'كوفي'] },
    { type: 'expense', canonical: 'Groceries', parent: 'Food', keywords: ['بقاله', 'سوبر ماركت', 'سوبرماركت', 'supermarket', 'groceries'] },
    // ── Expense: Transport ──
    { type: 'expense', canonical: 'Transport', parent: 'Transport', keywords: ['مواصلات', 'transport', 'مترو', 'metro', 'اتوبيس', 'باص', 'bus', 'قطار', 'train'] },
    { type: 'expense', canonical: 'Taxi', parent: 'Transport', keywords: ['تاكسي', 'taxi', 'اوبر', 'uber', 'كريم', 'careem', 'انديرايف', 'indrive'] },
    { type: 'expense', canonical: 'Fuel', parent: 'Transport', keywords: ['بنزين', 'سولار', 'وقود', 'بترول', 'petrol', 'fuel', 'gasoline'] },
    // ── Expense: Rent ──
    { type: 'expense', canonical: 'Rent', parent: 'Rent', keywords: ['ايجار', 'rent'] },
    // ── Expense: Shopping ──
    { type: 'expense', canonical: 'Shopping', parent: 'Shopping', keywords: ['تسوق', 'shopping', 'mall'] },
    { type: 'expense', canonical: 'Clothes', parent: 'Shopping', keywords: ['ملابس', 'هدوم', 'clothes', 'clothing', 'حذاء', 'جزمه', 'shoes'] },
    // ── Expense: Entertainment ──
    { type: 'expense', canonical: 'Entertainment', parent: 'Entertainment', keywords: ['ترفيه', 'entertainment', 'حفله', 'party', 'concert', 'نتفليكس', 'netflix'] },
    { type: 'expense', canonical: 'Cinema', parent: 'Entertainment', keywords: ['سينما', 'cinema', 'فيلم', 'movie', 'افلام'] },
    { type: 'expense', canonical: 'Games', parent: 'Entertainment', keywords: ['لعبه', 'العاب', 'game', 'games', 'بلايستيشن', 'playstation'] },
    // ── Expense: Health ──
    { type: 'expense', canonical: 'Health', parent: 'Health', keywords: ['صحه', 'health', 'علاج', 'تحاليل'] },
    { type: 'expense', canonical: 'Doctor', parent: 'Health', keywords: ['دكتور', 'طبيب', 'doctor', 'عياده', 'clinic'] },
    { type: 'expense', canonical: 'Pharmacy', parent: 'Health', keywords: ['دواء', 'ادويه', 'medicine', 'صيدليه', 'pharmacy'] },
    { type: 'expense', canonical: 'Hospital', parent: 'Health', keywords: ['مستشفى', 'hospital'] },
    { type: 'expense', canonical: 'Gym', parent: 'Health', keywords: ['جيم', 'gym', 'fitness'] },
    // ── Income ──
    { type: 'income', canonical: 'Salary', parent: 'Salary', keywords: ['راتب', 'مرتب', 'salary', 'معاش', 'wage'] },
    { type: 'income', canonical: 'Freelance', parent: 'Freelance', keywords: ['فريلانس', 'freelance', 'شغل حر', 'مشروع', 'project', 'عموله', 'commission'] },
    { type: 'income', canonical: 'Gift', parent: 'Gift', keywords: ['هديه', 'gift', 'عيديه', 'present', 'مكافأه', 'مكافاه', 'bonus', 'اكراميه', 'tip'] },
];

// Pre-normalise once.
const NORM_CONCEPTS = CONCEPTS.map((c) => ({
    ...c,
    canonicalN: norm(c.canonical),
    parentN: norm(c.parent),
    keywords: c.keywords.map(norm),
}));
type NormConcept = (typeof NORM_CONCEPTS)[number];

const findBestConcept = (nText: string): { concept: NormConcept; term: string } | null => {
    let best: { concept: NormConcept; term: string } | null = null;
    for (const concept of NORM_CONCEPTS) {
        for (const kw of concept.keywords) {
            if (kw && nText.includes(kw)) {
                if (!best || kw.length > best.term.length) best = { concept, term: kw };
            }
        }
    }
    return best;
};

/**
 * Parse a transcript into a draft transaction against the user's current
 * category list. Pure and side-effect free.
 */
export const parseVoiceTransaction = (
    rawText: string,
    categories: Category[]
): ParsedVoiceResult => {
    const text = (rawText || '').trim();
    const nText = norm(text);

    const amount = extractAmount(text);

    const hasExpenseVerb = EXPENSE_VERBS.some((v) => nText.includes(v));
    const hasIncomeVerb = INCOME_VERBS.some((v) => nText.includes(v));
    const match = findBestConcept(nText);

    // Decide type: an explicit verb wins, otherwise the matched concept's type.
    let type: TransactionType;
    if (hasExpenseVerb && !hasIncomeVerb) type = 'expense';
    else if (hasIncomeVerb && !hasExpenseVerb) type = 'income';
    else type = match ? match.concept.type : 'expense';

    let categoryId: string | null = null;
    let categoryName: string | null = null;
    let matchedTerm: string | null = null;
    let usedFallback = false;

    // Only resolve a category when the matched concept agrees with the final type.
    if (match && match.concept.type === type) {
        const { concept } = match;
        matchedTerm = match.term;
        // 1) A user category that IS this concept — by canonical English name…
        let cat = categories.find((c) => c.type === type && norm(c.name) === concept.canonicalN);
        // …or named like one of the concept's keywords (e.g. an Arabic-named category).
        if (!cat) cat = categories.find((c) => c.type === type && norm(c.name) !== concept.parentN && concept.keywords.includes(norm(c.name)));
        if (cat) {
            categoryId = cat.id;
            categoryName = cat.name;
        } else {
            // 2) Fall back to the parent default category (e.g. Electricity → Utilities).
            const parent = categories.find((c) => c.type === type && norm(c.name) === concept.parentN);
            if (parent) {
                categoryId = parent.id;
                categoryName = parent.name;
                usedFallback = concept.canonicalN !== concept.parentN;
            }
        }
    }

    return {
        rawText: text,
        amount,
        type,
        categoryId,
        categoryName,
        matchedTerm,
        usedFallback,
        note: text,
    };
};

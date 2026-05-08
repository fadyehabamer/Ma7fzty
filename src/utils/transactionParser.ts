import { Category, TransactionType } from '../types';

const convertArabicNumerals = (str: string): string => {
    const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return str.replace(/[٠-٩]/g, (char) => {
        return arabicNumbers.indexOf(char).toString();
    });
};

export const parseTransactionNote = (
    note: string,
    categories: Category[]
): {
    amount: string;
    type: TransactionType;
    categoryId: string | null;
    note: string;
} => {
    // 1. Extract Amount
    const amountMatch = note.match(/[\d٠-٩]+(\.[\d٠-٩]+)?/);
    let amount = '';
    if (amountMatch) {
         amount = convertArabicNumerals(amountMatch[0]);
    }

    // 2. Determine Type (Expense vs Income)
    const isExpenseKw = /spent|bought|paid|صرفت|دفعت|اشتريت|صرف|دفعت/i.test(note);
    const isIncomeKw = /earned|received|got|قبضت|استلمت|جالي|جاني|دخل|راتب/i.test(note);
    
    // Default to 'expense'
    const type: TransactionType = isIncomeKw && !isExpenseKw ? 'income' : 'expense';

    // 3. Find Category
    const availableCats = categories.filter((c) => c.type === type);
    let categoryId: string | null = null;
    
    const lowerNote = note.toLowerCase();
    for (const cat of availableCats) {
        if (lowerNote.includes(cat.name.toLowerCase())) {
            categoryId = cat.id;
            break;
        }
    }
    
    // Heuristics for common Arabic/English keywords mapping to generic names
    if (!categoryId) {
        const checkMap: Record<string, string[]> = {
            'Food & Drinks': ['coffee', 'food', 'lunch', 'dinner', 'breakfast', 'قهوة', 'اكل', 'غداء', 'عشاء', 'فطار', 'طعام'],
            'Transportation': ['taxi', 'uber', 'gas', 'transport', 'bus', 'تاكسي', 'اوبر', 'بنزين', 'مواصلات', 'سيارة'],
            'Salary': ['salary', 'paycheck', 'راتب', 'مرتب', 'معاش'],
            'Shopping': ['clothes', 'shopping', 'تسوق', 'ملابس', 'شراء'],
            'Housing': ['rent', 'house', 'ايجار', 'سكن', 'بيت'],
            'Entertainment': ['movie', 'game', 'fun', 'سينما', 'لعب', 'ترفيه'],
            'Health': ['doctor', 'pharmacy', 'medicine', 'دكتور', 'صيدلية', 'دواء', 'علاج']
        };
        
        for (const [catName, keywords] of Object.entries(checkMap)) {
            if (keywords.some(kw => lowerNote.includes(kw))) {
                 // find category by mapping name
                 const matched = availableCats.find(c => c.name.toLowerCase().includes(catName.toLowerCase()));
                 if (matched) {
                     categoryId = matched.id;
                     break;
                 }
            }
        }
    }

    // If still no category ID is found, select the "Other" if exists, or just the first one
    if (!categoryId && availableCats.length > 0) {
        const otherCat = availableCats.find(c => c.name.toLowerCase().includes('other') || c.name.includes('أخرى') || c.name.includes('اخرى'));
        categoryId = otherCat ? otherCat.id : availableCats[0].id;
    }

    return {
        amount,
        type,
        categoryId,
        note
    };
};

import { I18nManager } from 'react-native';

// RTL language support
const translations: Record<string, Record<string, string>> = {
    en: {
        goodMorning: 'Good Morning',
        goodAfternoon: 'Good Afternoon',
        goodEvening: 'Good Evening',
        myWallet: 'Ma7fzty',
        totalBalance: 'TOTAL BALANCE',
        income: 'Income',
        expenses: 'Expenses',
        transactions: 'Transactions',
        noTransactions: 'No transactions yet',
        tapToAdd: 'Tap + to add your first expense or income',
        searchTransactions: 'Search transactions...',
        monthlyBudget: 'Monthly Budget',
        addTransaction: 'Add Transaction',
        amount: 'Amount',
        category: 'Category',
        note: 'Note',
        date: 'Date',
        expense: 'Expense',
        addExpense: 'Add Expense',
        addIncome: 'Add Income',
        whatsThisFor: "What's this for?",
        cancel: 'Cancel',
        save: 'Save',
        settings: 'Settings',
        currency: 'Currency',
        manageCategories: 'Manage Categories',
        categories: 'Categories',
        lifetimeStats: 'LIFETIME STATS',
        totalIncome: 'Total Income',
        totalExpenses: 'Total Expenses',
        netBalance: 'Net Balance',
        data: 'DATA',
        resetAllData: 'Reset All Data',
        deleteAllTransactions: 'Delete all transactions and settings',
        analytics: 'Analytics',
        general: 'GENERAL',
        notSet: 'Not set',
        items: 'items',
        item: 'item',
        calendar: 'Calendar',
        exportData: 'Export Data',
        exportPdf: 'Export as PDF',
        exportCsv: 'Export as CSV',
        noCategory: 'No Category',
        pleaseSelectCategory: 'Please select a category',
        invalidAmount: 'Invalid Amount',
        enterValidNumber: 'Please enter a valid positive number',
        delete: 'Delete',
        deleteTransaction: 'Delete Transaction',
        deleteConfirm: 'Are you sure you want to delete this transaction?',
        language: 'Language',
        english: 'English',
        arabic: 'عربي',
        all: 'All',
        total: 'Total',
        thisMonth: 'This Month',
        allTime: 'All Time',
        default: 'Default',
        newCategory: 'New Category',
        categoryName: 'Category name',
        addCategory: 'Add Category',
        balance: 'Balance',
        addMoney: 'Add Money',
        sendMoney: 'Send Money',
        deposit: 'Deposit',
        withdraw: 'Withdraw',
        seeAll: 'See all',
        history: 'Transaction History',
    },
    ar: {
        goodMorning: 'صباح الخير',
        goodAfternoon: 'مساء الخير',
        goodEvening: 'مساء الخير',
        myWallet: 'محفظتي',
        totalBalance: 'الرصيد الإجمالي',
        income: 'الدخل',
        expenses: 'المصروفات',
        transactions: 'المعاملات',
        noTransactions: 'لا توجد معاملات بعد',
        tapToAdd: 'اضغط + لإضافة أول مصروف أو دخل',
        searchTransactions: 'البحث في المعاملات...',
        monthlyBudget: 'الميزانية الشهرية',
        addTransaction: 'إضافة معاملة',
        amount: 'المبلغ',
        category: 'الفئة',
        note: 'ملاحظة',
        date: 'التاريخ',
        expense: 'مصروف',
        addExpense: 'إضافة مصروف',
        addIncome: 'إضافة دخل',
        whatsThisFor: 'ما هذا المصروف؟',
        cancel: 'إلغاء',
        save: 'حفظ',
        settings: 'الإعدادات',
        currency: 'العملة',
        manageCategories: 'إدارة الفئات',
        categories: 'الفئات',
        lifetimeStats: 'إحصائيات عامة',
        totalIncome: 'إجمالي الدخل',
        totalExpenses: 'إجمالي المصروفات',
        netBalance: 'صافي الرصيد',
        data: 'البيانات',
        resetAllData: 'إعادة تعيين البيانات',
        deleteAllTransactions: 'حذف جميع المعاملات والإعدادات',
        analytics: 'التحليلات',
        general: 'عام',
        notSet: 'غير محدد',
        items: 'عناصر',
        item: 'عنصر',
        calendar: 'التقويم',
        exportData: 'تصدير البيانات',
        exportPdf: 'تصدير كـ PDF',
        exportCsv: 'تصدير كـ CSV',
        noCategory: 'لا توجد فئة',
        pleaseSelectCategory: 'يرجى اختيار فئة',
        invalidAmount: 'مبلغ غير صالح',
        enterValidNumber: 'يرجى إدخال رقم صالح',
        delete: 'حذف',
        deleteTransaction: 'حذف المعاملة',
        deleteConfirm: 'هل أنت متأكد أنك تريد حذف هذه المعاملة؟',
        language: 'اللغة',
        english: 'English',
        arabic: 'عربي',
        all: 'الكل',
        total: 'الإجمالي',
        thisMonth: 'هذا الشهر',
        allTime: 'كل الوقت',
        default: 'افتراضي',
        newCategory: 'فئة جديدة',
        categoryName: 'اسم الفئة',
        addCategory: 'إضافة فئة',
        balance: 'الرصيد',
        addMoney: 'إضافة مال',
        sendMoney: 'إرسال مال',
        deposit: 'إيداع',
        withdraw: 'سحب',
        seeAll: 'مشاهدة الكل',
        history: 'سجل المعاملات',
    },
};

export const t = (key: string, lang: string = 'en'): string => {
    return translations[lang]?.[key] || translations.en[key] || key;
};

export const isRTL = (lang: string): boolean => lang === 'ar';

export const applyRTL = (lang: string) => {
    const rtl = isRTL(lang);
    if (I18nManager.isRTL !== rtl) {
        I18nManager.forceRTL(rtl);
        I18nManager.allowRTL(rtl);
    }
};

export const getFlexDirection = (lang: string): 'row' | 'row-reverse' =>
    isRTL(lang) ? 'row-reverse' : 'row';

export const getTextAlign = (lang: string): 'left' | 'right' =>
    isRTL(lang) ? 'right' : 'left';

export const getWritingDirection = (lang: string): 'ltr' | 'rtl' =>
    isRTL(lang) ? 'rtl' : 'ltr';

// Global privacy mode — when on, all amounts are masked. Kept in sync from AppContext.
let _privacyMode = false;
export const setPrivacyMode = (v: boolean): void => { _privacyMode = v; };
export const getPrivacyMode = (): boolean => _privacyMode;
export const MASK = '••••';

export const formatCurrency = (amount: number, currency: any, lang: string = 'en', includeSymbol: boolean = true): string => {
    if (!currency) return _privacyMode ? MASK : amount.toFixed(2);
    const isAr = lang === 'ar';
    const symbol = isAr ? currency.symbol : currency.code;
    if (_privacyMode) {
        return isAr
            ? `${includeSymbol ? symbol + ' ' : ''}${MASK}`
            : `${MASK}${includeSymbol ? ' ' + symbol : ''}`;
    }
    const absAmount = Math.abs(amount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    if (isAr) {
        // Arabic: "ج.م 60.00-"
        return `${includeSymbol ? symbol + ' ' : ''}${absAmount}${amount < 0 ? '-' : ''}`;
    } else {
        // English: "-60.00 EGP"
        return `${amount < 0 ? '-' : ''}${absAmount}${includeSymbol ? ' ' + symbol : ''}`;
    }
};

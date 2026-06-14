import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { AppState, Category, Transaction, AppSettings, Currency, BudgetGoal, PaymentMethod, SavingsGoal, Account, Debt } from '../types';
import { loadData, saveData, StorageKeys } from '../utils/storage';
import { setPrivacyMode } from '../utils/i18n';

// Initial State
const initialState: AppState = {
    transactions: [],
    categories: [
        { id: '1', name: 'Food', emoji: 'fast-food', type: 'expense', isDefault: true },
        { id: '2', name: 'Transport', emoji: 'car', type: 'expense', isDefault: true },
        { id: '3', name: 'Rent', emoji: 'home', type: 'expense', isDefault: true },
        { id: '4', name: 'Utilities', emoji: 'bulb', type: 'expense', isDefault: true },
        { id: '5', name: 'Shopping', emoji: 'cart', type: 'expense', isDefault: true },
        { id: '6', name: 'Entertainment', emoji: 'game-controller', type: 'expense', isDefault: true },
        { id: '7', name: 'Health', emoji: 'medkit', type: 'expense', isDefault: true },
        { id: '8', name: 'Salary', emoji: 'briefcase', type: 'income', isDefault: true },
        { id: '9', name: 'Freelance', emoji: 'laptop', type: 'income', isDefault: true },
        { id: '10', name: 'Gift', emoji: 'gift', type: 'income', isDefault: true },
    ],
    settings: {
        currency: null,
        theme: 'system',
        language: null,
        hasSeenOnboarding: false,
        monthlyBudget: 0,
        primaryColor: '#3B82F6',
        passcode: null,
        fontScale: 1.0,
        dailyReminder: false,
        dailyReminderTime: '20:00',
        profileName: '',
        biometricEnabled: false,
        privacyMode: false,
    },
    budgetGoals: [],
    paymentMethods: [],
    savingsGoals: [],
    accounts: [
        { id: 'main', name: 'Main', icon: 'wallet', type: 'cash', color: '#3B82F6', openingBalance: 0, createdAt: 0 },
    ],
    debts: [],
};

// Actions
type Action =
    | { type: 'LOAD_STATE'; payload: AppState }
    | { type: 'SET_CURRENCY'; payload: Currency }
    | { type: 'SET_ONBOARDING_SEEN' }
    | { type: 'ADD_TRANSACTION'; payload: Transaction }
    | { type: 'UPDATE_TRANSACTION'; payload: Transaction }
    | { type: 'DELETE_TRANSACTION'; payload: string }
    | { type: 'ADD_CATEGORY'; payload: Category }
    | { type: 'UPDATE_CATEGORY'; payload: Category }
    | { type: 'DELETE_CATEGORY'; payload: string }
    | { type: 'SET_MONTHLY_BUDGET'; payload: number }
    | { type: 'SET_BUDGET_GOAL'; payload: BudgetGoal }
    | { type: 'SET_LANGUAGE'; payload: 'en' | 'ar' | null }
    | { type: 'SET_THEME'; payload: 'light' | 'dark' | 'system' }
    | { type: 'SET_PRIMARY_COLOR'; payload: string }
    | { type: 'SET_PASSCODE'; payload: string | null }
    | { type: 'SET_FONT_SCALE'; payload: number }
    | { type: 'SET_DAILY_REMINDER'; payload: boolean }
    | { type: 'SET_DAILY_REMINDER_TIME'; payload: string }
    | { type: 'SET_PROFILE_NAME'; payload: string }
    | { type: 'SET_BIOMETRIC'; payload: boolean }
    | { type: 'SET_PRIVACY_MODE'; payload: boolean }
    | { type: 'ADD_PAYMENT_METHOD'; payload: PaymentMethod }
    | { type: 'UPDATE_PAYMENT_METHOD'; payload: PaymentMethod }
    | { type: 'DELETE_PAYMENT_METHOD'; payload: string }
    | { type: 'ADD_SAVINGS_GOAL'; payload: SavingsGoal }
    | { type: 'UPDATE_SAVINGS_GOAL'; payload: SavingsGoal }
    | { type: 'DELETE_SAVINGS_GOAL'; payload: string }
    | { type: 'ADD_ACCOUNT'; payload: Account }
    | { type: 'UPDATE_ACCOUNT'; payload: Account }
    | { type: 'DELETE_ACCOUNT'; payload: string }
    | { type: 'ADD_DEBT'; payload: Debt }
    | { type: 'UPDATE_DEBT'; payload: Debt }
    | { type: 'DELETE_DEBT'; payload: string }
    | { type: 'RESET_DATA' }
    | { type: 'IMPORT_STATE'; payload: AppState };

// Reducer
const appReducer = (state: AppState, action: Action): AppState => {
    switch (action.type) {
        case 'LOAD_STATE':
            return action.payload;
        case 'SET_CURRENCY':
            return {
                ...state,
                settings: { ...state.settings, currency: action.payload },
            };
        case 'SET_ONBOARDING_SEEN':
            return {
                ...state,
                settings: { ...state.settings, hasSeenOnboarding: true },
            };
        case 'ADD_TRANSACTION':
            return {
                ...state,
                transactions: [action.payload, ...state.transactions],
            };
        case 'UPDATE_TRANSACTION':
            return {
                ...state,
                transactions: state.transactions.map((tx) =>
                    tx.id === action.payload.id ? action.payload : tx
                ),
            };
        case 'DELETE_TRANSACTION':
            return {
                ...state,
                transactions: state.transactions.filter((t) => t.id !== action.payload),
            };
        case 'ADD_CATEGORY':
            return {
                ...state,
                categories: [...state.categories, action.payload],
            };
        case 'UPDATE_CATEGORY':
            return {
                ...state,
                categories: state.categories.map((c) =>
                    c.id === action.payload.id ? action.payload : c
                ),
            };
        case 'DELETE_CATEGORY':
            return {
                ...state,
                categories: state.categories.filter((c) => c.id !== action.payload),
            };
        case 'SET_MONTHLY_BUDGET':
            return {
                ...state,
                settings: { ...state.settings, monthlyBudget: action.payload },
            };
        case 'SET_BUDGET_GOAL':
            const existingIdx = state.budgetGoals.findIndex(
                (g) => g.categoryId === action.payload.categoryId && g.month === action.payload.month
            );
            const newGoals = [...state.budgetGoals];
            if (existingIdx >= 0) {
                newGoals[existingIdx] = action.payload;
            } else {
                newGoals.push(action.payload);
            }
            return { ...state, budgetGoals: newGoals };
        case 'SET_LANGUAGE':
            return {
                ...state,
                settings: { ...state.settings, language: action.payload },
                // Keep the default "Main" account label localized until the user renames it.
                accounts: state.accounts.map((a) =>
                    a.id === 'main' && (a.name === 'Main' || a.name === 'الرئيسي')
                        ? { ...a, name: action.payload === 'ar' ? 'الرئيسي' : 'Main' }
                        : a
                ),
            };
        case 'SET_THEME':
            return {
                ...state,
                settings: { ...state.settings, theme: action.payload },
            };
        case 'SET_PRIMARY_COLOR':
            return {
                ...state,
                settings: { ...state.settings, primaryColor: action.payload },
            };
        case 'SET_PASSCODE':
            return {
                ...state,
                settings: { ...state.settings, passcode: action.payload },
            };
        case 'SET_FONT_SCALE':
            return {
                ...state,
                settings: { ...state.settings, fontScale: action.payload },
            };
        case 'SET_DAILY_REMINDER':
            return {
                ...state,
                settings: { ...state.settings, dailyReminder: action.payload },
            };
        case 'SET_DAILY_REMINDER_TIME':
            return {
                ...state,
                settings: { ...state.settings, dailyReminderTime: action.payload },
            };
        case 'SET_PROFILE_NAME':
            return {
                ...state,
                settings: { ...state.settings, profileName: action.payload },
            };
        case 'SET_BIOMETRIC':
            return {
                ...state,
                settings: { ...state.settings, biometricEnabled: action.payload },
            };
        case 'SET_PRIVACY_MODE':
            return {
                ...state,
                settings: { ...state.settings, privacyMode: action.payload },
            };
        case 'ADD_PAYMENT_METHOD':
            return {
                ...state,
                paymentMethods: [...state.paymentMethods, action.payload],
            };
        case 'UPDATE_PAYMENT_METHOD':
            return {
                ...state,
                paymentMethods: state.paymentMethods.map((m) =>
                    m.id === action.payload.id ? action.payload : m
                ),
            };
        case 'DELETE_PAYMENT_METHOD':
            return {
                ...state,
                paymentMethods: state.paymentMethods.filter((m) => m.id !== action.payload),
            };
        case 'ADD_SAVINGS_GOAL':
            return {
                ...state,
                savingsGoals: [...state.savingsGoals, action.payload],
            };
        case 'UPDATE_SAVINGS_GOAL':
            return {
                ...state,
                savingsGoals: state.savingsGoals.map((g) =>
                    g.id === action.payload.id ? action.payload : g
                ),
            };
        case 'DELETE_SAVINGS_GOAL':
            return {
                ...state,
                savingsGoals: state.savingsGoals.filter((g) => g.id !== action.payload),
            };
        case 'ADD_ACCOUNT':
            return {
                ...state,
                accounts: [...state.accounts, action.payload],
            };
        case 'UPDATE_ACCOUNT':
            return {
                ...state,
                accounts: state.accounts.map((a) =>
                    a.id === action.payload.id ? action.payload : a
                ),
            };
        case 'DELETE_ACCOUNT':
            // Unassign transactions that pointed at the deleted account so balances stay sane.
            return {
                ...state,
                accounts: state.accounts.filter((a) => a.id !== action.payload),
                transactions: state.transactions.map((tx) =>
                    tx.accountId === action.payload ? { ...tx, accountId: undefined } : tx
                ),
            };
        case 'ADD_DEBT':
            return {
                ...state,
                debts: [action.payload, ...state.debts],
            };
        case 'UPDATE_DEBT':
            return {
                ...state,
                debts: state.debts.map((d) =>
                    d.id === action.payload.id ? action.payload : d
                ),
            };
        case 'DELETE_DEBT':
            return {
                ...state,
                debts: state.debts.filter((d) => d.id !== action.payload),
            };
        case 'RESET_DATA':
            return initialState;
        case 'IMPORT_STATE':
            return { ...initialState, ...action.payload, paymentMethods: action.payload.paymentMethods || [], savingsGoals: action.payload.savingsGoals || [], accounts: action.payload.accounts || [], debts: action.payload.debts || [] };
        default:
            return state;
    }
};

// Context
const AppContext = createContext<{
    state: AppState;
    dispatch: React.Dispatch<Action>;
    isLoading: boolean;
}>({
    state: initialState,
    dispatch: () => null,
    isLoading: true,
});

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(appReducer, initialState);
    const [isLoading, setIsLoading] = React.useState(true);

    // Keep the i18n formatter's privacy flag in sync so all formatCurrency() output masks.
    setPrivacyMode(!!state.settings.privacyMode);

    // Load data on mount
    useEffect(() => {
        const loadState = async () => {
            const savedState = await loadData(StorageKeys.APP_STATE);
            if (savedState) {
                // Backward compat: ensure new fields exist
                const mergedSettings = { ...initialState.settings, ...savedState.settings };
                // Migrate old indigo default to blue
                if (mergedSettings.primaryColor === '#4F46E5') {
                    mergedSettings.primaryColor = '#3B82F6';
                }
                // Ensure a default "Main" account exists and that legacy transactions
                // are linked to it, so account balances reflect existing money.
                const hasAccounts = Array.isArray(savedState.accounts) && savedState.accounts.length > 0;
                const ensuredAccounts: Account[] = hasAccounts
                    ? savedState.accounts
                    : [{ id: 'main', name: mergedSettings.language === 'ar' ? 'الرئيسي' : 'Main', icon: 'wallet', type: 'cash', color: '#3B82F6', openingBalance: 0, createdAt: 0 }];
                // Heal any transaction whose account is missing or stale by linking it
                // to the default "main" (or first) account, so account balances always
                // reflect every transaction — not just those tagged with a live account.
                const fallbackAcctId = ensuredAccounts.some((a) => a.id === 'main') ? 'main' : ensuredAccounts[0]?.id;
                const ensuredTransactions: Transaction[] = (savedState.transactions || []).map((tx: Transaction) =>
                    tx.accountId && ensuredAccounts.some((a) => a.id === tx.accountId)
                        ? tx
                        : { ...tx, accountId: fallbackAcctId });
                const merged: AppState = {
                    ...initialState,
                    ...savedState,
                    settings: mergedSettings,
                    transactions: ensuredTransactions,
                    budgetGoals: savedState.budgetGoals || [],
                    paymentMethods: savedState.paymentMethods || [],
                    savingsGoals: savedState.savingsGoals || [],
                    accounts: ensuredAccounts,
                    debts: savedState.debts || [],
                };
                dispatch({ type: 'LOAD_STATE', payload: merged });
            }
            setIsLoading(false);
        };
        loadState();
    }, []);

    // Save data on change
    useEffect(() => {
        if (!isLoading) {
            saveData(StorageKeys.APP_STATE, state);
        }
    }, [state, isLoading]);

    return (
        <AppContext.Provider value={{ state, dispatch, isLoading }}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => useContext(AppContext);

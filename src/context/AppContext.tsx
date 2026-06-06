import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { AppState, Category, Transaction, AppSettings, Currency, BudgetGoal, PaymentMethod } from '../types';
import { loadData, saveData, StorageKeys } from '../utils/storage';

// Initial State
const initialState: AppState = {
    transactions: [],
    categories: [
        { id: '1', name: 'Food', emoji: '🍔', type: 'expense', isDefault: true },
        { id: '2', name: 'Transport', emoji: '🚗', type: 'expense', isDefault: true },
        { id: '3', name: 'Rent', emoji: '🏠', type: 'expense', isDefault: true },
        { id: '4', name: 'Utilities', emoji: '💡', type: 'expense', isDefault: true },
        { id: '5', name: 'Shopping', emoji: '🛒', type: 'expense', isDefault: true },
        { id: '6', name: 'Entertainment', emoji: '🎮', type: 'expense', isDefault: true },
        { id: '7', name: 'Health', emoji: '🏥', type: 'expense', isDefault: true },
        { id: '8', name: 'Salary', emoji: '💼', type: 'income', isDefault: true },
        { id: '9', name: 'Freelance', emoji: '💻', type: 'income', isDefault: true },
        { id: '10', name: 'Gift', emoji: '🎁', type: 'income', isDefault: true },
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
    },
    budgetGoals: [],
    paymentMethods: [],
};

// Actions
type Action =
    | { type: 'LOAD_STATE'; payload: AppState }
    | { type: 'SET_CURRENCY'; payload: Currency }
    | { type: 'SET_ONBOARDING_SEEN' }
    | { type: 'ADD_TRANSACTION'; payload: Transaction }
    | { type: 'DELETE_TRANSACTION'; payload: string }
    | { type: 'ADD_CATEGORY'; payload: Category }
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
    | { type: 'ADD_PAYMENT_METHOD'; payload: PaymentMethod }
    | { type: 'UPDATE_PAYMENT_METHOD'; payload: PaymentMethod }
    | { type: 'DELETE_PAYMENT_METHOD'; payload: string }
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
        case 'RESET_DATA':
            return initialState;
        case 'IMPORT_STATE':
            return { ...initialState, ...action.payload, paymentMethods: action.payload.paymentMethods || [] };
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
                const merged: AppState = {
                    ...initialState,
                    ...savedState,
                    settings: mergedSettings,
                    budgetGoals: savedState.budgetGoals || [],
                    paymentMethods: savedState.paymentMethods || [],
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

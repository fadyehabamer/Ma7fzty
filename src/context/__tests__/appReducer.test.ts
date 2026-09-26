import { appReducer, initialState } from '../AppContext';
import { Account, AppState, Transaction } from '../../types';

const tx = (id: string, extra: Partial<Transaction> = {}): Transaction => ({
    id,
    amount: 100,
    categoryId: '1',
    date: 0,
    type: 'expense',
    ...extra,
});

describe('appReducer', () => {
    it('adds new transactions to the top and updates/deletes by id', () => {
        let s = appReducer(initialState, { type: 'ADD_TRANSACTION', payload: tx('a') });
        s = appReducer(s, { type: 'ADD_TRANSACTION', payload: tx('b') });
        expect(s.transactions.map((t) => t.id)).toEqual(['b', 'a']);

        s = appReducer(s, { type: 'UPDATE_TRANSACTION', payload: tx('a', { amount: 42 }) });
        expect(s.transactions.find((t) => t.id === 'a')!.amount).toBe(42);

        s = appReducer(s, { type: 'DELETE_TRANSACTION', payload: 'b' });
        expect(s.transactions.map((t) => t.id)).toEqual(['a']);
    });

    it('does not mutate the previous state', () => {
        const before = JSON.stringify(initialState);
        appReducer(initialState, { type: 'ADD_TRANSACTION', payload: tx('a') });
        appReducer(initialState, { type: 'SET_THEME', payload: 'dark' });
        expect(JSON.stringify(initialState)).toBe(before);
    });

    it('upserts budget goals per category and month', () => {
        const goal = { id: 'g1', categoryId: '1', amount: 500, month: '2026-09' };
        let s = appReducer(initialState, { type: 'SET_BUDGET_GOAL', payload: goal });
        s = appReducer(s, { type: 'SET_BUDGET_GOAL', payload: { ...goal, id: 'g2', amount: 800 } });
        expect(s.budgetGoals).toEqual([{ ...goal, id: 'g2', amount: 800 }]);

        s = appReducer(s, { type: 'SET_BUDGET_GOAL', payload: { ...goal, id: 'g3', month: '2026-10' } });
        expect(s.budgetGoals).toHaveLength(2);
    });

    it('unassigns transactions when their account is deleted', () => {
        const savings: Account = { id: 'sav', name: 'Savings', icon: 'cash', type: 'savings', color: '#000000', openingBalance: 0, createdAt: 1 };
        let s = appReducer(initialState, { type: 'ADD_ACCOUNT', payload: savings });
        s = appReducer(s, { type: 'ADD_TRANSACTION', payload: tx('a', { accountId: 'sav' }) });
        s = appReducer(s, { type: 'ADD_TRANSACTION', payload: tx('b', { accountId: 'main' }) });

        s = appReducer(s, { type: 'DELETE_ACCOUNT', payload: 'sav' });
        expect(s.accounts.map((a) => a.id)).toEqual(['main']);
        expect(s.transactions.find((t) => t.id === 'a')!.accountId).toBeUndefined();
        expect(s.transactions.find((t) => t.id === 'b')!.accountId).toBe('main');
    });

    it('localizes the default Main account until the user renames it', () => {
        let s = appReducer(initialState, { type: 'SET_LANGUAGE', payload: 'ar' });
        expect(s.settings.language).toBe('ar');
        expect(s.accounts[0].name).toBe('الرئيسي');

        s = appReducer(s, { type: 'SET_LANGUAGE', payload: 'en' });
        expect(s.accounts[0].name).toBe('Main');

        s = appReducer(s, { type: 'UPDATE_ACCOUNT', payload: { ...s.accounts[0], name: 'Wallet' } });
        s = appReducer(s, { type: 'SET_LANGUAGE', payload: 'ar' });
        expect(s.accounts[0].name).toBe('Wallet');
    });

    it('fills in collections missing from older imported backups', () => {
        const legacy = {
            transactions: [tx('a')],
            categories: initialState.categories,
            settings: initialState.settings,
            budgetGoals: [],
        } as unknown as AppState;
        const s = appReducer(initialState, { type: 'IMPORT_STATE', payload: legacy });
        expect(s.transactions).toHaveLength(1);
        expect(s.paymentMethods).toEqual([]);
        expect(s.savingsGoals).toEqual([]);
        expect(s.accounts).toEqual([]);
        expect(s.debts).toEqual([]);
    });

    it('resets to the initial state', () => {
        const s = appReducer(
            appReducer(initialState, { type: 'ADD_TRANSACTION', payload: tx('a') }),
            { type: 'RESET_DATA' }
        );
        expect(s).toBe(initialState);
    });
});

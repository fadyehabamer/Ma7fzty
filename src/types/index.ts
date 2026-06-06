export type TransactionType = 'income' | 'expense';

export interface Currency {
    code: string;
    symbol: string;
    name: string;
    nameAr: string;
    flag: string; // Emoji flag
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
  type: TransactionType;
  isDefault?: boolean;
}

export interface Transaction {
  id: string;
  amount: number;
  categoryId: string;
  date: number; // Timestamp
  note?: string;
  imageUri?: string;
  type: TransactionType;
}

export interface BudgetGoal {
  id: string;
  categoryId: string; // 'all' for total budget
  amount: number;
  month: string; // 'YYYY-MM' format
}

export interface AppSettings {
  currency: Currency | null; // Null initially
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'ar' | null;
  hasSeenOnboarding: boolean;
  monthlyBudget: number; // Overall monthly budget
  primaryColor: string; // Hex color for primary accent
  passcode: string | null; // 4-digit PIN, null = disabled
  fontScale: number; // 0.8 to 1.5
  dailyReminder?: boolean;
  dailyReminderTime?: string; // HH:mm format
  profileName?: string; // Name shown when sharing payment info
  biometricEnabled?: boolean; // Unlock with Face ID / fingerprint (requires passcode)
}

// Supported payment method kinds for the "Share Payment Info" page
export type PaymentMethodType =
  | 'paypal'
  | 'instapay'
  | 'wallet'
  | 'iban'
  | 'bank'
  | 'crypto'
  | 'other';

export interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  label?: string; // Optional custom nickname e.g. "My CIB account"
  fields: Record<string, string>; // Type-specific values (keyed by PaymentField.key)
  createdAt: number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  emoji: string;
  targetAmount: number;
  savedAmount: number;
  createdAt: number;
  deadline?: number; // Optional target date (timestamp)
}

export interface AppState {
  transactions: Transaction[];
  categories: Category[];
  settings: AppSettings;
  budgetGoals: BudgetGoal[];
  paymentMethods: PaymentMethod[];
  savingsGoals: SavingsGoal[];
}

import { NavigatorScreenParams } from '@react-navigation/native';
import { Transaction, Category } from './index';

export type RootStackParamList = {
  Onboarding: undefined;
  CurrencySelect: undefined;
  Main: NavigatorScreenParams<TabParamList>;
  AddTransaction: { transaction?: Transaction }; // Optional transaction for editing
  Categories: undefined;
};

export type TabParamList = {
  Transactions: undefined;
  Charts: undefined;
  Settings: undefined;
};






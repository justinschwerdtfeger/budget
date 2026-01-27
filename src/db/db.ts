
import Dexie, { type EntityTable } from 'dexie';

interface Account {
    id: string;
    name: string;
    type: 'checking' | 'savings' | 'credit' | 'cash';
    // balance removed - derived from categories
}

interface CategoryGroup {
    id: string;
    name: string;
    order: number;
}

interface Category {
    id: string;
    group_id: string;
    account_id: string; // Linked Account
    name: string;
    order: number;
}

interface Transaction {
    id: string;
    account_id: string;
    category_id?: string;
    payee?: string;
    amount: number; // In cents. Positive = income, Negative = expense
    date: string; // ISO date string YYYY-MM-DD
    memo?: string;
}

interface BudgetPeriod {
    id: string; // UUID
    start: string; // ISO Date YYYY-MM-DD
    end: string | null; // ISO Date YYYY-MM-DD or null if active
}

interface BudgetSnapshot {
    id: string; // UUID
    period_id: string;
    category_id: string;
    assigned: number;
    activity: number;
    available: number;
}

// Budgeted amount for a category in a specific period
interface Budgeted {
    id: string; // composite key: period_id + category_id
    period_id: string;
    category_id: string;
    amount: number; // In cents
}

const db = new Dexie('BudgetDB') as Dexie & {
    accounts: EntityTable<Account, 'id'>;
    categoryGroups: EntityTable<CategoryGroup, 'id'>;
    categories: EntityTable<Category, 'id'>;
    transactions: EntityTable<Transaction, 'id'>;
    budgeted: EntityTable<Budgeted, 'id'>;
    budgetPeriods: EntityTable<BudgetPeriod, 'id'>;
    budgetSnapshots: EntityTable<BudgetSnapshot, 'id'>;
};

// Version 4: Flexible Budget Periods
db.version(4).stores({
    accounts: 'id, name, type',
    categoryGroups: 'id, name, order',
    categories: 'id, group_id, account_id, name, order',
    transactions: 'id, account_id, category_id, date',
    budgeted: 'id, period_id, category_id', // Replaced month with period_id
    budgetPeriods: 'id, start, end',
    budgetSnapshots: 'id, period_id, category_id'
});

// Version 3: Remove balance from accounts
db.version(3).stores({
    accounts: 'id, name, type', // balance removed
    categoryGroups: 'id, name, order',
    categories: 'id, group_id, account_id, name, order',
    transactions: 'id, account_id, category_id, date',
    budgeted: 'id, month, category_id'
});

// Version 2: Add account_id to categories
db.version(2).stores({
    accounts: 'id, name, type',
    categoryGroups: 'id, name, order',
    categories: 'id, group_id, account_id, name, order',
    transactions: 'id, account_id, category_id, date',
    budgeted: 'id, month, category_id'
});

// Keep Version 1 for history/compatibility if needed (usually Dexie handles upgrades)
db.version(1).stores({
    accounts: 'id, name, type',
    categoryGroups: 'id, name, order',
    categories: 'id, group_id, name, order',
    transactions: 'id, account_id, category_id, date',
    budgeted: 'id, month, category_id'
});

export { db, type BudgetPeriod, type BudgetSnapshot };
export type { Account, CategoryGroup, Category, Transaction, Budgeted };

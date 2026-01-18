
import Dexie, { type EntityTable } from 'dexie';

interface Account {
    id: string;
    name: string;
    type: 'checking' | 'savings' | 'credit' | 'cash';
    balance: number; // In cents
}

interface CategoryGroup {
    id: string;
    name: string;
    order: number;
}

interface Category {
    id: string;
    group_id: string;
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

// Budgeted amount for a category in a specific month
interface Budgeted {
    id: string; // composite key: month + category_id
    month: string; // YYYY-MM
    category_id: string;
    amount: number; // In cents
}

const db = new Dexie('BudgetDB') as Dexie & {
    accounts: EntityTable<Account, 'id'>;
    categoryGroups: EntityTable<CategoryGroup, 'id'>;
    categories: EntityTable<Category, 'id'>;
    transactions: EntityTable<Transaction, 'id'>;
    budgeted: EntityTable<Budgeted, 'id'>;
};

db.version(1).stores({
    accounts: 'id, name, type',
    categoryGroups: 'id, name, order',
    categories: 'id, group_id, name, order',
    transactions: 'id, account_id, category_id, date',
    budgeted: 'id, month, category_id' // id is manually constructed as `${month}-${category_id}`
});

export { db };
export type { Account, CategoryGroup, Category, Transaction, Budgeted };

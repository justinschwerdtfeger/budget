import Dexie, { type EntityTable } from 'dexie';

interface Account {
    id: string;
    name: string;
    type: 'checking' | 'savings' | 'credit' | 'cash';
    // TODO: Check comments
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
    category_id?: string;
    memo?: string;
    amount: number; // In cents. Positive = income, Negative = expense
    date: string; // ISO date string YYYY-MM-DD TODO: Why are dates stored as strings?
}

const db = new Dexie('BudgetDB') as Dexie & {
    accounts: EntityTable<Account, 'id'>;
    categoryGroups: EntityTable<CategoryGroup, 'id'>;
    categories: EntityTable<Category, 'id'>;
    transactions: EntityTable<Transaction, 'id'>;
};

db.version(1).stores({
    accounts: 'id, name, type',
    categoryGroups: 'id, name, order',
    categories: 'id, group_id, name, order',
    transactions: 'id, account_id, category_id, date',
});

export { db };
export type { Account, CategoryGroup, Category, Transaction };

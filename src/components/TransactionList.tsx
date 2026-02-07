'use client';

import * as React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Typography,
    Box
} from '@mui/material';
import { format } from 'date-fns';

export default function TransactionList() {
    const transactions = useLiveQuery(async () => {
        const txs = await db.transactions.orderBy('date').reverse().toArray();

        return Promise.all(txs.map(async (tx) => {
            if (tx.to_category_id === 'rta') {
                return {
                    ...tx,
                    categoryName: 'Ready to Assign'
                };
            }
            const toCategory = await db.categories.get(tx.to_category_id);
            const toCategoryName = toCategory?.name || `Unable to find category: ${tx.to_category_id}`;

            // If we have a from_category_id, it's a transfer
            if (tx.from_category_id) {
                // Transfer from RTA
                if (tx.from_category_id === 'rta') {
                    return {
                        ...tx,
                        categoryName: `Ready to Assign -> ${toCategoryName}`
                    };
                }

                // Transfer from one category to another
                const fromCategory = await db.categories.get(tx.from_category_id);
                const fromCategoryName = fromCategory?.name || `Unable to find category: ${tx.from_category_id}`;
                return {
                    ...tx,
                    categoryName: `${fromCategoryName} -> ${toCategoryName}`
                };
            }
            return {
                ...tx,
                categoryName: toCategoryName
            };
        }));
    });

    if (!transactions) return null;

    return (
        <Box sx={{ width: '100%', mt: 2 }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                All Transactions
            </Typography>
            <TableContainer component={Paper} elevation={1} variant="outlined">
                <Table aria-label="transactions table">
                    <TableHead>
                        <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell>Memo</TableCell>
                            <TableCell>Category</TableCell>
                            <TableCell align="right">Amount</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {transactions.map((tx) => (
                            <TableRow key={tx.id}>
                                <TableCell>{format(new Date(tx.date), 'MMM d, yyyy')}</TableCell>
                                <TableCell>{tx.memo || '(No Memo)'}</TableCell>
                                <TableCell>{tx.categoryName}</TableCell>
                                <TableCell align="right" sx={{ color: tx.amount < 0 ? 'text.primary' : 'success.main', fontWeight: 'bold' }}>
                                    ${(tx.amount / 100).toFixed(2)}
                                </TableCell>
                            </TableRow>
                        ))}
                        {transactions.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} align="center">
                                    No transactions found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}

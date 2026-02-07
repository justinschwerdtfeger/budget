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
        // Enrich with Account and Category names
        return Promise.all(txs.map(async (tx) => {
            const category = tx.category_id ? await db.categories.get(tx.category_id) : null;
            return {
                ...tx,
                categoryName: category?.name || 'Uncategorized'
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
                                <TableCell colSpan={5} align="center">
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

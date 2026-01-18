'use client';

import * as React from 'react';
import {
    Button,
    TextField,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    MenuItem,
    Stack
} from '@mui/material';
import { db } from '@/db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

interface TransactionDialogProps {
    open: boolean;
    onClose: () => void;
}

export default function TransactionDialog({ open, onClose }: TransactionDialogProps) {
    const accounts = useLiveQuery(() => db.accounts.toArray());
    const categories = useLiveQuery(() => db.categories.toArray());

    const [formData, setFormData] = React.useState({
        account_id: '',
        category_id: '',
        payee: '',
        amount: '',
        date: '' // Initialize empty to avoid server/client mismatch
    });

    React.useEffect(() => {
        if (open) {
            setFormData(prev => ({
                ...prev,
                date: prev.date || format(new Date(), 'yyyy-MM-dd')
            }));
        }
    }, [open]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async () => {
        console.log("Submit clicked", formData);
        if (!formData.account_id || !formData.amount) {
            console.error("Missing required fields");
            return;
        }

        try {
            // simplistic amount parsing
            const amountInCents = Math.round(parseFloat(formData.amount) * 100);

            await db.transaction('rw', db.accounts, db.transactions, async () => {
                await db.transactions.add({
                    id: uuidv4(),
                    account_id: formData.account_id,
                    category_id: formData.category_id || undefined,
                    payee: formData.payee,
                    amount: -Math.abs(amountInCents), // Force expense for now
                    date: formData.date
                });

                const acct = await db.accounts.get(formData.account_id);
                if (acct) {
                    await db.accounts.update(formData.account_id, {
                        balance: acct.balance + (-Math.abs(amountInCents))
                    });
                }
            });
            console.log("Transaction saved");
            onClose();
        } catch (error) {
            console.error("Failed to save transaction", error);
            alert("Failed to save transaction: " + error);
        }
    };

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Add Transaction</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Record a new expense.
                </DialogContentText>
                <Stack spacing={2} sx={{ mt: 2, minWidth: 300 }}>
                    <TextField
                        select
                        label="Account"
                        name="account_id"
                        value={formData.account_id}
                        onChange={handleChange}
                        fullWidth
                    >
                        {accounts?.map((account) => (
                            <MenuItem key={account.id} value={account.id}>
                                {account.name}
                            </MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        select
                        label="Category"
                        name="category_id"
                        value={formData.category_id}
                        onChange={handleChange}
                        fullWidth
                    >
                        {categories?.map((cat) => (
                            <MenuItem key={cat.id} value={cat.id}>
                                {cat.name}
                            </MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        label="Payee"
                        name="payee"
                        value={formData.payee}
                        onChange={handleChange}
                        fullWidth
                    />

                    <TextField
                        label="Amount"
                        name="amount"
                        type="number"
                        value={formData.amount}
                        onChange={handleChange}
                        fullWidth
                    />

                    <TextField
                        label="Date"
                        name="date"
                        type="date"
                        value={formData.date}
                        onChange={handleChange}
                        fullWidth
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSubmit}>Save</Button>
            </DialogActions>
        </Dialog>
    );
}

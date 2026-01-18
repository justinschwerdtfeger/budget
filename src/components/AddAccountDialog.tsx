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
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

interface AddAccountDialogProps {
    open: boolean;
    onClose: () => void;
}

export default function AddAccountDialog({ open, onClose }: AddAccountDialogProps) {
    const [formData, setFormData] = React.useState({
        name: '',
        type: 'checking',
        balance: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async () => {
        if (!formData.name) return;

        const balanceInCents = Math.round(parseFloat(formData.balance || '0') * 100);
        const acctId = uuidv4();

        await db.transaction('rw', db.accounts, db.transactions, async () => {
            await db.accounts.add({
                id: acctId,
                name: formData.name,
                type: formData.type as any, // Simple casting for now
                balance: balanceInCents
            });

            if (balanceInCents !== 0) {
                await db.transactions.add({
                    id: uuidv4(),
                    account_id: acctId,
                    amount: balanceInCents,
                    date: format(new Date(), 'yyyy-MM-dd'),
                    payee: 'Starting Balance'
                });
            }
        });

        // Reset and close
        setFormData({ name: '', type: 'checking', balance: '' });
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Add Account</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Create a new account to track.
                </DialogContentText>
                <Stack spacing={2} sx={{ mt: 2, minWidth: 300 }}>
                    <TextField
                        autoFocus
                        label="Account Name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        fullWidth
                    />

                    <TextField
                        select
                        label="Account Type"
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        fullWidth
                    >
                        <MenuItem value="checking">Checking</MenuItem>
                        <MenuItem value="savings">Savings</MenuItem>
                        <MenuItem value="credit">Credit Card</MenuItem>
                        <MenuItem value="cash">Cash</MenuItem>
                    </TextField>

                    <TextField
                        label="Starting Balance"
                        name="balance"
                        type="number"
                        value={formData.balance}
                        onChange={handleChange}
                        fullWidth
                        helperText="Positive for cash/checking, negative for debt."
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

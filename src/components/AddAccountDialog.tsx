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
import { useSnackbar } from './AppSnackbar';
import { useUndo } from './UndoProvider';

interface AddAccountDialogProps {
    open: boolean;
    onClose: () => void;
    editAccount?: { id: string; name: string; type: string; balance: number };
}

export default function AddAccountDialog({ open, onClose, editAccount }: AddAccountDialogProps) {
    const [formData, setFormData] = React.useState({
        name: '',
        type: 'checking',
        balance: ''
    });

    const { showSnackbar } = useSnackbar();
    const { registerUndo } = useUndo();

    React.useEffect(() => {
        if (open && editAccount) {
            setFormData({
                name: editAccount.name,
                type: editAccount.type,
                balance: (editAccount.balance / 100).toFixed(2)
            });
        } else if (open) {
            setFormData({ name: '', type: 'checking', balance: '' });
        }
    }, [open, editAccount]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async () => {
        if (!formData.name) return;

        try {
            if (editAccount) {
                await db.accounts.update(editAccount.id, {
                    name: formData.name,
                    type: formData.type as any
                    // Don't update balance here implies no transaction change
                });
                showSnackbar("Account updated");
                registerUndo("Edit Account", async () => {
                    await db.accounts.update(editAccount.id, editAccount);
                });
            } else {
                const balanceInCents = Math.round(parseFloat(formData.balance || '0') * 100);
                const acctId = uuidv4();

                await db.transaction('rw', db.accounts, db.transactions, async () => {
                    await db.accounts.add({
                        id: acctId,
                        name: formData.name,
                        type: formData.type as any,
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

                showSnackbar("Account created");
                registerUndo("Add Account", async () => {
                    // Delete the account and associated transactions (like starting balance)
                    await db.transaction('rw', db.accounts, db.transactions, async () => {
                        await db.accounts.delete(acctId);
                        await db.transactions.where({ account_id: acctId }).delete();
                    });
                });
            }

            onClose();
        } catch (error) {
            console.error("Failed to save account", error);
            alert("Error: " + error);
        }
    };

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>{editAccount ? 'Edit Account' : 'Add Account'}</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    {editAccount ? 'Update account details.' : 'Create a new account to track.'}
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

                    {!editAccount && (
                        <TextField
                            label="Starting Balance"
                            name="balance"
                            type="number"
                            value={formData.balance}
                            onChange={handleChange}
                            fullWidth
                            helperText="Positive for cash/checking, negative for debt."
                        />
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSubmit}>Save</Button>
            </DialogActions>
        </Dialog>
    );
}

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
import { db, type Account } from '@/db/db';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { useSnackbar } from './AppSnackbar';
import { useUndo } from './UndoProvider';

interface AddAccountDialogProps {
    open: boolean;
    onClose: () => void;
    editAccount?: Account;
}

export default function AddAccountDialog({ open, onClose, editAccount }: AddAccountDialogProps) {
    const [formData, setFormData] = React.useState({
        name: '',
        type: 'checking',
        balance: '' // This is now purely for the initial transaction, not stored on account
    });

    const { showSnackbar } = useSnackbar();
    const { registerUndo } = useUndo();

    React.useEffect(() => {
        if (open && editAccount) {
            setFormData({
                name: editAccount.name,
                type: editAccount.type,
                balance: '' // Cannot edit starting balance easily here, simplistic for now
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
                });

                registerUndo("Edit Account", async () => {
                    await db.accounts.update(editAccount.id, {
                        name: editAccount.name,
                        type: editAccount.type as any
                    });
                });
            } else {
                const balanceInCents = Math.round(parseFloat(formData.balance || '0') * 100);
                const acctId = uuidv4();

                await db.transaction('rw', db.accounts, db.transactions, async () => {
                    // 1. Create Account (No balance field)
                    await db.accounts.add({
                        id: acctId,
                        name: formData.name,
                        type: formData.type as any
                    });

                    // 2. Create Initial Transaction (Inflow to RTA)
                    if (balanceInCents !== 0) {
                        await db.transactions.add({
                            id: uuidv4(),
                            to_category_id: 'rta', // RTA
                            amount: balanceInCents, // Positive = Inflow
                            date: format(new Date(), 'yyyy-MM-dd'),
                            memo: 'Starting Balance'
                        });
                    }
                });


                registerUndo("Add Account", async () => {
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
                    {editAccount ? 'Update account details.' : 'Create a new account. Initial balance will go to "Ready to Assign".'}
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
                            helperText="Positive for cash/checking. Will be added to Ready to Assign."
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

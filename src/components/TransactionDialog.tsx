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
import { useSnackbar } from './AppSnackbar';
import { useUndo } from './UndoProvider';

interface TransactionDialogProps {
    open: boolean;
    onClose: () => void;
}

// ... imports ...

import {
    ToggleButton,
    ToggleButtonGroup
} from '@mui/material';

// ... imports ...

export default function TransactionDialog({ open, onClose }: TransactionDialogProps) {
    const categories = useLiveQuery(() => db.categories.toArray());
    const { showSnackbar } = useSnackbar();
    const { registerUndo } = useUndo();

    const [type, setType] = React.useState<'outflow' | 'inflow'>('outflow');
    const [formData, setFormData] = React.useState({
        category_id: '',
        memo: '',
        amount: '',
        date: ''
    });

    React.useEffect(() => {
        if (open) {
            setFormData(prev => ({
                ...prev,
                date: prev.date || format(new Date(), 'yyyy-MM-dd'),
                category_id: '' // Reset
            }));
            setType('outflow');
        }
    }, [open]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleTypeChange = (
        event: React.MouseEvent<HTMLElement>,
        newType: 'outflow' | 'inflow',
    ) => {
        if (newType !== null) {
            setType(newType);
        }
    };

    const handleSubmit = async () => {
        // Validation
        if (!formData.amount) {
            showSnackbar("Error: Please enter an amount.");
            return;
        }

        if (!formData.category_id) {
            showSnackbar("Error: Please select a category.");
            return;
        }

        // Check for positive input
        const rawAmount = parseFloat(formData.amount);
        if (rawAmount < 0) {
            showSnackbar("Error: Please enter a positive amount. Use the Outflow/Inflow toggle to set direction.");
            return;
        }

        try {
            // Derive Account if Category selected
            const category = await db.categories.get(formData.category_id);
            if (!category || !category.account_id) {
                showSnackbar("Error: Selected category is not linked to a valid account.");
                return;
            }

            const amountInCents = Math.round(rawAmount * 100);
            const transactionId = uuidv4();

            // Logic:
            // Outflow: Negative (Expense)
            // Inflow: Positive (Income/Refund)
            const signedAmount = type === 'outflow' ? -amountInCents : amountInCents;

            await db.transaction('rw', db.accounts, db.transactions, async () => {
                await db.transactions.add({
                    id: transactionId,
                    category_id: formData.category_id === 'rta' ? undefined : formData.category_id,
                    memo: formData.memo.trim(),
                    amount: signedAmount,
                    date: formData.date
                });
            });

            showSnackbar("Transaction added");
            registerUndo("Add Transaction", async () => {
                await db.transactions.delete(transactionId);
            });

            onClose();
        } catch (error) {
            console.error("Failed to save transaction", error);
            showSnackbar("Error: Failed to save transaction: " + error);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>Add Transaction</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    {/* Inflow/Outflow Toggle */}
                    <ToggleButtonGroup
                        color="primary"
                        value={type}
                        exclusive
                        onChange={handleTypeChange}
                        aria-label="Transaction Type"
                        fullWidth
                    >
                        <ToggleButton value="outflow" color="error">Outflow (-)</ToggleButton>
                        <ToggleButton value="inflow" color="success">Inflow (+)</ToggleButton>
                    </ToggleButtonGroup>

                    {/* Category Select */}
                    <TextField
                        select
                        label="Category"
                        name="category_id"
                        value={formData.category_id}
                        onChange={handleChange}
                        fullWidth
                    >
                        <MenuItem value="rta" sx={{ fontStyle: 'italic', fontWeight: 'bold' }}>
                            To/From Ready to Assign
                        </MenuItem>
                        {categories?.map((cat) => (
                            <MenuItem key={cat.id} value={cat.id}>
                                {cat.name}
                            </MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        label="Memo"
                        name="memo"
                        value={formData.memo}
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
                        inputProps={{ min: 0 }} // TODO: Deprecated, use NumberField
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

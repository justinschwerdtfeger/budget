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

    const [type, setType] = React.useState<'outflow' | 'inflow' | 'transfer'>('outflow');
    const [formData, setFormData] = React.useState({
        from_category_id: '',
        to_category_id: '',
        memo: '',
        amount: '',
        date: ''
    });

    React.useEffect(() => {
        if (open) {
            setFormData(prev => ({
                ...prev,
                date: prev.date || format(new Date(), 'yyyy-MM-dd'),
            }));
            setType('outflow');
        }
    }, [open]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleTypeChange = (
        event: React.MouseEvent<HTMLElement>,
        newType: 'outflow' | 'inflow' | 'transfer',
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

        if (!formData.to_category_id) {
            showSnackbar("Error: Please select a target category.");
            return;
        }

        if (type === 'transfer' && !formData.from_category_id) {
            showSnackbar("Error: Please select a source category.");
            return;
        }

        // Check for positive input
        const rawAmount = parseFloat(formData.amount);
        if (rawAmount < 0) {
            showSnackbar("Error: Please enter a positive amount. Use the Outflow/Inflow toggle to set direction.");
            return;
        }

        try {
            const toCategory = await db.categories.get(formData.to_category_id);
            if (formData.to_category_id !== 'rta' && (!toCategory || !toCategory.account_id)) {
                showSnackbar("Error: Selected Target Category is not linked to an account.");
                return;
            }

            if (type === 'transfer') {
                const fromCategory = await db.categories.get(formData.from_category_id);
                if (formData.from_category_id !== 'rta' && (!fromCategory || !fromCategory.account_id)) {
                    showSnackbar("Error: Selected Source Category is not linked to an account.");
                    return;
                }
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
                    from_category_id: type === 'transfer' ? formData.from_category_id : undefined,
                    to_category_id: formData.to_category_id,
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
                        <ToggleButton value="transfer" color="primary">Transfer (-&gt;)</ToggleButton>
                    </ToggleButtonGroup>

                    {/* From Category Select */}
                    {type === 'transfer' && (
                    <TextField
                        select
                        label="Source Category"
                        name="from_category_id"
                        value={formData.from_category_id}
                        onChange={handleChange}
                        fullWidth
                    >
                        <MenuItem value='rta' sx={{ fontWeight: 'bold' }}>
                            Ready to Assign
                        </MenuItem>
                        {categories?.map((cat) => (
                            <MenuItem key={cat.id} value={cat.id}>
                                {cat.name}
                            </MenuItem>
                        ))}
                    </TextField>
                    )}

                    {/* To Category Select */}
                    <TextField
                        select
                        label="Target Category"
                        name="to_category_id"
                        value={formData.to_category_id}
                        onChange={handleChange}
                        fullWidth
                    >
                        <MenuItem value='rta' sx={{ fontWeight: 'bold' }}>
                            Ready to Assign
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

                    {/* TODO: Use NumberField, make sure value stays like with TextField */}
                    <TextField
                        label="Amount"
                        name="amount"
                        type="number"
                        value={formData.amount}
                        onChange={handleChange}
                        fullWidth
                        inputProps={{ min: 0 }}
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

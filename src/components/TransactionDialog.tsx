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
import MoneyField from './MoneyField';
import { NumberFieldRoot } from '@base-ui/react';

// ... imports ...

export default function TransactionDialog({ open, onClose }: TransactionDialogProps) {
    const categories = useLiveQuery(() => db.categories.toArray());
    const { showSnackbar } = useSnackbar();
    const { registerUndo } = useUndo();

    const [type, setType] = React.useState<'outflow' | 'inflow'>('outflow');
    const [formData, setFormData] = React.useState({
        from_category_id: '',
        to_category_id: '',
        memo: '',
        amount: '',
        date: ''
    });
    const [initialAmount, setInitialAmount] = React.useState(0);

    React.useEffect(() => {
        if (open) {
            setInitialAmount(Number(formData.amount));
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

    const handleAmountChange = (value: number | null, _: NumberFieldRoot.ChangeEventDetails) => {
        setFormData({ ...formData, amount: Number(value).toFixed(2) });
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

        if (!formData.to_category_id) {
            showSnackbar("Error: Please select a target category.");
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

            const amountInCents = Math.round(rawAmount * 100);
            const transactionId = uuidv4();

            // Logic:
            // Outflow: Negative (Expense)
            // Inflow: Positive (Income/Refund)
            const signedAmount = type === 'outflow' ? -amountInCents : amountInCents;

            await db.transaction('rw', db.accounts, db.transactions, async () => {
                await db.transactions.add({
                    id: transactionId,
                    from_category_id: undefined,
                    to_category_id: formData.to_category_id,
                    memo: formData.memo.trim(),
                    amount: signedAmount,
                    date: formData.date
                });
            });


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

                    <MoneyField
                        label="Amount"
                        name="amount"
                        defaultValue={initialAmount}
                        onValueChange={handleAmountChange}
                        min={0}
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

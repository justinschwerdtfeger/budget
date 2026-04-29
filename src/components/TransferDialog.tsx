'use client';

import * as React from 'react';
import {
    Button,
    TextField,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    MenuItem,
    Stack,
    ToggleButton,
    ToggleButtonGroup
} from '@mui/material';
import { db } from '@/db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { useSnackbar } from './AppSnackbar';
import { useUndo } from './UndoProvider';

import MoneyField from './MoneyField';
import PercentField from './PercentField';
import { NumberFieldRoot } from '@base-ui/react';

interface TransferDialogProps {
    open: boolean;
    onClose: () => void;
}

export default function TransferDialog({ open, onClose }: TransferDialogProps) {
    const categories = useLiveQuery(() => db.categories.toArray());
    const { showSnackbar } = useSnackbar();
    const { registerUndo } = useUndo();

    const [inputType, setInputType] = React.useState<'amount' | 'percentage'>('amount');
    const [formData, setFormData] = React.useState({
        from_category_id: '',
        to_category_id: '',
        memo: '',
        amount: '',
        percentage: '',
        date: ''
    });
    const [initialAmount, setInitialAmount] = React.useState(0);
    const [initialPercentage, setInitialPercentage] = React.useState(0);

    React.useEffect(() => {
        if (open) {
            setInitialAmount(Number(formData.amount) || 0);
            setInitialPercentage(Number(formData.percentage) || 0);
            setFormData(prev => ({
                ...prev,
                date: prev.date || format(new Date(), 'yyyy-MM-dd'),
            }));
            setInputType('amount');
        }
    }, [open]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleAmountChange = (value: number | null, _: NumberFieldRoot.ChangeEventDetails) => {
        setFormData({ ...formData, amount: Number(value).toFixed(2) });
    };

    const handlePercentageChange = (value: number | null, _: NumberFieldRoot.ChangeEventDetails) => {
        setFormData({ ...formData, percentage: Number(value).toString() });
    };

    const handleInputTypeChange = (
        event: React.MouseEvent<HTMLElement>,
        newType: 'amount' | 'percentage',
    ) => {
        if (newType !== null) {
            setInputType(newType);
        }
    };

    const handleSubmit = async () => {
        if (!formData.from_category_id) {
            showSnackbar("Error: Please select a source category.");
            return;
        }

        if (!formData.to_category_id) {
            showSnackbar("Error: Please select a target category.");
            return;
        }

        if (formData.from_category_id === formData.to_category_id) {
            showSnackbar("Error: Source and Target categories must be different.");
            return;
        }

        let calculatedAmountInCents = 0;

        if (inputType === 'percentage') {
            const rawPercentage = parseFloat(formData.percentage);
            if (isNaN(rawPercentage) || rawPercentage <= 0) {
                showSnackbar("Error: Please enter a positive percentage.");
                return;
            }

            const percentage = rawPercentage / 100;
            
            // calculate available balance
            let available = 0;
            if (formData.from_category_id === 'rta') {
                const toRTA = await db.transactions.where('to_category_id').equals('rta').toArray();
                const fromRTA = await db.transactions.where('from_category_id').equals('rta').toArray();
                available = toRTA.reduce((acc, t) => acc + t.amount, 0) - fromRTA.reduce((acc, t) => acc + t.amount, 0);
            } else {
                const toTransactions = await db.transactions
                    .where({ to_category_id: formData.from_category_id })
                    .toArray();
                const fromTransactions = await db.transactions
                    .where({ from_category_id: formData.from_category_id })
                    .toArray();
                available = toTransactions.reduce((acc, t) => acc + t.amount, 0) - fromTransactions.reduce((acc, t) => acc + t.amount, 0);
            }

            if (available <= 0) {
                showSnackbar("Error: Source category has no available balance to transfer.");
                return;
            }
            
            calculatedAmountInCents = Math.round(available * percentage);
            
            if (calculatedAmountInCents <= 0) {
                showSnackbar("Error: Calculated transfer amount is zero.");
                return;
            }
        } else {
            const rawAmount = parseFloat(formData.amount);
            if (isNaN(rawAmount) || rawAmount <= 0) {
                showSnackbar("Error: Please enter a positive amount.");
                return;
            }
            calculatedAmountInCents = Math.round(rawAmount * 100);
        }

        try {
            const toCategory = await db.categories.get(formData.to_category_id);
            if (formData.to_category_id !== 'rta' && (!toCategory || !toCategory.account_id)) {
                showSnackbar("Error: Selected Target Category is not linked to an account.");
                return;
            }

            const fromCategory = await db.categories.get(formData.from_category_id);
            if (formData.from_category_id !== 'rta' && (!fromCategory || !fromCategory.account_id)) {
                showSnackbar("Error: Selected Source Category is not linked to an account.");
                return;
            }

            const transactionId = uuidv4();

            await db.transaction('rw', db.accounts, db.transactions, async () => {
                await db.transactions.add({
                    id: transactionId,
                    from_category_id: formData.from_category_id,
                    to_category_id: formData.to_category_id,
                    memo: formData.memo.trim(),
                    amount: calculatedAmountInCents, // positive amount, transfer logic uses from_category_id
                    date: formData.date
                });
            });

            showSnackbar("Transfer added");
            registerUndo("Add Transfer", async () => {
                await db.transactions.delete(transactionId);
            });

            onClose();
            // Reset form
            setFormData({
                from_category_id: '',
                to_category_id: '',
                memo: '',
                amount: '',
                percentage: '',
                date: ''
            });
        } catch (error) {
            console.error("Failed to save transfer", error);
            showSnackbar("Error: Failed to save transfer: " + error);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>Transfer Money</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <ToggleButtonGroup
                        color="primary"
                        value={inputType}
                        exclusive
                        onChange={handleInputTypeChange}
                        aria-label="Input Type"
                        fullWidth
                    >
                        <ToggleButton value="amount">Amount ($)</ToggleButton>
                        <ToggleButton value="percentage">Percentage (%)</ToggleButton>
                    </ToggleButtonGroup>

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

                    {inputType === 'amount' ? (
                        <MoneyField
                            label="Amount"
                            name="amount"
                            defaultValue={initialAmount}
                            onValueChange={handleAmountChange}
                            min={0}
                        />
                    ) : (
                        <PercentField
                            label="Percentage"
                            name="percentage"
                            defaultValue={initialPercentage}
                            onValueChange={handlePercentageChange}
                            min={0}
                            max={100}
                        />
                    )}

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
                <Button onClick={handleSubmit}>Save Transfer</Button>
            </DialogActions>
        </Dialog>
    );
}

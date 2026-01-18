'use client';

import * as React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type CategoryGroup, type Category } from '@/db/db';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Button,
    TextField
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import AddIcon from '@mui/icons-material/Add';
import { format } from 'date-fns';
import CategoryDialog from './CategoryDialog';
import { v4 as uuidv4 } from 'uuid';

export default function BudgetView() {
    const month = format(new Date(), 'yyyy-MM');
    const groups = useLiveQuery(() => db.categoryGroups.orderBy('order').toArray());

    // Dialog State
    const [dialogOpen, setDialogOpen] = React.useState(false);
    const [dialogType, setDialogType] = React.useState<'group' | 'category'>('group');
    const [dialogParentId, setDialogParentId] = React.useState<string | undefined>(undefined);

    const handleAddGroup = () => {
        setDialogType('group');
        setDialogParentId(undefined);
        setDialogOpen(true);
    };

    const handleAddCategory = (groupId: string) => {
        setDialogType('category');
        setDialogParentId(groupId);
        setDialogOpen(true);
    };

    // Calculate Ready to Assign
    const inflows = useLiveQuery(async () => {
        const txs = await db.transactions.filter(t => !t.category_id).toArray();
        return txs.reduce((acc, t) => acc + t.amount, 0);
    });

    const allBudgeted = useLiveQuery(async () => {
        const budgetedItems = await db.budgeted.where('month').equals(month).toArray();
        return budgetedItems.reduce((acc, b) => acc + b.amount, 0);
    });

    const readyToAssign = (inflows || 0) - (allBudgeted || 0);

    return (
        <Box sx={{ width: '100%', mt: 2 }}>
            <Paper elevation={1} sx={{ p: 2, mb: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                <Typography variant="h6" align="center">Ready to Assign</Typography>
                <Typography variant="h3" align="center" sx={{ fontWeight: 'bold' }}>
                    ${(readyToAssign / 100).toFixed(2)}
                </Typography>
            </Paper>

            <TableContainer component={Paper} elevation={0} variant="outlined">
                <Table aria-label="collapsible table">
                    <TableHead>
                        <TableRow>
                            <TableCell>CATEGORY</TableCell>
                            <TableCell align="right">ASSIGNED</TableCell>
                            <TableCell align="right">ACTIVITY</TableCell>
                            <TableCell align="right">AVAILABLE</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {groups?.map((group) => (
                            <GroupRow key={group.id} group={group} month={month} onAddCategory={handleAddCategory} />
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Button startIcon={<AddIcon />} sx={{ mt: 2 }} onClick={handleAddGroup}>
                Add Category Group
            </Button>

            <CategoryDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                type={dialogType}
                parentId={dialogParentId}
            />
        </Box>
    );
}

function BudgetInput({ categoryId, month, initialAmount }: { categoryId: string, month: string, initialAmount: number }) {
    const [amount, setAmount] = React.useState((initialAmount / 100).toFixed(2));

    const handleBlur = async () => {
        const cents = Math.round(parseFloat(amount) * 100);
        const existing = await db.budgeted.where({ category_id: categoryId, month }).first();
        if (existing) {
            await db.budgeted.update(existing.id, { amount: cents });
        } else {
            await db.budgeted.add({
                id: uuidv4(),
                category_id: categoryId,
                month,
                amount: cents
            });
        }
    };

    return (
        <TextField
            variant="standard"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    (e.target as HTMLInputElement).blur();
                }
            }}
            inputProps={{ style: { textAlign: 'right' } }}
            fullWidth
        />
    );
}

function CategoryRow({ category, month }: { category: Category; month: string }) {
    // Fetch transactions for this category in this month (Y-m)
    const activity = useLiveQuery(async () => {
        const txs = await db.transactions
            .where('category_id').equals(category.id)
            .filter(t => t.date.startsWith(month))
            .toArray();
        return txs.reduce((acc, t) => acc + t.amount, 0);
    }, [category.id, month]) || 0;

    const budgeted = useLiveQuery(() =>
        db.budgeted.where({ category_id: category.id, month }).first()
        , [category.id, month]);

    return (
        <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
            <TableCell component="th" scope="row" sx={{ pl: 4 }}>
                {category.name}
            </TableCell>
            <TableCell align="right" sx={{ width: 120 }}>
                <BudgetInput
                    categoryId={category.id}
                    month={month}
                    initialAmount={budgeted?.amount || 0}
                    key={budgeted?.amount} // Force re-render on external update
                />
            </TableCell>
            <TableCell align="right" sx={{ color: activity < 0 ? 'error.main' : 'inherit' }}>
                ${(activity / 100).toFixed(2)}
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                ${(((budgeted?.amount || 0) + activity) / 100).toFixed(2)}
            </TableCell>
        </TableRow>
    );
}

function GroupRow({ group, month, onAddCategory }: { group: CategoryGroup; month: string; onAddCategory: (groupId: string) => void }) {
    const [open, setOpen] = React.useState(true);
    const categories = useLiveQuery(() =>
        db.categories.where('group_id').equals(group.id).toArray()
    );

    if (!categories) return null;

    return (
        <React.Fragment>
            <TableRow sx={{ '& > *': { borderBottom: 'unset' }, bgcolor: 'action.hover' }}>
                <TableCell colSpan={4}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <IconButton
                                aria-label="expand row"
                                size="small"
                                onClick={() => setOpen(!open)}
                            >
                                {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                            </IconButton>
                            <Typography variant="subtitle1" component="div" sx={{ fontWeight: 'bold', ml: 1 }}>
                                {group.name}
                            </Typography>
                        </Box>
                        <IconButton size="small" onClick={() => onAddCategory(group.id)}>
                            <AddIcon fontSize="small" />
                        </IconButton>
                    </Box>
                </TableCell>
            </TableRow>
            {open && categories.map(cat => (
                <CategoryRow key={cat.id} category={cat} month={month} />
            ))}
        </React.Fragment>
    );
}

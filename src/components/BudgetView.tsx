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
    TextField,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Tooltip
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { format } from 'date-fns';
import CategoryDialog from './CategoryDialog';
import { v4 as uuidv4 } from 'uuid';
import { useSnackbar } from './AppSnackbar';
import ConfirmDialog from './ConfirmDialog';
import { useUndo } from './UndoProvider';

export default function BudgetView() {
    const periods = useLiveQuery(() => db.budgetPeriods.orderBy('start').reverse().toArray());
    const activePeriod = periods?.find(p => !p.end);

    // Default to active period if no selection
    const [selectedPeriodId, setSelectedPeriodId] = React.useState<string>('');

    React.useEffect(() => {
        if (activePeriod && !selectedPeriodId) {
            setSelectedPeriodId(activePeriod.id);
        }
    }, [activePeriod, selectedPeriodId]);

    const viewPeriod = periods?.find(p => p.id === selectedPeriodId);

    // Dialog State
    const [dialogOpen, setDialogOpen] = React.useState(false);
    const [dialogType, setDialogType] = React.useState<'group' | 'category'>('group');
    const [dialogParentId, setDialogParentId] = React.useState<string | undefined>(undefined);
    const [editItem, setEditItem] = React.useState<{ id: string, name: string } | undefined>(undefined);

    // Confirm Dialog State
    const [confirmOpen, setConfirmOpen] = React.useState(false);
    const [confirmConfig, setConfirmConfig] = React.useState({ title: '', content: '', action: () => { } });

    const { showSnackbar } = useSnackbar();
    const { registerUndo } = useUndo();

    const handleAddGroup = () => {
        setDialogType('group');
        setDialogParentId(undefined);
        setEditItem(undefined);
        setDialogOpen(true);
    };

    const handleAddCategory = (groupId: string) => {
        setDialogType('category');
        setDialogParentId(groupId);
        setEditItem(undefined);
        setDialogOpen(true);
    };

    const handleEdit = (type: 'group' | 'category', item: { id: string, name: string }, parentId?: string) => {
        setDialogType(type);
        setDialogParentId(parentId);
        setEditItem(item);
        setDialogOpen(true);
    };

    const handleDelete = (type: 'group' | 'category', item: any) => {
        setConfirmConfig({
            title: `Delete ${type === 'group' ? 'Group' : 'Category'}?`,
            content: `Delete "${item.name}"? This cannot be undone properly if transactions exist.`,
            action: async () => {
                if (type === 'group') {
                    await db.categoryGroups.delete(item.id);
                    registerUndo(`Delete Group ${item.name}`, async () => {
                        await db.categoryGroups.add(item);
                    });
                    showSnackbar("Group deleted");
                } else {
                    await db.categories.delete(item.id);
                    registerUndo(`Delete Category ${item.name}`, async () => {
                        await db.categories.add(item);
                    });
                    showSnackbar("Category deleted");
                }
            }
        });
        setConfirmOpen(true);
    };

    const handleCloseBudget = () => {
        if (!activePeriod) return;
        setConfirmConfig({
            title: "Close Budget Period?",
            content: "This will finalize the current budget, take a snapshot of all values, and start a new period. Unspent 'Available' funds will need to be re-assigned in the new period (or you can view them in history).",
            action: async () => {
                await db.transaction('rw', [db.budgetPeriods, db.budgetSnapshots, db.categories, db.budgeted, db.transactions], async () => {
                    const now = format(new Date(), 'yyyy-MM-dd');

                    // 1. Snapshot all categories
                    const allCategories = await db.categories.toArray();
                    for (const cat of allCategories) {
                        // Calculate metrics for this period
                        const budgetItem = await db.budgeted.where({ period_id: activePeriod.id, category_id: cat.id }).first();
                        const assigned = budgetItem?.amount || 0;

                        const txs = await db.transactions
                            .where('category_id').equals(cat.id)
                            .filter(t => t.date >= activePeriod.start) // Activity since start
                            .toArray();
                        const activity = txs.reduce((acc, t) => acc + t.amount, 0);

                        const available = assigned + activity;

                        await db.budgetSnapshots.add({
                            id: uuidv4(),
                            period_id: activePeriod.id,
                            category_id: cat.id,
                            assigned,
                            activity,
                            available
                        });
                    }

                    // 2. Close current period
                    await db.budgetPeriods.update(activePeriod.id, { end: now });

                    // 3. Start new period
                    const newPeriodId = uuidv4();
                    await db.budgetPeriods.add({
                        id: newPeriodId,
                        start: now,
                        end: null
                    });
                });
                showSnackbar("Budget Closed & New Period Started");
            }
        });
        setConfirmOpen(true);
    };

    const groups = useLiveQuery(() => db.categoryGroups.orderBy('order').toArray());

    // Calculate Ready to Assign (Only meaningful for Active Period logic, or snapshot?)
    // For History, we might need to snapshot RTA too, or just hide it.
    // For Active: RTA = Total Inflows (Uncategorized) - Total Budgeted (In Current Period)
    // Note: RTA should logically carry over?
    // User requested: "money only shows up in available"
    // Ideally, "Ready to Assign" is global.
    const readyToAssign = useLiveQuery(async () => {
        if (!viewPeriod) return 0;

        // Global RTA logic:
        // Total Income (Ever) - Total Budgeted (Ever, across all periods)
        // This is easiest to ensure money isn't lost between periods.
        const allInflows = await db.transactions.filter(t => !t.category_id).toArray();
        const totalIncome = allInflows.reduce((acc, t) => acc + t.amount, 0);

        const allBudgetedItems = await db.budgeted.toArray();
        const totalBudgeted = allBudgetedItems.reduce((acc, b) => acc + b.amount, 0);

        return totalIncome - totalBudgeted;
    }, [viewPeriod]);

    if (!viewPeriod) return <Box sx={{ p: 2 }}>No Budget Period Found. Please Seed Data.</Box>;
    const isHistory = !!viewPeriod.end;

    return (
        <Box sx={{ width: '100%', mt: 2 }}>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <TextField
                    select
                    label="Budget Period"
                    value={selectedPeriodId}
                    onChange={(e) => setSelectedPeriodId(e.target.value)}
                    size="small"
                    sx={{ width: 200 }}
                >
                    {periods?.map(p => (
                        <MenuItem key={p.id} value={p.id}>
                            {p.start} {p.end ? ` - ${p.end}` : '(Current)'}
                        </MenuItem>
                    ))}
                </TextField>

                {!isHistory && (
                    <Button variant="outlined" color="secondary" onClick={handleCloseBudget}>
                        Close Budget
                    </Button>
                )}
            </Box>

            <Paper elevation={1} sx={{ p: 2, mb: 2, bgcolor: isHistory ? 'grey.300' : 'primary.light', color: isHistory ? 'text.primary' : 'primary.contrastText' }}>
                <Typography variant="h6" align="center">{isHistory ? 'Historical RTA (Calculated)' : 'Ready to Assign'}</Typography>
                <Typography variant="h3" align="center" sx={{ fontWeight: 'bold' }}>
                    ${((readyToAssign || 0) / 100).toFixed(2)}
                </Typography>
            </Paper>

            <TableContainer component={Paper} elevation={0} variant="outlined">
                <Table aria-label="collapsible table">
                    <TableHead>
                        <TableRow>
                            <TableCell>CATEGORY</TableCell>
                            <TableCell align="right">ASSIGNED</TableCell>
                            <TableCell align="right">AVAILABLE</TableCell>
                            <TableCell padding="checkbox" />
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {groups?.map((group) => (
                            <GroupRow
                                key={group.id}
                                group={group}
                                period={viewPeriod}
                                isHistory={isHistory}
                                onAddCategory={handleAddCategory}
                                onEdit={(item) => handleEdit('group', item)}
                                onDelete={(item) => handleDelete('group', item)}
                                onEditCategory={(item, parentId) => handleEdit('category', item, parentId)}
                                onDeleteCategory={(item) => handleDelete('category', item)}
                            />
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {!isHistory && (
                <Button startIcon={<AddIcon />} sx={{ mt: 2 }} onClick={handleAddGroup}>
                    Add Category Group
                </Button>
            )}

            <CategoryDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                type={dialogType}
                parentId={dialogParentId}
                editItem={editItem}
            />

            <ConfirmDialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                title={confirmConfig.title}
                content={confirmConfig.content}
                onConfirm={confirmConfig.action}
                isDestructive={true}
            />
        </Box>
    );
}

function BudgetInput({ categoryId, periodId, initialAmount, disabled }: { categoryId: string, periodId: string, initialAmount: number, disabled: boolean }) {
    const [amount, setAmount] = React.useState((initialAmount / 100).toFixed(2));
    const { showSnackbar } = useSnackbar();
    const { registerUndo } = useUndo();

    // Reset local state if props change (e.g. switching periods)
    React.useEffect(() => {
        setAmount((initialAmount / 100).toFixed(2));
    }, [initialAmount, periodId]);

    const handleBlur = async () => {
        if (disabled) return;
        const cents = Math.round(parseFloat(amount) * 100);
        if (cents === initialAmount) return;

        const existing = await db.budgeted.where({ period_id: periodId, category_id: categoryId }).first();

        if (existing) {
            const previousAmount = existing.amount;
            await db.budgeted.update(existing.id, { amount: cents });
            registerUndo(`Budget Assign $${previousAmount / 100}`, async () => {
                await db.budgeted.update(existing.id, { amount: previousAmount });
            });
            showSnackbar("Budget assigned");
        } else {
            const newId = uuidv4();
            await db.budgeted.add({
                id: newId,
                period_id: periodId,
                category_id: categoryId,
                amount: cents
            });
            registerUndo("Budget Assignment", async () => {
                await db.budgeted.delete(newId);
            });
            showSnackbar("Budget assigned");
        }
    };

    return (
        <TextField
            variant="standard"
            type="number"
            value={amount}
            disabled={disabled}
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

function RowMenu({ onEdit, onDelete }: { onEdit: () => void, onDelete: () => void }) {
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => {
        setAnchorEl(null);
    };

    return (
        <>
            <IconButton size="small" onClick={handleClick}>
                <MoreVertIcon fontSize="small" />
            </IconButton>
            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
            >
                <MenuItem onClick={() => { handleClose(); onEdit(); }}>
                    <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Edit</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => { handleClose(); onDelete(); }}>
                    <ListItemIcon><DeleteIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Delete</ListItemText>
                </MenuItem>
            </Menu>
        </>
    );
}

function CategoryRow({ category, period, isHistory, onEdit, onDelete }: {
    category: Category;
    period: { id: string, start: string, end: string | null };
    isHistory: boolean;
    onEdit: (item: Category) => void;
    onDelete: (item: Category) => void;
}) {
    // If History: Fetch from Snapshots
    // If Active: Calculate Live

    const data = useLiveQuery(async () => {
        if (isHistory) {
            const snapshot = await db.budgetSnapshots.where({ period_id: period.id, category_id: category.id }).first();
            return {
                assigned: snapshot?.assigned || 0,
                available: snapshot?.available || 0,
                activity: snapshot?.activity || 0,
                txCount: 0 // Snapshots don't store tx count, or we'd need to fetch them
            };
        } else {
            // Active Logic
            const budgetItem = await db.budgeted.where({ period_id: period.id, category_id: category.id }).first();
            const startStr = period.start;

            // Fetch all transactions for this category to ensure we don't miss any due to filter issues
            // Then filter in memory (safer for small datasets and debugging)
            const allTxs = await db.transactions
                .where('category_id').equals(category.id)
                .toArray();

            const txs = allTxs.filter(t => t.date >= startStr);
            const activity = txs.reduce((acc, t) => acc + t.amount, 0);

            return {
                assigned: budgetItem?.amount || 0,
                available: (budgetItem?.amount || 0) + activity,
                activity,
                txCount: txs.length
            };
        }
    }, [category.id, period.id, isHistory]);

    return (
        <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
            <TableCell component="th" scope="row" sx={{ pl: 4 }}>
                {category.name}
            </TableCell>
            <TableCell align="right" sx={{ width: 120 }}>
                <BudgetInput
                    categoryId={category.id}
                    periodId={period.id}
                    initialAmount={data?.assigned || 0}
                    disabled={isHistory}
                    key={`${period.id}-${data?.assigned}`} // Force re-render on period switch
                />
            </TableCell>

            <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                <Tooltip title={`Assigned: $${((data?.assigned || 0) / 100).toFixed(2)}, Activity: $${((data?.activity || 0) / 100).toFixed(2)} (${data?.txCount || 0} txs)`}>
                    <span>${((data?.available || 0) / 100).toFixed(2)}</span>
                </Tooltip>
            </TableCell>
            <TableCell align="right" padding="none">
                <RowMenu onEdit={() => onEdit(category)} onDelete={() => onDelete(category)} />
            </TableCell>
        </TableRow>
    );
}

function GroupRow({ group, period, isHistory, onAddCategory, onEdit, onDelete, onEditCategory, onDeleteCategory }: {
    group: CategoryGroup;
    period: { id: string, start: string, end: string | null };
    isHistory: boolean;
    onAddCategory: (groupId: string) => void;
    onEdit: (item: CategoryGroup) => void;
    onDelete: (item: CategoryGroup) => void;
    onEditCategory: (item: Category, parentId: string) => void;
    onDeleteCategory: (item: Category) => void;
}) {
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
                        <Box>
                            {!isHistory && (
                                <IconButton size="small" onClick={() => onAddCategory(group.id)}>
                                    <AddIcon fontSize="small" />
                                </IconButton>
                            )}
                            <RowMenu onEdit={() => onEdit(group)} onDelete={() => onDelete(group)} />
                        </Box>
                    </Box>
                </TableCell>
                <TableCell />
            </TableRow>
            {open && categories.map(cat => (
                <CategoryRow
                    key={cat.id}
                    category={cat}
                    period={period}
                    isHistory={isHistory}
                    onEdit={(item) => onEditCategory(item, group.id)}
                    onDelete={onDeleteCategory}
                />
            ))}
        </React.Fragment>
    );
}

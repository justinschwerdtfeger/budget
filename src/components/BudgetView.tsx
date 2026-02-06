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
import NumberField from './NumberField';

export default function BudgetView() {
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

    const groups = useLiveQuery(() => db.categoryGroups.orderBy('order').toArray());

    const readyToAssign = useLiveQuery(async () => {
        // Global RTA logic:
        // Total Income (Ever) - Total Budgeted (Ever, across all periods)
        // This is easiest to ensure money isn't lost between periods.
        const allInflows = await db.transactions.filter(t => !t.category_id).toArray();
        const totalIncome = allInflows.reduce((acc, t) => acc + t.amount, 0);

        const allBudgetedItems = await db.budgeted.toArray();
        const totalBudgeted = allBudgetedItems.reduce((acc, b) => acc + b.amount, 0);

        return totalIncome - totalBudgeted;
    });

    return (
        <Box sx={{ width: '100%', mt: 2 }}>
            <Paper elevation={1} sx={{ p: 2, mb: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                <Typography variant="h6" align="center">Ready to Assign</Typography>
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

            <Button startIcon={<AddIcon />} sx={{ mt: 2 }} onClick={handleAddGroup}>
                Add Category Group
            </Button>

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

function BudgetInput({ categoryId, initialAmount }: { categoryId: string, initialAmount: number }) {
    const [amount, setAmount] = React.useState((initialAmount / 100).toFixed(2));
    const { showSnackbar } = useSnackbar();
    const { registerUndo } = useUndo();

    // Reset local state if props change (e.g. switching periods)
    React.useEffect(() => {
        setAmount((initialAmount / 100).toFixed(2));
    }, [initialAmount]);

    const handleBlur = async () => {
        const cents = Math.round(parseFloat(amount) * 100);
        if (cents === initialAmount) return;

        const existing = await db.budgeted.where({ category_id: categoryId }).first();

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
        <NumberField
            min={0}
            size="small"
            defaultValue={initialAmount / 100}
            onValueChange={(value) => {
                setAmount(value?.toFixed(2) ?? "");
            }}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    (e.target as HTMLInputElement).blur();
                }
            }}
            onBlur={handleBlur}
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

function CategoryRow({ category, onEdit, onDelete }: {
    category: Category;
    onEdit: (item: Category) => void;
    onDelete: (item: Category) => void;
}) {
    // If History: Fetch from Snapshots
    // If Active: Calculate Live

    const data = useLiveQuery(async () => {
            const budgetItem = await db.budgeted.where({ category_id: category.id }).first();

            // Fetch all transactions for this category to ensure we don't miss any due to filter issues
            // Then filter in memory (safer for small datasets and debugging)
            const txs = await db.transactions
                .where('category_id').equals(category.id)
                .toArray();

            const activity = txs.reduce((acc, t) => acc + t.amount, 0);

            return {
                assigned: budgetItem?.amount || 0,
                available: (budgetItem?.amount || 0) + activity,
                activity,
                txCount: txs.length
            };
    }, [category.id]);

    return (
        <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
            <TableCell component="th" scope="row" sx={{ pl: 4 }}>
                {category.name}
            </TableCell>
            <TableCell align="right" sx={{ width: 120 }}>
                <BudgetInput
                    categoryId={category.id}
                    initialAmount={data?.assigned || 0}
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

function GroupRow({ group, onAddCategory, onEdit, onDelete, onEditCategory, onDeleteCategory }: {
    group: CategoryGroup;
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
                            <IconButton size="small" onClick={() => onAddCategory(group.id)}>
                                <AddIcon fontSize="small" />
                            </IconButton>
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
                    onEdit={(item) => onEditCategory(item, group.id)}
                    onDelete={onDeleteCategory}
                />
            ))}
        </React.Fragment>
    );
}

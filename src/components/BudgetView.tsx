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
    Tooltip,
    Collapse
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
        const toRTA = await db.transactions.where('to_category_id').equals('rta').toArray();
        const fromRTA = await db.transactions.where('from_category_id').equals('rta').toArray();
        const rta = toRTA.reduce((acc, t) => acc + t.amount, 0) - fromRTA.reduce((acc, t) => acc + t.amount, 0);

        return rta;
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
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                            <TableCell sx={{ pl: 2 }}><Typography variant="subtitle1" fontWeight="bold">Category</Typography></TableCell>
                            <TableCell align="right"><Typography variant="subtitle1" fontWeight="bold">Available</Typography></TableCell>
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
    const data = useLiveQuery(async () => {
        const toTransactions = await db.transactions
            .where({ to_category_id: category.id })
            .toArray();

        const fromTransactions = await db.transactions
            .where({ from_category_id: category.id })
            .toArray();

        const activity = toTransactions.reduce((acc, t) => acc + t.amount, 0) - fromTransactions.reduce((acc, t) => acc + t.amount, 0);

        return {
            available: activity,
            activity,
            transactionCount: toTransactions.length + fromTransactions.length
        };
    }, [category.id]);

    return (
        <TableRow>
            <TableCell scope="row" sx={{ pl: 2 }}>
                {category.name}
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                <Tooltip title={`Activity: $${((data?.activity || 0) / 100).toFixed(2)} (${data?.transactionCount || 0} transaction${data?.transactionCount === 1 ? '' : 's'})`}>
                    <span>${((data?.available || 0) / 100).toFixed(2)}</span>
                </Tooltip>
            </TableCell>
            <TableCell align="center" padding="none" sx={{ width: '48px' }}>
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
            <TableRow sx={{ bgcolor: 'action.hover', height: '48px' }}>
                <TableCell colSpan={3} padding="none" sx={{ px: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
            </TableRow>
            <TableRow>
                <TableCell padding="none" colSpan={3}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Table aria-label="categories">
                            <TableBody>
                                {categories.map(cat => (
                                    <CategoryRow
                                        key={cat.id}
                                        category={cat}
                                        onEdit={(item) => onEditCategory(item, group.id)}
                                        onDelete={onDeleteCategory}
                                    />
                                ))}
                            </TableBody>
                        </Table>
                    </Collapse>
                </TableCell>
            </TableRow>

        </React.Fragment>
    );
}

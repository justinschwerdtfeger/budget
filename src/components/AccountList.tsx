'use client';

import * as React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Account } from '@/db/db';
import {
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Paper,
    Typography,
    Box,
    Button,
    IconButton,
    Menu,
    MenuItem
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

import AddAccountDialog from './AddAccountDialog';
import { useSnackbar } from './AppSnackbar';
import ConfirmDialog from './ConfirmDialog';

export default function AccountList() {
    const accounts = useLiveQuery(() => db.accounts.toArray());
    const [openAddAccount, setOpenAddAccount] = React.useState(false);
    const [editAccount, setEditAccount] = React.useState<Account | undefined>(undefined);

    // Confirm Dialog State
    const [confirmOpen, setConfirmOpen] = React.useState(false);
    const [confirmConfig, setConfirmConfig] = React.useState({ title: '', content: '', action: () => { } });

    const { showSnackbar } = useSnackbar();

    const handleAdd = () => {
        setEditAccount(undefined);
        setOpenAddAccount(true);
    };

    const handleEdit = (account: Account) => {
        setEditAccount(account);
        setOpenAddAccount(true);
    };

    const handleDelete = (account: Account) => {
        setConfirmConfig({
            title: `Delete ${account.name}?`,
            content: "Delete this account? Transactions will stick around but be orphaned (for now).",
            action: async () => {
                await db.accounts.delete(account.id);
                showSnackbar("Account deleted");
            }
        });
        setConfirmOpen(true);
    };

    return (
        <Paper elevation={0} variant="outlined" sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" component="div">
                    Budget
                </Typography>
                <Button startIcon={<AddIcon />} size="small" onClick={handleAdd}>
                    Add Acct
                </Button>
            </Box>
            <List component="nav" aria-label="main mailbox folders">
                {accounts?.map((account) => (
                    <AccountItem
                        key={account.id}
                        account={account}
                        onEdit={() => handleEdit(account)}
                        onDelete={() => handleDelete(account)}
                    />
                ))}
            </List>
            <AddAccountDialog
                open={openAddAccount}
                onClose={() => setOpenAddAccount(false)}
                editAccount={editAccount}
            />
            <ConfirmDialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                title={confirmConfig.title}
                content={confirmConfig.content}
                onConfirm={confirmConfig.action}
                isDestructive={true}
            />
        </Paper>
    );
}

function AccountItem({ account, onEdit, onDelete }: { account: any, onEdit: () => void, onDelete: () => void }) {
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    // Calculate Target Balance: Sum of Available amounts for all categories linked to this account
    // Available = Budgeted + Activity
    // Note: We need to sum across ALL time or just current month?
    // User requirement: "amount in the account should be the amount of money the user *should* put in each account to follow the budget"
    // This implies a cumulative total of all category balances.
    const targetBalance = useLiveQuery(async () => {
        const categories = await db.categories.where('account_id').equals(account.id).toArray();
        let total = 0;

        for (const cat of categories) {
            // Get all budget assignments
            const budgetItems = await db.budgeted.where({ category_id: cat.id }).toArray();
            const budgetedTotal = budgetItems.reduce((acc, b) => acc + b.amount, 0);

            // Get all activity (transactions)
            const txs = await db.transactions
                .where('category_id').equals(cat.id)
                .toArray();
            const activityTotal = txs.reduce((acc, t) => acc + t.amount, 0);

            // Available = Budgeted + Activity
            // (If Activity is negative, it subtracts. If positive (refund), it adds.)
            total += (budgetedTotal + activityTotal);
        }
        return total;
    }, [account.id]) || 0;

    const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        setAnchorEl(event.currentTarget);
    };

    const handleClose = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setAnchorEl(null);
    };

    return (
        <ListItem
            disablePadding
            secondaryAction={
                <IconButton edge="end" aria-label="options" onClick={handleMenuClick}>
                    <MoreVertIcon fontSize="small" />
                </IconButton>
            }
        >
            <ListItemButton>
                <ListItemIcon>
                    <AccountBalanceWalletIcon />
                </ListItemIcon>
                <ListItemText
                    primary={account.name}
                    secondary={account.type}
                />
                <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
                    ${(targetBalance / 100).toFixed(2)}
                </Typography>
            </ListItemButton>

            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={(e: any) => handleClose(e)}
            >
                <MenuItem onClick={(e) => { handleClose(e); onEdit(); }}>
                    <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Edit</ListItemText>
                </MenuItem>
                <MenuItem onClick={(e) => { handleClose(e); onDelete(); }}>
                    <ListItemIcon><DeleteIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Delete</ListItemText>
                </MenuItem>
            </Menu>
        </ListItem>
    );
}

'use client';

import * as React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import {
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Paper,
    Typography,
    Box,
    Button
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AddIcon from '@mui/icons-material/Add';

import AddAccountDialog from './AddAccountDialog';

export default function AccountList() {
    const accounts = useLiveQuery(() => db.accounts.toArray());
    const [openAddAccount, setOpenAddAccount] = React.useState(false);

    return (
        <Paper elevation={0} variant="outlined" sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" component="div">
                    Budget
                </Typography>
                <Button startIcon={<AddIcon />} size="small" onClick={() => setOpenAddAccount(true)}>
                    Add Acct
                </Button>
            </Box>
            <List component="nav" aria-label="main mailbox folders">
                {accounts?.map((account) => (
                    <ListItem key={account.id} disablePadding>
                        <ListItemButton>
                            <ListItemIcon>
                                <AccountBalanceWalletIcon />
                            </ListItemIcon>
                            <ListItemText
                                primary={account.name}
                                secondary={account.type}
                            />
                            <Typography variant="body2" color="text.secondary">
                                ${(account.balance / 100).toFixed(2)}
                            </Typography>
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>
            <AddAccountDialog open={openAddAccount} onClose={() => setOpenAddAccount(false)} />
        </Paper>
    );
}

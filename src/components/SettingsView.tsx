'use client';

import * as React from 'react';
import { Box, List, ListItem, ListItemIcon, ListItemText, ListItemSecondaryAction, Button, Typography, Divider } from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import ModeSwitch from './ModeSwitch';
import { db } from '@/db/db';
import { useSnackbar } from '@/components/AppSnackbar';
import ConfirmDialog from './ConfirmDialog';

export default function SettingsView() {
    const { showSnackbar } = useSnackbar();
    const [confirmOpen, setConfirmOpen] = React.useState(false);

    const handleReset = () => {
        setConfirmOpen(true);
    };

    const performReset = async () => {
        try {
            await db.transaction('rw', [db.categoryGroups, db.categories, db.accounts, db.transactions], async () => {
                await db.categoryGroups.clear();
                await db.categories.clear();
                await db.accounts.clear();
                await db.transactions.clear();
            });
            showSnackbar("Reset Successful");
            setTimeout(() => window.location.reload(), 1000);
        } catch (e) {
            console.error("Reset Failed", e);
            showSnackbar("Reset Failed: " + e);
        }
    };

    return (
        <Box sx={{ width: '100%' }}>
            <List>
                <ListItem>
                    <ListItemIcon>
                        <DarkModeIcon />
                    </ListItemIcon>
                    <ListItemText primary="Dark Mode" />
                    <ModeSwitch />
                </ListItem>
                <Divider />
                <ListItem>
                    <ListItemIcon>
                        <DeleteForeverIcon color="error" />
                    </ListItemIcon>
                    <ListItemText
                        primary="Reset Data"
                        secondary="This will delete all data permanently."
                        primaryTypographyProps={{ color: 'error' }}
                    />
                    <Button color="error" variant="outlined" size="medium" onClick={handleReset}>
                        Reset
                    </Button>
                </ListItem>
            </List>

            <ConfirmDialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                title="Reset Data?"
                content="Are you sure? This will delete all data permanently."
                onConfirm={performReset}
                isDestructive={true}
            />
        </Box>
    );
}

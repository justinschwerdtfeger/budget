'use client';

import * as React from 'react';
import Snackbar from '@mui/material/Snackbar';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';

interface SnackbarContextType {
    showSnackbar: (message: string) => void;
}

const SnackbarContext = React.createContext<SnackbarContextType | undefined>(undefined);

export function useSnackbar() {
    const context = React.useContext(SnackbarContext);
    if (!context) {
        throw new Error('useSnackbar must be used within a SnackbarProvider');
    }
    return context;
}

export function SnackbarProvider({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = React.useState(false);
    const [message, setMessage] = React.useState('');

    const showSnackbar = (msg: string) => {
        setMessage(msg);
        setOpen(true);
    };

    const handleClose = (event: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') {
            return;
        }
        setOpen(false);
    };

    const action = (
        <React.Fragment>
            <IconButton
                size="small"
                aria-label="close"
                color="inherit"
                onClick={handleClose}
            >
                <CloseIcon fontSize="small" />
            </IconButton>
        </React.Fragment>
    );

    return (
        <SnackbarContext.Provider value={{ showSnackbar }}>
            {children}
            <Snackbar
                open={open}
                autoHideDuration={6000}
                onClose={handleClose}
                message={message}
                action={action}
            />
        </SnackbarContext.Provider>
    );
}

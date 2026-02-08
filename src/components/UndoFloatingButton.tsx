'use client';

import * as React from 'react';
import { Fab, Tooltip, Zoom } from '@mui/material';
import UndoIcon from '@mui/icons-material/Undo';
import { useUndo } from './UndoProvider';

export default function UndoFloatingButton({ isMobile }: { isMobile: boolean }) {
    const { undoAction, undoDescription, performUndo } = useUndo();

    return (
        <Zoom in={!!undoAction}>
            <Tooltip title={`Undo ${undoDescription || 'Action'}`}>
                <Fab
                    variant="extended"
                    color="secondary"
                    aria-label="undo"
                    onClick={performUndo}
                    sx={{
                        position: 'fixed',
                        bottom: isMobile ? 72 : 32,
                        left: 32,
                        zIndex: 2000 // Ensure it's above other elements
                    }}
                >
                    <UndoIcon sx={{ mr: 1 }} />
                    Undo
                </Fab>
            </Tooltip>
        </Zoom>
    );
}

'use client';

import * as React from 'react';
import {
    Button,
    TextField,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    MenuItem,
    Stack
} from '@mui/material';
import { db } from '@/db/db';
import { v4 as uuidv4 } from 'uuid';

interface CategoryDialogProps {
    open: boolean;
    onClose: () => void;
    type: 'group' | 'category';
    parentId?: string; // If category, needs group_id
}

export default function CategoryDialog({ open, onClose, type, parentId }: CategoryDialogProps) {
    const [name, setName] = React.useState('');

    const handleSubmit = async () => {
        console.log("CategoryDialog submit", { name, type, parentId });
        if (!name) return;

        try {
            if (type === 'group') {
                await db.categoryGroups.add({
                    id: uuidv4(),
                    name,
                    order: 99 // simplistic order
                });
            } else if (type === 'category' && parentId) {
                await db.categories.add({
                    id: uuidv4(),
                    group_id: parentId,
                    name,
                    order: 99
                });
            }
            console.log("Category saved");
            setName('');
            onClose();
        } catch (error) {
            console.error("Failed to save category", error);
            alert("Error saving category: " + error);
        }
    };

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Add {type === 'group' ? 'Category Group' : 'Category'}</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    margin="dense"
                    label="Name"
                    fullWidth
                    variant="standard"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSubmit}>Save</Button>
            </DialogActions>
        </Dialog>
    );
}

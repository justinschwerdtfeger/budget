import * as React from 'react';
import {
    Button,
    TextField,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
} from '@mui/material';
import { db } from '@/db/db';
import { v4 as uuidv4 } from 'uuid';
import { useSnackbar } from './AppSnackbar';
import { useUndo } from './UndoProvider';

interface CategoryDialogProps {
    open: boolean;
    onClose: () => void;
    type: 'group' | 'category';
    parentId?: string; // If category, needs group_id
    editItem?: { id: string, name: string }; // If editing
}

export default function CategoryDialog({ open, onClose, type, parentId, editItem }: CategoryDialogProps) {
    const [name, setName] = React.useState('');
    const { showSnackbar } = useSnackbar();
    const { registerUndo } = useUndo();

    React.useEffect(() => {
        if (open && editItem) {
            setName(editItem.name);
        } else {
            setName('');
        }
    }, [open, editItem]);

    const handleSubmit = async () => {
        console.log("CategoryDialog submit", { name, type, parentId, editItem });
        if (!name) return;

        try {
            if (editItem) {
                const prevName = editItem.name;
                if (type === 'group') {
                    await db.categoryGroups.update(editItem.id, { name });
                    registerUndo(`Rename Group ${prevName}`, async () => {
                        await db.categoryGroups.update(editItem.id, { name: prevName });
                    });
                    showSnackbar("Group renamed");
                } else {
                    await db.categories.update(editItem.id, { name });
                    registerUndo(`Rename Category ${prevName}`, async () => {
                        await db.categories.update(editItem.id, { name: prevName });
                    });
                    showSnackbar("Category renamed");
                }
            } else {
                const newId = uuidv4();
                if (type === 'group') {
                    const newItem = {
                        id: newId,
                        name,
                        order: 99 // simplistic order
                    };
                    await db.categoryGroups.add(newItem);
                    registerUndo(`Add Group ${name}`, async () => {
                        await db.categoryGroups.delete(newId);
                    });
                    showSnackbar("Group added");
                } else if (type === 'category' && parentId) {
                    const newItem = {
                        id: newId,
                        group_id: parentId,
                        name,
                        order: 99
                    };
                    await db.categories.add(newItem);
                    registerUndo(`Add Category ${name}`, async () => {
                        await db.categories.delete(newId);
                    });
                    showSnackbar("Category added");
                }
            }
            console.log("Saved successfully");
            setName('');
            onClose();
        } catch (error) {
            console.error("Failed to save", error);
            alert("Error saving: " + error);
        }
    };

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>{editItem ? 'Edit' : 'Add'} {type === 'group' ? 'Category Group' : 'Category'}</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    margin="dense"
                    label="Name"
                    fullWidth
                    variant="standard"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSubmit();
                        }
                    }}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSubmit}>Save</Button>
            </DialogActions>
        </Dialog>
    );
}

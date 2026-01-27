import * as React from 'react';
import {
    Button,
    TextField,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    MenuItem,
    Stack
} from '@mui/material';
import { db } from '@/db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';
import { useSnackbar } from './AppSnackbar';
import { useUndo } from './UndoProvider';

interface CategoryDialogProps {
    open: boolean;
    onClose: () => void;
    type: 'group' | 'category';
    parentId?: string; // If category, needs group_id
    editItem?: { id: string, name: string, account_id?: string }; // If editing
}

export default function CategoryDialog({ open, onClose, type, parentId, editItem }: CategoryDialogProps) {
    const [name, setName] = React.useState('');
    const [accountId, setAccountId] = React.useState('');
    const { showSnackbar } = useSnackbar();
    const { registerUndo } = useUndo();

    const accounts = useLiveQuery(() => db.accounts.toArray());

    React.useEffect(() => {
        if (open && editItem) {
            setName(editItem.name);
            setAccountId(editItem.account_id || '');
        } else {
            setName('');
            // If only one account exists, default to it
            if (open && accounts && accounts.length === 1) {
                setAccountId(accounts[0].id);
            } else {
                setAccountId('');
            }
        }
    }, [open, editItem, accounts]);

    const handleSubmit = async () => {
        console.log("CategoryDialog submit", { name, type, parentId, editItem, accountId });
        if (!name) return;
        if (type === 'category' && !accountId) {
            alert("Please select an account for this category.");
            return;
        }

        try {
            if (editItem) {
                const prevName = editItem.name;
                const prevAccount = editItem.account_id;

                if (type === 'group') {
                    await db.categoryGroups.update(editItem.id, { name });
                    registerUndo(`Rename Group ${prevName}`, async () => {
                        await db.categoryGroups.update(editItem.id, { name: prevName });
                    });
                    showSnackbar("Group renamed");
                } else {
                    await db.categories.update(editItem.id, { name, account_id: accountId });
                    registerUndo(`Edit Category ${prevName}`, async () => {
                        await db.categories.update(editItem.id, { name: prevName, account_id: prevAccount });
                    });
                    showSnackbar("Category updated");
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
                        account_id: accountId,
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
            setAccountId('');
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
                <Stack spacing={2} sx={{ mt: 1, minWidth: 300 }}>
                    <TextField
                        autoFocus
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
                    {type === 'category' && (
                        <TextField
                            select
                            label="Linked Account"
                            value={accountId}
                            onChange={(e) => setAccountId(e.target.value)}
                            fullWidth
                            variant="standard"
                            helperText="Funds for this category will come from this account."
                        >
                            {accounts?.map((account) => (
                                <MenuItem key={account.id} value={account.id}>
                                    {account.name}
                                </MenuItem>
                            ))}
                        </TextField>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSubmit}>Save</Button>
            </DialogActions>
        </Dialog>
    );
}

'use client';

import * as React from 'react';

interface UndoContextType {
    undoAction: (() => Promise<void>) | null;
    undoDescription: string | null;
    registerUndo: (description: string, action: () => Promise<void>) => void;
    performUndo: () => Promise<void>;
    clearUndo: () => void;
}

const UndoContext = React.createContext<UndoContextType | undefined>(undefined);

export function useUndo() {
    const context = React.useContext(UndoContext);
    if (!context) {
        throw new Error('useUndo must be used within an UndoProvider');
    }
    return context;
}

export function UndoProvider({ children }: { children: React.ReactNode }) {
    const [undoAction, setUndoAction] = React.useState<(() => Promise<void>) | null>(null);
    const [undoDescription, setUndoDescription] = React.useState<string | null>(null);

    const registerUndo = (description: string, action: () => Promise<void>) => {
        setUndoAction(() => action);
        setUndoDescription(description);
    };

    const performUndo = async () => {
        if (undoAction) {
            await undoAction();
            setUndoAction(null);
            setUndoDescription(null);
        }
    };

    const clearUndo = () => {
        setUndoAction(null);
        setUndoDescription(null);
    };

    return (
        <UndoContext.Provider value={{ undoAction, undoDescription, registerUndo, performUndo, clearUndo }}>
            {children}
        </UndoContext.Provider>
    );
}

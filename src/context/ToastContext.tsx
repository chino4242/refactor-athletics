"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { haptic } from '@/utils/haptics';

export type ToastType = 'success' | 'error' | 'info' | 'xp';

export interface Toast {
    id: string;
    message: string;
    type: ToastType;
    onUndo?: () => void;
}

interface ToastContextType {
    toasts: Toast[];
    addToast: (message: string, type: ToastType) => void;
    removeToast: (id: string) => void;
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
    xp: (message: string, onUndo?: () => void) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const addToast = useCallback((message: string, type: ToastType, onUndo?: () => void) => {
        const id = uuidv4();
        setToasts((prev) => [...prev, { id, message, type, onUndo }]);

        setTimeout(() => {
            removeToast(id);
        }, onUndo ? 5000 : 3000);
    }, [removeToast]);

    const success = (message: string) => addToast(message, 'success');
    const error = (message: string) => addToast(message, 'error');
    const info = (message: string) => addToast(message, 'info');
    const xp = (message: string, onUndo?: () => void) => { haptic('light'); addToast(message, 'xp', onUndo); };

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, info, xp }}>
            {children}
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

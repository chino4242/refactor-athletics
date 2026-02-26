"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { useToast, type ToastType } from '@/context/ToastContext';
import { CheckCircle, XCircle, Info, Trophy } from 'lucide-react';

const ToastIcon = ({ type }: { type: ToastType }) => {
    switch (type) {
        case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
        case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
        case 'xp': return <Trophy className="w-5 h-5 text-yellow-500" />;
        default: return <Info className="w-5 h-5 text-orange-500" />;
    }
};

const ToastMessage = ({ id, message, type }: { id: string; message: string; type: ToastType }) => {
    const { removeToast } = useToast();

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={`
        pointer-events-auto
        flex items-center gap-3 p-4 rounded-xl shadow-2xl backdrop-blur-md border border-white/10
        min-w-[300px] max-w-sm
        ${type === 'xp' ? 'bg-zinc-900/90 shadow-yellow-500/10' : 'bg-zinc-900/90'}
      `}
        >
            <div className={`p-2 rounded-full bg-zinc-800/50 ${type === 'xp' ? 'bg-yellow-500/10' : ''}`}>
                <ToastIcon type={type} />
            </div>

            <div className="flex-1">
                <p className={`text-sm font-bold ${type === 'xp' ? 'text-yellow-500' : 'text-white'}`}>
                    {type === 'xp' ? 'XP GAINED' : type.toUpperCase()}
                </p>
                <p className="text-sm text-zinc-400 font-medium">{message}</p>
            </div>

            <button
                onClick={() => removeToast(id)}
                className="text-zinc-600 hover:text-white transition-colors"
            >
                <XCircle className="w-4 h-4" />
            </button>
        </motion.div>
    );
};

export default function ToastContainer() {
    const { toasts } = useToast();

    return (
        <div className="fixed bottom-24 left-0 right-0 md:bottom-8 md:right-8 md:left-auto md:w-auto z-[100] flex flex-col items-center md:items-end gap-2 p-4 pointer-events-none">
            <AnimatePresence mode='popLayout'>
                {toasts.map((toast) => (
                    <ToastMessage key={toast.id} {...toast} />
                ))}
            </AnimatePresence>
        </div>
    );
}

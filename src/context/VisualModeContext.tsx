"use client";

import { createContext, useContext, useState, useRef, type ReactNode, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

type VisualMode = 'vibrant' | 'retro';

interface VisualModeContextType {
    mode: VisualMode;
    setMode: (mode: VisualMode) => void;
    isVibrant: boolean;
}

const VisualModeContext = createContext<VisualModeContextType | undefined>(undefined);

export function VisualModeProvider({ children }: { children: ReactNode }) {
    const [mode, setMode] = useState<VisualMode>('vibrant');
    const hydrated = useRef(false);

    useEffect(() => {
        const saved = localStorage.getItem('visual_mode');
        if (saved === 'vibrant' || saved === 'retro') {
            setMode(saved);
            hydrated.current = true;
            return;
        }

        // No localStorage value — fetch from database
        const supabase = createClient();
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) { hydrated.current = true; return; }
            supabase.from('users').select('visual_mode').eq('id', user.id).single()
                .then(({ data }) => {
                    const dbMode = data?.visual_mode;
                    if (dbMode === 'vibrant' || dbMode === 'retro') {
                        setMode(dbMode);
                        localStorage.setItem('visual_mode', dbMode);
                    }
                    hydrated.current = true;
                });
        });
    }, []);

    const handleSetMode = (newMode: VisualMode) => {
        setMode(newMode);
        localStorage.setItem('visual_mode', newMode);
    };

    return (
        <VisualModeContext.Provider value={{ mode, setMode: handleSetMode, isVibrant: mode === 'vibrant' }}>
            {children}
        </VisualModeContext.Provider>
    );
}

export function useVisualMode() {
    const context = useContext(VisualModeContext);
    if (context === undefined) {
        throw new Error('useVisualMode must be used within a VisualModeProvider');
    }
    return context;
}

"use client";

import { createContext, useContext, useState, useRef, type ReactNode, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

type ExperienceMode = 'rpg' | 'classic';

interface ExperienceModeContextType {
    mode: ExperienceMode;
    setMode: (mode: ExperienceMode) => void;
    isClassic: boolean;
}

const ExperienceModeContext = createContext<ExperienceModeContextType | undefined>(undefined);

export function ExperienceModeProvider({ children }: { children: ReactNode }) {
    const [mode, setMode] = useState<ExperienceMode>('rpg');
    const hydrated = useRef(false);

    useEffect(() => {
        const saved = localStorage.getItem('experience_mode');
        if (saved === 'rpg' || saved === 'classic') {
            setMode(saved);
            hydrated.current = true;
            return;
        }

        // No localStorage value — fetch from database
        const supabase = createClient();
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) { hydrated.current = true; return; }
            supabase.from('users').select('experience_mode').eq('id', user.id).single()
                .then(({ data }) => {
                    const dbMode = data?.experience_mode;
                    if (dbMode === 'rpg' || dbMode === 'classic') {
                        setMode(dbMode);
                        localStorage.setItem('experience_mode', dbMode);
                    }
                    hydrated.current = true;
                });
        });
    }, []);

    // Only persist to localStorage after initial hydration, on user-driven changes
    const handleSetMode = (newMode: ExperienceMode) => {
        setMode(newMode);
        localStorage.setItem('experience_mode', newMode);
    };

    return (
        <ExperienceModeContext.Provider value={{ mode, setMode: handleSetMode, isClassic: mode === 'classic' }}>
            {children}
        </ExperienceModeContext.Provider>
    );
}

export function useExperienceMode() {
    const context = useContext(ExperienceModeContext);
    if (context === undefined) {
        throw new Error('useExperienceMode must be used within an ExperienceModeProvider');
    }
    return context;
}

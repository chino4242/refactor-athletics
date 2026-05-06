"use client";

import { createContext, useContext, useState, type ReactNode, useEffect, useMemo } from 'react';
import { THEMES, type Theme } from '@/data/themes';

interface ThemeContextType {
    currentTheme: string;
    setCurrentTheme: (theme: string) => void;
    theme: Theme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children, initialTheme }: { children: ReactNode; initialTheme?: string }) {
    const [currentTheme, setCurrentTheme] = useState<string>(() => {
        if (initialTheme) return initialTheme;
        if (typeof window !== 'undefined') return localStorage.getItem('pg_theme') || 'athlete';
        return 'athlete';
    });

    // Sync localStorage as cache when theme changes
    useEffect(() => {
        localStorage.setItem('pg_theme', currentTheme);
        document.documentElement.setAttribute('data-theme', currentTheme);
    }, [currentTheme]);

    // If server provides a new initialTheme (e.g., after profile load), update
    useEffect(() => {
        if (initialTheme && initialTheme !== currentTheme) {
            setCurrentTheme(initialTheme);
        }
    }, [initialTheme]);

    const theme = useMemo(() => THEMES[currentTheme] || THEMES.athlete, [currentTheme]);

    return (
        <ThemeContext.Provider value={{ currentTheme, setCurrentTheme, theme: theme || THEMES.athlete }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}

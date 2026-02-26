"use client";

import { createContext, useContext, useState, type ReactNode, useEffect } from 'react';

interface ThemeContextType {
    currentTheme: string;
    setCurrentTheme: (theme: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [currentTheme, setCurrentTheme] = useState<string>('athlete');

    useEffect(() => {
        const savedTheme = localStorage.getItem('pg_theme') || 'athlete';
        setCurrentTheme(savedTheme);
    }, []);

    useEffect(() => {
        localStorage.setItem('pg_theme', currentTheme);
        document.documentElement.setAttribute('data-theme', currentTheme);
    }, [currentTheme]);

    return (
        <ThemeContext.Provider value={{ currentTheme, setCurrentTheme }}>
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

'use client';

import React from 'react';
import { ThemeToggle } from "./ThemeToggle";
import { Navbar } from "./Navbar";
import { GlobalVisibilityToggle } from "./GlobalVisibilityToggle";

interface ShellProps {
    children: React.ReactNode;
}

export const Shell = ({ children }: ShellProps) => {
    return (
        <div className="h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50 font-sans transition-colors duration-300 flex flex-col overflow-hidden">
            <header className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm sticky top-0 z-50">
                <div className="flex items-center gap-8">
                    <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">Wozny v2</h1>
                    <Navbar />
                </div>
                <div className="flex items-center gap-2">
                    <GlobalVisibilityToggle />
                    <ThemeToggle />
                </div>
            </header>

            <main className="flex-1 flex flex-col overflow-hidden relative">
                {children}
            </main>
        </div>
    );
};

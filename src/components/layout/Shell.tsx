'use client';

import React from 'react';
import { useWoznyStore } from '@/lib/store/useWoznyStore';
import clsx from 'clsx';

interface ShellProps {
    children: React.ReactNode;
}

export const Shell = ({ children }: ShellProps) => {
    // We will add the Sidebar/Tab navigation here later
    return (
        <div className="min-h-screen bg-neutral-900 text-neutral-100 font-sans">
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                {children}
            </main>
        </div>
    );
};

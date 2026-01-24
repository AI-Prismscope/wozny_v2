'use client';

import React, { useEffect } from 'react';
import { useWoznyStore } from '@/lib/store/useWoznyStore';
import { Loader2 } from 'lucide-react';

export const AnalysisView = () => {
    const setActiveTab = useWoznyStore((state) => state.setActiveTab);

    useEffect(() => {
        // Analysis is now instant on upload. 
        // If we land here, just redirect to Report.
        setActiveTab('report');
    }, [setActiveTab]);

    return (
        <div className="flex flex-col items-center justify-center h-full text-neutral-500">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
            <p>Finalizing Results...</p>
        </div>
    );
};

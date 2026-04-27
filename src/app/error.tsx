'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        console.error('App error:', error);
    }, [error]);

    return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
            <div className="text-center space-y-4 max-w-sm">
                <div className="text-5xl">⚠️</div>
                <h2 className="text-xl font-bold text-white">Something went wrong</h2>
                <p className="text-sm text-zinc-400">
                    {error.message || 'An unexpected error occurred.'}
                </p>
                <button
                    onClick={reset}
                    className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition-colors"
                >
                    Try Again
                </button>
            </div>
        </div>
    );
}

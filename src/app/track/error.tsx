'use client';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
    return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-6">
            <div className="text-4xl mb-3">⚠️</div>
            <h2 className="text-lg font-bold text-white mb-2">Something went wrong</h2>
            <p className="text-sm text-zinc-500 mb-4 max-w-xs">{error.message || 'An unexpected error occurred.'}</p>
            <button onClick={reset} className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold uppercase tracking-wider rounded-xl transition">
                Try Again
            </button>
        </div>
    );
}

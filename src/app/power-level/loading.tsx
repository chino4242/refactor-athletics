export default function Loading() {
    return (
        <div className="min-h-screen bg-black text-white w-full">
            <main className="max-w-lg mx-auto px-4 py-6 pb-32 space-y-6 animate-pulse">
                <div className="h-4 w-24 bg-zinc-800 rounded" />
                <div className="rounded-2xl border border-zinc-800 overflow-hidden bg-zinc-900 h-80" />
                <div className="h-4 w-32 bg-zinc-800 rounded" />
                <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-24 bg-zinc-900 rounded-xl border border-zinc-800" />
                    ))}
                </div>
                <div className="h-4 w-28 bg-zinc-800 rounded" />
                <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-16 bg-zinc-900 rounded-xl border border-zinc-800" />
                    ))}
                </div>
            </main>
        </div>
    );
}

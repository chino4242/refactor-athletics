export default function DashboardSkeleton() {
    return (
        <div className="min-h-screen bg-black pb-24">
            {/* Header Skeleton */}
            <div className="relative">
                {/* Banner placeholder */}
                <div className="h-48 bg-zinc-900 animate-pulse" />
                
                {/* Header Content */}
                <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border-b border-zinc-800 p-6">
                    <div className="max-w-6xl mx-auto">
                        {/* Power Level */}
                        <div className="mb-4">
                            <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse mb-2" />
                            <div className="h-10 w-32 bg-zinc-800 rounded animate-pulse" />
                        </div>

                        {/* Player Level & XP */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <div className="h-4 w-16 bg-zinc-800 rounded animate-pulse" />
                                <div className="h-3 w-20 bg-zinc-800 rounded animate-pulse" />
                            </div>
                            <div className="w-full bg-zinc-800 rounded-full h-2 animate-pulse" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs Skeleton */}
            <div className="border-b border-zinc-800 bg-zinc-950">
                <div className="flex gap-4 px-4 max-w-6xl mx-auto">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-12 w-24 bg-zinc-800 rounded-t animate-pulse" />
                    ))}
                </div>
            </div>

            {/* Content Skeleton */}
            <div className="max-w-6xl mx-auto p-4 space-y-4">
                {/* Card 1 */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <div className="h-5 w-32 bg-zinc-800 rounded animate-pulse mb-3" />
                    <div className="space-y-2">
                        <div className="h-16 bg-zinc-800 rounded animate-pulse" />
                        <div className="h-16 bg-zinc-800 rounded animate-pulse" />
                    </div>
                </div>

                {/* Card 2 */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <div className="h-5 w-40 bg-zinc-800 rounded animate-pulse mb-3" />
                    <div className="h-20 bg-zinc-800 rounded animate-pulse" />
                </div>

                {/* Card 3 */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <div className="h-5 w-36 bg-zinc-800 rounded animate-pulse mb-3" />
                    <div className="space-y-2">
                        <div className="h-12 bg-zinc-800 rounded animate-pulse" />
                        <div className="h-12 bg-zinc-800 rounded animate-pulse" />
                        <div className="h-12 bg-zinc-800 rounded animate-pulse" />
                    </div>
                </div>
            </div>
        </div>
    );
}

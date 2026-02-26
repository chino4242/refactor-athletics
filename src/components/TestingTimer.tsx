import { useMemo } from 'react';
import Link from 'next/link';
import { Calendar, ArrowRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { THEMES } from '../data/themes';

interface TestingTimerProps {
    variant?: 'card' | 'overlay';
}

export default function TestingTimer({ variant = 'card' }: TestingTimerProps) {
    const { currentTheme } = useTheme();

    // Gradient for testing week highlight
    const gradient = THEMES[currentTheme]?.progressGradient || "from-orange-500 to-red-600";


    const daysUntilTest = useMemo(() => {
        const today = new Date();

        // Helper to find last full week of a given month
        const getLastFullWeekMonday = (date: Date) => {
            const year = date.getFullYear();
            const month = date.getMonth();
            const lastDayOfMonth = new Date(year, month + 1, 0);

            // Find the Sunday of the last full week
            // It must be <= lastDayOfMonth
            // And the Monday before it (6 days prior) must be >= firstDayOfMonth

            // Start from end of month and backpedal to find a Sunday
            let current = new Date(lastDayOfMonth);
            while (current.getDay() !== 0) { // 0 is Sunday
                current.setDate(current.getDate() - 1);
            }

            // current is the last Sunday of the month (possibly incomplete week if we don't check Monday)
            // The Monday of this week is 6 days prior.
            const monday = new Date(current);
            monday.setDate(monday.getDate() - 6);

            // Check if this Monday is in the same month
            if (monday.getMonth() !== month) {
                // If the "last Sunday's" week started in the previous month, 
                // then it wasn't a "full week" of THIS month.
                // We need the week before that.
                monday.setDate(monday.getDate() - 7);
            }

            return monday;
        };

        let targetDate = getLastFullWeekMonday(today);

        // If we are already past the start of testing week, target NEXT month
        // We consider "testing week" to start on that Monday.
        if (today.getTime() > targetDate.getTime()) {
            // Check if we are currently IN the testing week (i.e. strictly less than 7 days past)
            const diffTime = Math.abs(today.getTime() - targetDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < 7) {
                return 0; // It IS testing week!
            }

            // Otherwise, get next month's target
            const nextMonth = new Date(today);
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            targetDate = getLastFullWeekMonday(nextMonth);
        }

        const diffTime = Math.abs(targetDate.getTime() - today.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }, []);

    if (daysUntilTest === 0) {
        // Active Testing Week State
        if (variant === 'overlay') {
            return (
                <Link href="/rank" className="absolute bottom-4 right-4 z-20 animate-pulse">
                    <div className={`bg-gradient-to-r ${gradient} p-0.5 rounded-lg shadow-lg`}>
                        <div className="bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-[6px] flex items-center gap-2">
                            <div className="text-sm">🔥</div>
                            <div className="flex flex-col items-end">
                                <span className="text-xs font-bold uppercase text-white leading-none">Testing Week</span>
                                <span className="text-xs text-zinc-300 leading-none">Log your Ranks</span>
                            </div>
                        </div>
                    </div>
                </Link>
            )
        }

        return (
            <Link href="/rank" className="block w-full animate-pulse mb-6">
                <div className={`bg-gradient-to-r ${gradient} p-0.5 rounded-xl`}>
                    <div className="bg-zinc-950 rounded-[10px] p-4 flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-red-900/50 flex items-center justify-center text-xl">
                                🔥
                            </div>
                            <div>
                                <h3 className="font-black italic uppercase text-white tracking-wider">It is Testing Week!</h3>
                                <p className="text-xs text-zinc-400 font-medium">Test your mettle. Update your Ranks.</p>
                            </div>
                        </div>
                        <ArrowRight className="text-zinc-600 group-hover:text-white transition-colors" />
                    </div>
                </div>
            </Link>
        )
    }

    if (variant === 'overlay') {
        return (
            <Link href="/rank" className="absolute bottom-4 right-4 z-20 group">
                <div className="bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 rounded-lg px-3 py-2 flex items-center gap-3 transition-all">
                    <div className="flex flex-col items-end">
                        <span className="text-xs uppercase text-zinc-400 font-bold leading-none mb-0.5 group-hover:text-white transition-colors">Until Testing</span>
                        <span className="text-xs font-black text-white leading-none">{daysUntilTest} Days</span>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                        <Calendar size={12} className="text-white" />
                    </div>
                </div>
            </Link>
        );
    }

    return (
        <Link href="/rank" className="block w-full group mb-6 transition-transform hover:scale-[1.01]">
            <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between overflow-hidden">
                {/* Background Progress Hint (optional) */}
                <div className="flex items-center gap-4 z-10">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                        <Calendar size={20} className="text-zinc-500 group-hover:text-white transition-colors" />
                    </div>
                    <div>
                        <h3 className="font-bold uppercase text-zinc-300 group-hover:text-white transition-colors tracking-wide text-sm">
                            Countdown to Testing
                        </h3>
                        <p className="text-xs text-zinc-500">
                            <span className="text-white font-black text-sm">{daysUntilTest} Days</span> until testing your mettle
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold uppercase text-zinc-600 group-hover:text-white transition-colors z-10">
                    Prepare
                    <ArrowRight size={14} />
                </div>
            </div>
        </Link>
    );
}

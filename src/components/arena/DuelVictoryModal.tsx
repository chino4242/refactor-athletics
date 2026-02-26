import { X, Trophy, Skull } from 'lucide-react';
import Confetti from 'react-confetti';
import { type DuelResponse } from '../../services/api';

interface Props {
    duel: DuelResponse | null;
    currentUserId: string;
    onClose: () => void;
}

export default function DuelVictoryModal({ duel, currentUserId, onClose }: Props) {
    if (!duel) return null;

    const isWinner = duel.winner_id === currentUserId;
    const isDraw = duel.winner_id === 'DRAW';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in text-center p-6">
            {isWinner && <Confetti recycle={false} numberOfPieces={500} />}

            <div className="w-full max-w-lg relative">
                <button
                    onClick={onClose}
                    className="absolute -top-12 right-0 text-white/50 hover:text-white"
                >
                    <X size={32} />
                </button>

                {isWinner ? (
                    <div className="animate-scale-in">
                        <div className="w-32 h-32 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_50px_rgba(234,179,8,0.5)]">
                            <Trophy size={64} className="text-black drop-shadow-md" strokeWidth={3} />
                        </div>
                        <h1 className="text-6xl md:text-8xl font-black italic text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 mb-4 transform -rotate-2">
                            VICTORY
                        </h1>
                        <p className="text-zinc-300 text-lg uppercase tracking-widest font-bold">
                            You crushed your opponent.
                        </p>
                        <div className="mt-8 text-4xl font-mono font-black text-white">
                            +250 XP
                        </div>
                        <p className="text-yellow-500/50 text-xs mt-2 uppercase tracking-wide">Victory Bonus Awarded</p>
                    </div>
                ) : isDraw ? (
                    <div>
                        <h1 className="text-6xl font-black italic text-zinc-500 mb-4">DRAW</h1>
                    </div>
                ) : (
                    <div className="grayscale opacity-80">
                        <div className="w-24 h-24 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-8">
                            <Skull size={48} className="text-zinc-500" />
                        </div>
                        <h1 className="text-6xl font-black italic text-red-900 mb-4">DEFEATED</h1>
                        <p className="text-zinc-500 text-lg uppercase tracking-widest font-bold">
                            Better luck next time.
                        </p>
                    </div>
                )}

            </div>
        </div>
    );
}

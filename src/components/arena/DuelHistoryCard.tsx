import { type DuelResponse } from '../../services/api';
import { Trophy, XCircle, Ban, Calendar } from 'lucide-react';

interface Props {
    duel: DuelResponse;
    currentUserId: string;
}

export default function DuelHistoryCard({ duel, currentUserId }: Props) {
    const isChallenger = duel.challenger_id === currentUserId;
    const opponentName = isChallenger ? (duel.opponent_id || 'Unknown') : duel.challenger_id;

    const myScore = isChallenger ? duel.challenger_score : duel.opponent_score;
    const theirScore = isChallenger ? duel.opponent_score : duel.challenger_score;

    const startDate = new Date(duel.start_at * 1000).toLocaleDateString();

    // Status Logic
    let statusColor = "text-zinc-500";
    let StatusIcon = Calendar;
    let displayStatus: string = duel.status;

    if (duel.status === 'CANCELLED') {
        displayStatus = "Cancelled";
        StatusIcon = Ban;
        statusColor = "text-zinc-500";
    } else if (duel.status === 'COMPLETED') {
        if (duel.winner_id === currentUserId) {
            displayStatus = "VICTORY";
            StatusIcon = Trophy;
            statusColor = "text-yellow-500";
        } else if (duel.winner_id === 'DRAW') {
            displayStatus = "DRAW";
            StatusIcon = Trophy; // Or handshake?
            statusColor = "text-zinc-400";
        } else {
            displayStatus = "DEFEAT";
            StatusIcon = XCircle;
            statusColor = "text-red-500";
        }
    }

    return (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex items-center justify-between opacity-80 hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-zinc-800 ${statusColor}`}>
                    <StatusIcon size={18} />
                </div>
                <div>
                    <h3 className={`font-black uppercase tracking-wider text-sm ${statusColor}`}>{displayStatus}</h3>
                    <p className="text-zinc-500 text-xs">vs {opponentName}</p>
                </div>
            </div>

            <div className="text-right">
                <div className="text-xs text-zinc-600 font-mono mb-1">{startDate}</div>
                {(duel.status === 'COMPLETED') && (
                    <div className="text-sm font-bold text-zinc-300">
                        {myScore} - {theirScore}
                    </div>
                )}
            </div>
        </div>
    );
}

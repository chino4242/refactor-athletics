'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

interface WaiverModalProps {
    userId: string;
}

export default function WaiverModal({ userId }: WaiverModalProps) {
    const router = useRouter();
    const [accepted, setAccepted] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleAccept = async () => {
        setLoading(true);
        const supabase = createClient();
        
        await supabase
            .from('users')
            .update({ waiver_accepted_at: new Date().toISOString() })
            .eq('id', userId);
        
        router.refresh();
    };

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 rounded-lg max-w-md w-full p-6">
                <h2 className="text-2xl font-bold text-white mb-4">Liability Waiver</h2>
                
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 max-h-64 overflow-y-auto text-sm text-zinc-300 space-y-3 mb-4">
                    <p className="font-semibold text-white">ASSUMPTION OF RISK AND WAIVER OF LIABILITY</p>
                    <p>
                        By using Refactor Athletics, I acknowledge that physical exercise involves inherent risks including, 
                        but not limited to, muscle strains, sprains, fractures, cardiovascular stress, and in rare cases, 
                        serious injury or death.
                    </p>
                    <p>
                        I understand that Refactor Athletics is a fitness tracking application and does not provide medical 
                        advice, supervision, or personalized training programs. I am solely responsible for determining my 
                        fitness level and consulting with a healthcare provider before beginning any exercise program.
                    </p>
                    <p>
                        I voluntarily assume all risks associated with using this application and participating in physical 
                        activities tracked through it. I agree to release, waive, discharge, and hold harmless Refactor 
                        Athletics, its owners, developers, and affiliates from any and all liability for injuries or damages 
                        resulting from my use of this application.
                    </p>
                    <p className="text-xs text-zinc-400 pt-2">
                        Last updated: March 13, 2026
                    </p>
                </div>

                <label className="flex items-start gap-3 cursor-pointer mb-6">
                    <input
                        type="checkbox"
                        checked={accepted}
                        onChange={e => setAccepted(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-orange-500 focus:ring-orange-500"
                    />
                    <span className="text-sm text-zinc-300">
                        I have read and agree to the terms of this waiver. I understand the risks involved in physical exercise 
                        and assume full responsibility for my participation.
                    </span>
                </label>

                <button
                    onClick={handleAccept}
                    disabled={!accepted || loading}
                    className="w-full px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Accepting...' : 'Accept and Continue'}
                </button>
            </div>
        </div>
    );
}

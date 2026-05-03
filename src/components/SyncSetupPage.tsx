"use client";

import { useState } from 'react';
import { ChevronLeft, Smartphone, Copy, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SyncSetupPage() {
    const router = useRouter();
    const [tab, setTab] = useState<'ios' | 'android'>('ios');
    const [copied, setCopied] = useState('');

    const copyText = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopied(label);
        setTimeout(() => setCopied(''), 2000);
    };

    const apiUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/sync` : '/api/sync';
    const tabClass = (t: string) =>
        `flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition ${tab === t ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`;

    return (
        <div className="min-h-screen bg-black text-white p-4 md:p-8 max-w-2xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => router.back()} className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition">
                    <ChevronLeft size={20} />
                </button>
                <div className="flex items-center gap-3">
                    <Smartphone size={24} className="text-blue-400" />
                    <h1 className="text-xl font-black uppercase tracking-widest">Health Sync</h1>
                </div>
            </div>

            <p className="text-zinc-400 text-sm mb-6">
                Auto-sync steps, sleep, and calories burned from your phone — no manual entry.
            </p>

            {/* Platform tabs */}
            <div className="flex gap-1 bg-zinc-900 rounded-xl p-1 mb-6">
                <button onClick={() => setTab('ios')} className={tabClass('ios')}> iOS</button>
                <button onClick={() => setTab('android')} className={tabClass('android')}> Android</button>
            </div>

            {tab === 'ios' ? (
                <div className="space-y-4">
                    <Step num={1} title="Copy your sync token">
                        <p>Go to <strong className="text-white">Settings → Health Sync</strong> and copy your token. If you don&apos;t have one yet, tap <strong className="text-white">Enable Health Sync</strong> first.</p>
                    </Step>

                    <Step num={2} title="Install the Shortcut">
                        <p className="mb-3">Tap the button below to add the pre-built Shortcut to your iPhone. It reads your steps, sleep, and active calories from Apple Health.</p>
                        <a
                            href="https://www.icloud.com/shortcuts/PLACEHOLDER"
                            target="_blank"
                            rel="noopener"
                            className="block w-full text-center py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-wider text-sm rounded-xl transition"
                        >
                            Install Apple Shortcut
                        </a>
                        <p className="text-zinc-600 text-[10px] mt-2 text-center">Opens in the Shortcuts app</p>
                    </Step>

                    <Step num={3} title="Paste your token">
                        <p>When the Shortcut opens, it will ask for your sync token. Paste the token you copied in Step 1.</p>
                    </Step>

                    <Step num={4} title="Set it to run automatically">
                        <ol className="list-decimal list-inside space-y-1.5 text-zinc-300">
                            <li>Open <strong className="text-white">Shortcuts</strong> → <strong className="text-white">Automation</strong> tab</li>
                            <li>Tap <strong className="text-white">+</strong> → <strong className="text-white">Time of Day</strong> → set to <strong className="text-white">9:00 PM</strong></li>
                            <li>Choose <strong className="text-white">&quot;Sync Health to Refactor&quot;</strong></li>
                            <li>Turn on <strong className="text-white">Run Immediately</strong></li>
                        </ol>
                        <p className="text-zinc-500 text-xs mt-2">That&apos;s it — your health data will sync every night automatically.</p>
                    </Step>
                </div>
            ) : (
                <div className="space-y-4">
                    <Step num={1} title="Copy your sync token">
                        <p>Go to <strong className="text-white">Settings → Health Sync</strong> and copy your token. If you don&apos;t have one yet, tap <strong className="text-white">Enable Health Sync</strong> first.</p>
                    </Step>

                    <Step num={2} title="Install HTTP Shortcuts">
                        <p className="mb-3">This free app lets you send health data to Refactor with one tap.</p>
                        <a
                            href="https://play.google.com/store/apps/details?id=ch.rmy.android.http_shortcuts"
                            target="_blank"
                            rel="noopener"
                            className="block w-full text-center py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-wider text-sm rounded-xl transition"
                        >
                            Get HTTP Shortcuts
                        </a>
                    </Step>

                    <Step num={3} title="Import the pre-built shortcut">
                        <p className="mb-3">Tap below to download the shortcut config, then import it in the HTTP Shortcuts app.</p>
                        <a
                            href="/sync/http-shortcuts-export.json"
                            download
                            className="block w-full text-center py-3 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-white font-bold uppercase tracking-wider text-sm rounded-xl transition"
                        >
                            Download Shortcut Config
                        </a>
                    </Step>

                    <Step num={4} title="Paste your token & edit values">
                        <p>Open the imported shortcut, replace <code className="text-yellow-400 bg-zinc-900 px-1 rounded">YOUR_TOKEN</code> with your sync token. Before each sync, update the step/sleep/calorie values from Google Fit or your fitness tracker.</p>
                    </Step>

                    <Step num={5} title="Add a home screen widget">
                        <p>Long-press your home screen → Widgets → HTTP Shortcuts. One tap to sync.</p>
                    </Step>
                </div>
            )}

            {/* Manual / Advanced */}
            <details className="mt-8">
                <summary className="text-zinc-600 text-xs font-bold uppercase tracking-wider cursor-pointer hover:text-zinc-400 transition">
                    Advanced: Manual API Setup
                </summary>
                <div className="mt-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
                    <p className="text-zinc-400 text-xs">Send a POST request to sync data:</p>
                    <div className="space-y-2">
                        <Row label="URL" value={apiUrl} copyLabel="url" onCopy={copyText} copied={copied} />
                        <Row label="Header" value="Authorization: Bearer YOUR_TOKEN" />
                        <Row label="Body" value='[{"type":"steps","value":10000},{"type":"sleep","value":7.5}]' copyLabel="body" onCopy={copyText} copied={copied} />
                    </div>
                    <p className="text-zinc-500 text-[10px]">Types: steps, sleep, calories_burned, weight, day_strain, water</p>
                </div>
            </details>
        </div>
    );
}

function Step({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                    <span className="text-xs font-black text-white">{num}</span>
                </div>
                <h3 className="text-sm font-black uppercase tracking-widest text-white">{title}</h3>
            </div>
            <div className="text-zinc-400 text-sm ml-10">{children}</div>
        </div>
    );
}

function Row({ label, value, copyLabel, onCopy, copied }: { label: string; value: string; copyLabel?: string; onCopy?: (t: string, l: string) => void; copied?: string }) {
    return (
        <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500 uppercase font-bold w-12 shrink-0">{label}</span>
            <code className="flex-1 text-xs text-zinc-300 bg-zinc-950 px-2 py-1 rounded truncate">{value}</code>
            {copyLabel && onCopy && (
                <button onClick={() => onCopy(value, copyLabel)} className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 transition shrink-0">
                    {copied === copyLabel ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} className="text-zinc-400" />}
                </button>
            )}
        </div>
    );
}

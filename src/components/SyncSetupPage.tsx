"use client";

import { useState } from 'react';
import { ChevronLeft, Smartphone, Copy, Check, ExternalLink } from 'lucide-react';
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

    const CopyButton = ({ text, label }: { text: string; label: string }) => (
        <button
            onClick={() => copyText(text, label)}
            className="ml-2 p-1 rounded bg-zinc-800 hover:bg-zinc-700 transition shrink-0"
        >
            {copied === label ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} className="text-zinc-400" />}
        </button>
    );

    const apiUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/sync` : '/api/sync';

    const tabClass = (t: string) =>
        `flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition ${tab === t ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`;

    return (
        <div className="min-h-screen bg-black text-white p-4 md:p-8 max-w-2xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => router.back()} className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition">
                    <ChevronLeft size={20} />
                </button>
                <div className="flex items-center gap-3">
                    <Smartphone size={24} className="text-blue-400" />
                    <h1 className="text-xl font-black uppercase tracking-widest">Health Sync Setup</h1>
                </div>
            </div>

            <p className="text-zinc-400 text-sm mb-6">
                Auto-sync steps, sleep, calories burned, and weight from your phone to Refactor Athletics.
            </p>

            {/* Platform tabs */}
            <div className="flex gap-1 bg-zinc-900 rounded-xl p-1 mb-6">
                <button onClick={() => setTab('ios')} className={tabClass('ios')}> Apple / iOS</button>
                <button onClick={() => setTab('android')} className={tabClass('android')}> Android</button>
            </div>

            {tab === 'ios' ? (
                <div className="space-y-6">
                    <Section title="Step 1: Get Your Sync Token">
                        <p>Go to <strong>Settings → Health Sync</strong> and tap <strong>Enable Health Sync</strong>. Copy the token.</p>
                    </Section>

                    <Section title="Step 2: Create the Shortcut">
                        <ol className="list-decimal list-inside space-y-3 text-sm text-zinc-300">
                            <li>Open the <strong>Shortcuts</strong> app on your iPhone</li>
                            <li>Tap <strong>+</strong> to create a new Shortcut</li>
                            <li>Name it <strong>&quot;Sync Health to Refactor&quot;</strong></li>
                        </ol>
                    </Section>

                    <Section title="Step 3: Add Health Data Actions">
                        <p className="text-sm text-zinc-400 mb-3">Add these actions in order:</p>
                        <ol className="list-decimal list-inside space-y-3 text-sm text-zinc-300">
                            <li>
                                <strong>Find Health Samples</strong> → Type: <code className="text-emerald-400">Steps</code>, Period: <code className="text-emerald-400">Today</code>
                            </li>
                            <li>
                                <strong>Find Health Samples</strong> → Type: <code className="text-emerald-400">Sleep Analysis</code>, Period: <code className="text-emerald-400">Today</code>
                            </li>
                            <li>
                                <strong>Find Health Samples</strong> → Type: <code className="text-emerald-400">Active Energy</code>, Period: <code className="text-emerald-400">Today</code>
                            </li>
                        </ol>
                    </Section>

                    <Section title="Step 4: Add the API Call">
                        <p className="text-sm text-zinc-400 mb-3">Add a <strong>Get Contents of URL</strong> action:</p>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-zinc-500 w-16 shrink-0">URL:</span>
                                <code className="flex-1 text-xs text-blue-400 bg-zinc-950 px-2 py-1 rounded truncate">{apiUrl}</code>
                                <CopyButton text={apiUrl} label="url" />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-zinc-500 w-16 shrink-0">Method:</span>
                                <code className="text-xs text-emerald-400">POST</code>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-zinc-500 w-16 shrink-0">Headers:</span>
                                <code className="text-xs text-yellow-400">Authorization: Bearer YOUR_TOKEN</code>
                            </div>
                        </div>
                        <p className="text-sm text-zinc-400 mt-3">Set the body to <strong>JSON</strong> with this structure:</p>
                        <CodeBlock text={`[
  { "type": "steps", "value": [Steps Total] },
  { "type": "sleep", "value": [Sleep Hours] },
  { "type": "calories_burned", "value": [Active Energy] }
]`} label="json" onCopy={copyText} copied={copied} />
                        <p className="text-xs text-zinc-500 mt-2">Replace the bracketed values with the Shortcut variables from Step 3.</p>
                    </Section>

                    <Section title="Step 5: Automate It">
                        <ol className="list-decimal list-inside space-y-2 text-sm text-zinc-300">
                            <li>Go to the <strong>Automation</strong> tab in Shortcuts</li>
                            <li>Tap <strong>+</strong> → <strong>Time of Day</strong></li>
                            <li>Set to run at <strong>9:00 PM</strong> daily</li>
                            <li>Select your <strong>&quot;Sync Health to Refactor&quot;</strong> shortcut</li>
                            <li>Toggle <strong>Run Immediately</strong> (no confirmation)</li>
                        </ol>
                    </Section>
                </div>
            ) : (
                <div className="space-y-6">
                    <Section title="Step 1: Get Your Sync Token">
                        <p>Go to <strong>Settings → Health Sync</strong> and tap <strong>Enable Health Sync</strong>. Copy the token.</p>
                    </Section>

                    <Section title="Option A: HTTP Shortcuts App (Easiest)">
                        <ol className="list-decimal list-inside space-y-3 text-sm text-zinc-300">
                            <li>
                                Install <a href="https://play.google.com/store/apps/details?id=ch.rmy.android.http_shortcuts" target="_blank" rel="noopener" className="text-blue-400 underline">HTTP Shortcuts <ExternalLink size={10} className="inline" /></a>
                            </li>
                            <li>Create a new shortcut with these settings:</li>
                        </ol>
                        <div className="mt-3 space-y-2 ml-6">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-zinc-500 w-16 shrink-0">URL:</span>
                                <code className="flex-1 text-xs text-blue-400 bg-zinc-950 px-2 py-1 rounded truncate">{apiUrl}</code>
                                <CopyButton text={apiUrl} label="url2" />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-zinc-500 w-16 shrink-0">Method:</span>
                                <code className="text-xs text-emerald-400">POST</code>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-zinc-500 w-16 shrink-0">Header:</span>
                                <code className="text-xs text-yellow-400">Authorization: Bearer YOUR_TOKEN</code>
                            </div>
                        </div>
                        <p className="text-sm text-zinc-400 mt-3">Set body to JSON. Enter your values manually or use variables:</p>
                        <CodeBlock text={`[
  { "type": "steps", "value": 8500 },
  { "type": "sleep", "value": 7.5 },
  { "type": "calories_burned", "value": 450 }
]`} label="json2" onCopy={copyText} copied={copied} />
                        <ol start={3} className="list-decimal list-inside space-y-2 text-sm text-zinc-300 mt-3">
                            <li>Add a home screen widget for one-tap sync</li>
                        </ol>
                    </Section>

                    <Section title="Option B: Tasker (Advanced)">
                        <ol className="list-decimal list-inside space-y-2 text-sm text-zinc-300">
                            <li>Install <a href="https://play.google.com/store/apps/details?id=net.dinglisch.android.taskerm" target="_blank" rel="noopener" className="text-blue-400 underline">Tasker <ExternalLink size={10} className="inline" /></a> and <a href="https://play.google.com/store/apps/details?id=com.joaomgcd.autoinput" target="_blank" rel="noopener" className="text-blue-400 underline">Health Connect plugin</a></li>
                            <li>Create a Task that reads Health Connect data</li>
                            <li>Add an HTTP Request action pointing to the sync URL</li>
                            <li>Create a Profile to trigger daily at 9 PM</li>
                        </ol>
                    </Section>
                </div>
            )}

            {/* Test section */}
            <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <h3 className="text-sm font-black uppercase tracking-widest mb-3">Test Your Setup</h3>
                <p className="text-zinc-400 text-xs mb-3">Run this in your terminal to verify:</p>
                <CodeBlock text={`curl -X POST ${apiUrl} \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '[{"type":"steps","value":10000}]'`} label="curl" onCopy={copyText} copied={copied} />
                <p className="text-zinc-500 text-xs mt-2">You should see <code className="text-emerald-400">{`{"synced":[{"type":"steps","status":"ok"}]}`}</code></p>
            </div>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <h3 className="text-sm font-black uppercase tracking-widest text-zinc-300 mb-3">{title}</h3>
            <div className="text-zinc-400 text-sm">{children}</div>
        </div>
    );
}

function CodeBlock({ text, label, onCopy, copied }: { text: string; label: string; onCopy: (t: string, l: string) => void; copied: string }) {
    return (
        <div className="relative mt-2">
            <pre className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-300 font-mono overflow-x-auto whitespace-pre-wrap">{text}</pre>
            <button
                onClick={() => onCopy(text, label)}
                className="absolute top-2 right-2 p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 transition"
            >
                {copied === label ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} className="text-zinc-400" />}
            </button>
        </div>
    );
}

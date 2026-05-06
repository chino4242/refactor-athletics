export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-black text-white p-6 max-w-2xl mx-auto">
            <h1 className="text-2xl font-black uppercase tracking-tight mb-6">Privacy Policy</h1>
            <p className="text-xs text-zinc-500 mb-6">Last updated: May 5, 2026</p>

            <div className="space-y-6 text-sm text-zinc-300 leading-relaxed">
                <section>
                    <h2 className="text-white font-bold mb-2">What We Collect</h2>
                    <p>Refactor Athletics collects the following data to provide our fitness tracking service:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-zinc-400">
                        <li>Account information (email address)</li>
                        <li>Profile data (age, sex, bodyweight — used for performance benchmarks)</li>
                        <li>Workout logs, nutrition logs, and habit tracking data</li>
                        <li>Health data from connected services (WHOOP, Apple Health, Health Connect) — only with your explicit permission</li>
                        <li>Body measurements (weight, body composition) — only if you choose to log them</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-white font-bold mb-2">How We Use Your Data</h2>
                    <ul className="list-disc list-inside space-y-1 text-zinc-400">
                        <li>Calculate your fitness ranks and power level</li>
                        <li>Track progress over time (XP, streaks, body composition)</li>
                        <li>Enable group challenges and social features</li>
                        <li>Sync health data from connected wearables</li>
                    </ul>
                    <p className="mt-2">We do not sell your data to third parties. We do not use your data for advertising.</p>
                </section>

                <section>
                    <h2 className="text-white font-bold mb-2">Health Data</h2>
                    <p>Health data from Apple Health, Health Connect, or WHOOP is used solely to populate your fitness dashboard. We do not share health data with any third party. You can disconnect integrations at any time in Settings.</p>
                </section>

                <section>
                    <h2 className="text-white font-bold mb-2">Data Storage</h2>
                    <p>Your data is stored securely on Supabase (PostgreSQL) with row-level security enabled. All data is transmitted over HTTPS. We do not store payment information — subscriptions are handled by Apple/Google through RevenueCat.</p>
                </section>

                <section>
                    <h2 className="text-white font-bold mb-2">Data Deletion</h2>
                    <p>You can delete your account and all associated data at any time from Settings. Upon deletion, all workout logs, habits, nutrition data, body measurements, and health sync tokens are permanently removed.</p>
                </section>

                <section>
                    <h2 className="text-white font-bold mb-2">Contact</h2>
                    <p>Questions about this policy? Contact us at <a href="mailto:ryanj.contino@gmail.com" className="text-orange-400 hover:text-orange-300">ryanj.contino@gmail.com</a></p>
                </section>
            </div>
        </div>
    );
}

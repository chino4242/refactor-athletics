export default function TermsPage() {
    return (
        <div className="min-h-screen bg-black text-white p-6 max-w-2xl mx-auto">
            <h1 className="text-2xl font-black uppercase tracking-tight mb-6">Terms of Service</h1>
            <p className="text-xs text-zinc-500 mb-6">Last updated: May 5, 2026</p>

            <div className="space-y-6 text-sm text-zinc-300 leading-relaxed">
                <section>
                    <h2 className="text-white font-bold mb-2">Acceptance</h2>
                    <p>By using Refactor Athletics, you agree to these terms. If you do not agree, do not use the app.</p>
                </section>

                <section>
                    <h2 className="text-white font-bold mb-2">The Service</h2>
                    <p>Refactor Athletics is a fitness tracking and gamification platform. We provide tools to log workouts, track habits, monitor body composition, and compete with others. We are not a medical service and do not provide health advice.</p>
                </section>

                <section>
                    <h2 className="text-white font-bold mb-2">Your Account</h2>
                    <ul className="list-disc list-inside space-y-1 text-zinc-400">
                        <li>You are responsible for maintaining the security of your account</li>
                        <li>You must provide accurate information</li>
                        <li>You may not use the service for illegal purposes</li>
                        <li>You may delete your account at any time</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-white font-bold mb-2">Subscriptions</h2>
                    <p>Some features require a paid subscription. Subscriptions are billed through Apple App Store or Google Play Store. You can cancel at any time through your device&apos;s subscription settings. Refunds are handled by Apple/Google per their policies.</p>
                </section>

                <section>
                    <h2 className="text-white font-bold mb-2">Assumption of Risk</h2>
                    <p>Physical exercise involves inherent risks. You acknowledge that you participate in physical activities at your own risk. Refactor Athletics is not responsible for injuries resulting from exercises tracked or suggested through the app. Consult a healthcare provider before beginning any exercise program.</p>
                </section>

                <section>
                    <h2 className="text-white font-bold mb-2">Content & Data</h2>
                    <ul className="list-disc list-inside space-y-1 text-zinc-400">
                        <li>You retain ownership of your data</li>
                        <li>We may use anonymized, aggregated data to improve the service</li>
                        <li>You grant us permission to store and process your data to provide the service</li>
                        <li>We may terminate accounts that violate these terms</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-white font-bold mb-2">Limitation of Liability</h2>
                    <p>Refactor Athletics is provided &quot;as is&quot; without warranty. We are not liable for any damages arising from your use of the service, including but not limited to data loss, service interruptions, or physical injury.</p>
                </section>

                <section>
                    <h2 className="text-white font-bold mb-2">Changes</h2>
                    <p>We may update these terms at any time. Continued use of the app after changes constitutes acceptance of the new terms.</p>
                </section>

                <section>
                    <h2 className="text-white font-bold mb-2">Contact</h2>
                    <p>Questions? Contact us at <a href="mailto:ryanj.contino@gmail.com" className="text-orange-400 hover:text-orange-300">ryanj.contino@gmail.com</a></p>
                </section>
            </div>
        </div>
    );
}

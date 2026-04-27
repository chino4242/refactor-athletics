'use client';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return (
        <html>
            <body style={{ backgroundColor: '#09090b', color: '#fff', fontFamily: 'system-ui', margin: 0 }}>
                <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                    <div style={{ textAlign: 'center', maxWidth: '320px' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>💀</div>
                        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>Critical Error</h2>
                        <p style={{ fontSize: '14px', color: '#a1a1aa', marginBottom: '24px' }}>
                            {error.message || 'The app encountered a fatal error.'}
                        </p>
                        <button
                            onClick={reset}
                            style={{ width: '100%', padding: '12px', backgroundColor: '#ea580c', color: '#fff', fontWeight: 'bold', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '14px' }}
                        >
                            Reload App
                        </button>
                    </div>
                </div>
            </body>
        </html>
    );
}

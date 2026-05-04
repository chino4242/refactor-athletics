"use client";

import { useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function TimezoneSync() {
    useEffect(() => {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (tz) {
            document.cookie = `timezone=${tz};path=/;max-age=31536000`;
            // Also persist to DB for sync endpoints
            const saved = localStorage.getItem('tz_saved');
            if (saved !== tz) {
                const supabase = createClient();
                supabase.auth.getUser().then(({ data: { user } }) => {
                    if (user) {
                        supabase.from('users').update({ timezone: tz }).eq('id', user.id).then(() => {
                            localStorage.setItem('tz_saved', tz);
                        });
                    }
                });
            }
        }
    }, []);
    return null;
}

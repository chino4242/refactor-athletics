"use client";

import { useEffect } from 'react';

export default function TimezoneSync() {
    useEffect(() => {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (tz && document.cookie.indexOf('timezone=') === -1) {
            document.cookie = `timezone=${tz};path=/;max-age=31536000`;
        }
    }, []);
    return null;
}

import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

const V1_REDIRECTS: Record<string, string> = {
    '/dashboard': '/',
    '/track': '/train',
    '/history': '/',
    '/character': '/profile',
    '/progress': '/',
    '/workouts': '/train',
};

export async function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;
    const redirect = V1_REDIRECTS[path];
    if (redirect) {
        return NextResponse.redirect(new URL(redirect, request.url));
    }
    return await updateSession(request)
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - manifest.json (PWA manifest)
         * - sw.js (service worker)
         * - icon-*.png (PWA icons)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icon-.*\\.png|api/sync|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}

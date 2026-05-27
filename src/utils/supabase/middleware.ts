import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // IMPORTANT: Avoid writing any logic between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with cross-site tracking checks.
    const {
        data: { user },
    } = await supabase.auth.getUser()

    // Protect Application Routes
    const isAuthRoute = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/register') || request.nextUrl.pathname.startsWith('/auth') || request.nextUrl.pathname.startsWith('/reset-password');
    const isBetaRoute = request.nextUrl.pathname.startsWith('/beta');

    if (!user && !isAuthRoute) {
        // no user, redirect to login with original URL preserved
        const url = request.nextUrl.clone()
        const redirectTo = request.nextUrl.pathname + request.nextUrl.search
        url.pathname = '/login'
        url.searchParams.set('redirect', redirectTo)
        return NextResponse.redirect(url)
    }

    // Redirect authenticated users away from auth pages to / (except reset-password)
    if (user && isAuthRoute && !request.nextUrl.pathname.startsWith('/reset-password')) {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
    }

    // Beta gate: check if user has beta access
    if (user && !isAuthRoute && !isBetaRoute) {
        const { data: profile } = await supabase
            .from('users')
            .select('beta_access')
            .eq('id', user.id)
            .single()

        if (profile && !profile.beta_access) {
            const url = request.nextUrl.clone()
            url.pathname = '/beta'
            return NextResponse.redirect(url)
        }
    }

    return supabaseResponse
}

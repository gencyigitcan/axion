import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    // 1. Create a Supabase client
    // Using an empty cookie store handler for now, we will just read cookies
    // to validate the session.
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // 2. Check Auth Session
    const {
        data: { user },
    } = await supabase.auth.getUser()

    const isLoginPage = request.nextUrl.pathname.startsWith('/login')
    const isDashboard = request.nextUrl.pathname.startsWith('/dashboard')
    const isOnboarding = request.nextUrl.pathname.startsWith('/onboarding')

    // 3. Protected Routes Logic
    if (!user) {
        if (isDashboard || isOnboarding) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    if (user) {
        if (isLoginPage) {
            return NextResponse.redirect(new URL('/dashboard', request.url))
        }
        // Note: We avoid doing DB check for profile/tenant here in Middleware to keep it fast (Edge limits).
        // Instead we let the Dashboard Layout handle the "No Profile -> Redirect Onboarding" check.
        // Or we could use custom claims if we wanted to be fancy.
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}

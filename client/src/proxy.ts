import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

/**
 * Auth.js v5 proxy — route protection for Next.js 16.
 *
 * Uses the `auth(handler)` form: Auth.js calls the inner function with
 * `(request, { auth: session })` on every request, so we don't need
 * to call auth() ourselves (avoids the async edge runtime limitation).
 */
export default auth((request) => {
    const session = request.auth;
    const { pathname } = request.nextUrl;

    // Public paths that are always allowed through
    const isPublic =
        pathname.startsWith('/login') ||
        pathname.startsWith('/api/auth') ||
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon.ico');

    if (!session && !isPublic) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
});

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};

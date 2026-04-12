import { NextResponse } from 'next/server';

// Called by the frontend immediately after successful OTP verification.
// Sets httpOnly cookies on the Next.js domain (same-origin) so they are
// accessible by Next.js middleware and server-side route handlers.
export async function POST(request: Request) {
    try {
        const { accessToken, refreshToken } = await request.json();

        if (!accessToken || !refreshToken) {
            return NextResponse.json(
                { success: false, message: 'Tokens are required' },
                { status: 400 }
            );
        }

        const response = NextResponse.json({ success: true });

        // Access token: short-lived (1 hour)
        response.cookies.set('auth-token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60, // 1 hour in seconds
            path: '/',
        });

        // Refresh token: long-lived session key (30 days)
        response.cookies.set('refresh-token', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
            path: '/',
        });

        return response;
    } catch {
        return NextResponse.json(
            { success: false, message: 'Internal error' },
            { status: 500 }
        );
    }
}

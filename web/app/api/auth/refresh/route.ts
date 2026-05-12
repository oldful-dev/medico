import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://Ayuxa.onrender.com/api';

// Silent token refresh — reads the httpOnly refresh-token cookie,
// calls the backend refresh endpoint, and issues a new auth-token cookie.
// Returns the new accessToken in the JSON body for in-memory storage.
export async function POST() {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refresh-token')?.value;

    if (!refreshToken) {
        return NextResponse.json(
            { success: false, message: 'No session found' },
            { status: 401 }
        );
    }

    try {
        const backendRes = await fetch(`${BACKEND_URL}/auth/user/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
        });

        const data = await backendRes.json();

        if (!backendRes.ok || !data.success || !data.data?.accessToken) {
            // Refresh failed — clear both cookies
            const response = NextResponse.json(
                { success: false, message: 'Session expired' },
                { status: 401 }
            );
            response.cookies.delete('auth-token');
            response.cookies.delete('refresh-token');
            return response;
        }

        const newAccessToken = data.data.accessToken;

        const response = NextResponse.json({
            success: true,
            data: { accessToken: newAccessToken },
        });

        // Refresh the auth-token cookie with the new access token
        response.cookies.set('auth-token', newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60, // 1 hour
            path: '/',
        });

        return response;
    } catch (err) {
        // Critical: Even on 500 Network error, clear cookies to prevent middleware loops
        const response = NextResponse.json(
            { success: false, message: 'Failed to refresh session' },
            { status: 500 }
        );
        response.cookies.delete('auth-token');
        response.cookies.delete('refresh-token');
        return response;
    }
}

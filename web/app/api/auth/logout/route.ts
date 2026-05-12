import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://Ayuxa.onrender.com/api';

// Logout — best-effort backend invalidation + clear all session cookies.
export async function POST() {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('auth-token')?.value;

    // Best-effort: tell the backend to invalidate the refresh token
    if (accessToken) {
        try {
            await fetch(`${BACKEND_URL}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
            });
        } catch {
            // Ignore — we still clear cookies on the client side
        }
    }

    const response = NextResponse.json({ success: true });
    response.cookies.delete('auth-token');
    response.cookies.delete('refresh-token');
    return response;
}

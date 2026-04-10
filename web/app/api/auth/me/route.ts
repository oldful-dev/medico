import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://oldful-dev.onrender.com/api';

// Fetch the authenticated user's profile using the httpOnly auth-token cookie.
// Used during session hydration on page load/refresh.
export async function GET() {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('auth-token')?.value;

    if (!accessToken) {
        return NextResponse.json(
            { success: false, message: 'Not authenticated' },
            { status: 401 }
        );
    }

    try {
        const res = await fetch(`${BACKEND_URL}/users/profile`, {
            headers: { 'Authorization': `Bearer ${accessToken}` },
            cache: 'no-store',
        });

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch {
        return NextResponse.json(
            { success: false, message: 'Failed to fetch profile' },
            { status: 500 }
        );
    }
}

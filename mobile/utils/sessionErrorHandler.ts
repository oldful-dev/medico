import { ApiError } from '@/services/api/apiClient';

export function isSessionExpiredError(error: any): boolean {
    if (error instanceof ApiError) {
        return error.isSessionExpired;
    }

    if (!error) return false;

    const message = (error.message || error.toString() || '').toLowerCase();
    return (
        message.includes('session terminated') ||
        message.includes('session expired') ||
        message.includes('unauthorized') ||
        message.includes('token') ||
        message.includes('login again') ||
        message.includes('not authenticated') ||
        message.includes('not authorized') ||
        error.statusCode === 401
    );
}

export function getSessionErrorMessage(error: any): string {
    if (error instanceof ApiError) {
        return error.message;
    }
    return error?.message || 'Session expired. Please login again.';
}

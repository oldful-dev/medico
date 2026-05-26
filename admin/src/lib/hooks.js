import { useState, useEffect, useCallback } from 'react';

/**
 * Generic hook for fetching data from API
 * @param {Function} apiFn - API function that returns a promise
 * @param {any} deps - dependencies array for re-fetching
 * @returns {{ data, loading, error, refetch }}
 */
export function useAPI(apiFn, deps = []) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetch = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await apiFn();
            setData(res.data?.data ?? res.data);
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    }, deps);

    useEffect(() => {
        fetch();
    }, [fetch]);

    return { data, loading, error, refetch: fetch, setData };
}

/**
 * Play a soft ting sound using Web Audio API
 * type: 'default' | 'sos' | 'message'
 */
export function playTing(type = 'default') {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === 'sos') {
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.4, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.4);
        } else if (type === 'message') {
            osc.frequency.setValueAtTime(1047, ctx.currentTime);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.25);
        } else {
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.3);
        }

        osc.onended = () => ctx.close();
    } catch (e) {
        // Web Audio not available — silent fail
    }
}

/**
 * Toast notification helper
 */
export function showToast(message, type = 'success') {
    // Simple toast implementation — writes to a DOM node
    const existing = document.getElementById('admin-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'admin-toast';
    toast.style.cssText = `
        position: fixed; bottom: 24px; right: 24px; z-index: 10000;
        padding: 12px 20px; border-radius: 10px; font-size: 14px;
        color: white; animation: slideInRight 0.3s ease; max-width: 400px;
        background: ${type === 'success' ? 'linear-gradient(135deg, #10b981, #059669)' :
            type === 'error' ? 'linear-gradient(135deg, #ef4444, #dc2626)' :
                'linear-gradient(135deg, #f59e0b, #d97706)'};
        box-shadow: 0 8px 30px rgba(0,0,0,0.3);
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

/**
 * Format currency
 */
export function formatCurrency(amount) {
    if (!amount && amount !== 0) return '—';
    return `₹${Number(amount).toLocaleString('en-IN')}`;
}

/**
 * Format date
 */
export function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
        year: 'numeric', month: 'short', day: 'numeric',
    });
}

/**
 * Format datetime
 */
export function formatDateTime(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-IN', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

/**
 * Time ago helper
 */
export function timeAgo(dateStr) {
    if (!dateStr) return '—';
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Loader2 } from 'lucide-react';
import { useUserHooks } from '@/hooks/useUserHooks';

interface Notification {
    id: string;
    title: string;
    body: string;
    isRead: boolean;
    createdAt: string;
}

interface NotificationDropdownProps {
    isOpen: boolean;
    onClose: () => void;
    notifications: Notification[];
    isLoading: boolean;
}


export function NotificationDropdown({ isOpen, onClose, notifications, isLoading }: NotificationDropdownProps) {
    const { useMarkNotificationAsRead, useMarkAllNotificationsAsRead } = useUserHooks();
    const markAsRead = useMarkNotificationAsRead();
    const markAllAsRead = useMarkAllNotificationsAsRead();

    const handleMarkAsRead = async (id: string) => {
        markAsRead.mutate(id);
    };

    const handleMarkAllAsRead = async () => {
        markAllAsRead.mutate();
    };

    const filteredNotifications = notifications.filter(n => 
        n.body?.includes('Template:') !== true && 
        n.title?.includes('Template:') !== true
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-[110]" onClick={onClose} />
                    <motion.div
                        initial={{ opacity: 0, y: 15, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 15, scale: 0.95 }}
                        className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 top-[88px] sm:top-auto sm:mt-3 w-auto sm:w-96 bg-white/95 backdrop-blur-xl border border-gray-100 rounded-2xl shadow-2xl z-[120] overflow-hidden"
                    >
                        <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-white/50">
                            <h3 className="font-bold text-gray-900">Notifications</h3>
                            <button
                                onClick={handleMarkAllAsRead}
                                className="text-xs font-bold text-[var(--color-primary)] hover:underline"
                            >
                                Mark all as read
                            </button>
                        </div>

                        <div className="max-h-[70vh] overflow-y-auto overflow-x-hidden scrollbar-thin">
                            {isLoading ? (
                                <div className="p-8 flex flex-col items-center gap-3">
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                    >
                                        <Loader2 className="w-6 h-6 text-gray-300" />
                                    </motion.div>
                                    <p className="text-xs text-gray-400">Fetching alerts...</p>
                                </div>
                            ) : filteredNotifications.length === 0 ? (
                                <div className="p-12 text-center text-gray-400">
                                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                    <p className="text-sm">No new notifications</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-50">
                                    {filteredNotifications.map((n) => (
                                        <div
                                            key={n.id}
                                            className={`p-4 hover:bg-emerald-50/30 transition-colors relative cursor-pointer ${!n.isRead ? 'bg-emerald-50/10' : ''}`}
                                            onClick={() => !n.isRead && handleMarkAsRead(n.id)}
                                        >
                                            {!n.isRead && <div className="absolute left-2 top-6 w-1.5 h-1.5 bg-emerald-500 rounded-full" />}
                                            <div className="flex flex-col gap-1 pl-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-bold text-gray-900">{n.title}</span>
                                                    <span className="text-[10px] text-gray-400">
                                                        {new Date(n.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                    </span>
                                                </div>
                                                <div 
                                                    className="text-xs text-gray-600 leading-relaxed notification-body"
                                                    dangerouslySetInnerHTML={{ __html: n.body }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

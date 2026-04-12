'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
    isLoading?: boolean;
}

export function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'danger',
    isLoading = false
}: ConfirmationModalProps) {
    
    // Lock scroll when modal is open
    React.useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    const colors = {
        danger: {
            bg: 'bg-red-50',
            icon: 'text-red-600',
            button: 'bg-red-600 hover:bg-red-700 shadow-red-200',
        },
        warning: {
            bg: 'bg-amber-50',
            icon: 'text-amber-600',
            button: 'bg-amber-600 hover:bg-amber-700 shadow-amber-200',
        },
        info: {
            bg: 'bg-blue-50',
            icon: 'text-blue-600',
            button: 'bg-blue-600 hover:bg-blue-700 shadow-blue-200',
        }
    };

    const activeColor = colors[type];

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-sm bg-white rounded-[32px] shadow-2xl overflow-hidden"
                    >
                        <div className="p-8">
                            {/* Close Button */}
                            <button 
                                onClick={onClose}
                                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {/* Icon */}
                            <div className={`w-14 h-14 ${activeColor.bg} rounded-3xl flex items-center justify-center mb-6`}>
                                <AlertTriangle className={`w-7 h-7 ${activeColor.icon}`} />
                            </div>

                            {/* Text */}
                            <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
                            <p className="text-gray-500 text-sm leading-relaxed mb-8">
                                {message}
                            </p>

                            {/* Action Buttons */}
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={onConfirm}
                                    disabled={isLoading}
                                    className={`w-full py-4 rounded-2xl text-white font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 ${activeColor.button}`}
                                >
                                    {isLoading && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                    {confirmText}
                                </button>
                                <button
                                    onClick={onClose}
                                    disabled={isLoading}
                                    className="w-full py-4 rounded-2xl text-gray-500 font-bold hover:bg-gray-50 transition-colors"
                                >
                                    {cancelText}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

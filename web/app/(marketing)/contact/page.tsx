'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone, Mail, MessageSquare, Search, Plus,
  CheckCircle, Info, ArrowRight, X, Clock,
  Loader2, BadgeHelp, CheckCircle2, MapPin, User
} from 'lucide-react';
import { supportService, SupportTicket, TicketCategory, TicketMessage } from '@/services/api/supportService';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import { PhoneInput } from '@/components/common/PhoneInput';
import { initSocket, disconnectSocket } from '@/lib/socket';

// Data from backend DEFAULT_CONFIG
const FAQ_DATA = [
    { id: 'book',     q: 'How do I book a service?',       a: 'Navigate to the services page, select your desired healthcare service, and follow the simple booking steps.' },
    { id: 'sos',      q: 'Is SOS always available?',        a: 'Yes, SOS is 24/7. It alerts our rapid response team and your emergency contacts instantly.' },
    { id: 'lab',      q: 'How can I get my lab reports?',   a: 'Reports appear in your Account Dashboard and are also sent via WhatsApp and Email for easy access.' },
    { id: 'refund',   q: 'What is the refund policy?',      a: 'Cancel at least 2 hours before the slot for a full refund. Settlement takes 5–7 business days.' },
    { id: 'contacts', q: 'How to add emergency contacts?',  a: 'Go to My Profile → Emergency Contacts to add loved ones who should be notified during an SOS.' },
];

const TICKET_CATEGORIES = [
    { id: 'billing',    label: 'Billing' },
    { id: 'service',    label: 'Service' },
    { id: 'complaint',  label: 'Complaint' },
    { id: 'lab',        label: 'Lab / Test' },
    { id: 'technical',  label: 'Technical' },
    { id: 'other',      label: 'Other' },
];

const STATUS_COLORS: Record<string, string> = {
    open:        'bg-amber-100 text-amber-700',
    in_progress: 'bg-blue-100 text-blue-700',
    resolved:    'bg-emerald-100 text-emerald-700',
    closed:      'bg-gray-100 text-gray-700',
};

const SUPPORT_PROMISE = [
    { id: 'ack',     text: 'Acknowledgement within 48 hours', icon: CheckCircle2 },
    { id: 'resolve', text: 'Resolution within 1 month', icon: CheckCircle2 },
    { id: 'track',   text: 'A unique ticket number is provided to track your request.', icon: Info },
];

export default function ContactPage() {
    const { isAuthenticated } = useAuthStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [showTicketModal, setShowTicketModal] = useState(false);
    const [myTickets, setMyTickets] = useState<SupportTicket[]>([]);
    const [loadingTickets, setLoadingTickets] = useState(false);
    
    // New Ticket Form
    const [form, setForm] = useState({ 
        subject: '', 
        description: '', 
        category: 'service' as TicketCategory,
        priority: 'medium',
        contactNumber: ''
    });
    const [submitting, setSubmitting] = useState(false);

    const { user } = useAuthStore();

    useEffect(() => {
        if (user?.phone) {
            setForm(prev => ({ ...prev, contactNumber: user.phone }));
        }
    }, [user]);

    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [ticketDetails, setTicketDetails] = useState<(SupportTicket & { messages?: TicketMessage[] }) | null>(null);
    const [messages, setMessages] = useState<TicketMessage[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [chatLoading, setChatLoading] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [replying, setReplying] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isAuthenticated) {
            fetchTickets();
        }
    }, [isAuthenticated]);

    // Real-time socket — join user room + listen for admin replies
    useEffect(() => {
        if (!user?.id) return;

        const socket = initSocket(user.id);
        if (!socket) return;

        const handleMessageAdded = (data: { ticketId: string; message: TicketMessage; senderName: string }) => {
            console.log('📨 Socket message received:', { receivedTicketId: data.ticketId, currentTicketId: selectedTicketId });

            // Append message if user is viewing that ticket
            if (data.ticketId === selectedTicketId) {
                console.log('✅ Message is for current ticket, adding to conversation');
                setMessages(prev => {
                    const exists = prev.some(m => m.id === data.message.id);
                    return exists ? prev : [...prev, data.message];
                });
            } else {
                // Show toast only if viewing a different ticket or no ticket open
                console.log('🔔 Message is for different ticket, showing toast');
                toast.info(`New reply from ${data.senderName} on your support ticket.`);
            }
            // Always refresh ticket list to update unread counts
            fetchTickets();
        };

        socket.on('ticket_message_added', handleMessageAdded);

        return () => {
            socket.off('ticket_message_added', handleMessageAdded);
        };
    }, [user?.id, selectedTicketId]);

    const fetchTickets = async () => {
        setLoadingTickets(true);
        try {
            const res = await supportService.getMyTickets();
            if (res.success && res.data) setMyTickets(res.data);
        } catch (err) {
            console.error('Failed to load tickets');
        } finally {
            setLoadingTickets(false);
        }
    };

    const handleOpenTicket = async (id: string) => {
        setSelectedTicketId(id);
        setLoadingDetails(true);
        try {
            const res = await supportService.getTicketById(id);
            if (res.success && res.data) {
                setTicketDetails(res.data);
                setMessages(res.data.messages || []);
            }
        } catch (err) {
            toast.error('Failed to load ticket details');
            setSelectedTicketId(null);
        } finally {
            setLoadingDetails(false);
        }
    };

    const refreshMessages = async () => {
        if (!selectedTicketId) return;
        try {
            const res = await supportService.getTicketById(selectedTicketId);
            if (res.success && res.data) {
                setMessages(res.data.messages || []);
                setTicketDetails(res.data);
            }
        } catch (err) { /* silent */ }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendReply = async (e: React.FormEvent) => {
        e.preventDefault();
        const text = replyText.trim();
        if (!text || !selectedTicketId) return;

        setReplying(true);
        try {
            const res = await supportService.addMessage(selectedTicketId, text);
            if (res.success && res.data) {
                const newMessage = res.data;
                setMessages(prev => [...prev, newMessage]);
                setReplyText('');
                // Scroll to bottom logic would go here if we had a ref
            }
        } catch (err: unknown) {
            const error = err as { message?: string };
            toast.error(error.message || 'Failed to send message');
        } finally {
            setReplying(false);
        }
    };

    const handleCreateTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await supportService.createTicket(form);
            if (res.success) {
                toast.success('Ticket raised successfully');
                setShowTicketModal(false);
                setForm({ 
                    subject: '', 
                    description: '', 
                    category: 'service' as TicketCategory,
                    priority: 'medium',
                    contactNumber: user?.phone || ''
                });
                fetchTickets();
            }
        } catch (err: unknown) {
            const error = err as { message?: string };
            toast.error(error.message || 'Failed to raise ticket');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredFAQs = FAQ_DATA.filter(f => 
        f.q.toLowerCase().includes(searchQuery.toLowerCase()) || 
        f.a.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50/50 flex flex-col">
        {/* ─── Hero Section ─── */}
        <section className="bg-[var(--color-primary-deep)] py-12 md:py-16 px-6 relative overflow-hidden flex flex-col items-center">
            <div className="max-w-4xl w-full text-center relative z-10 px-4">
                <motion.h1 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6 md:mb-8 tracking-tight leading-tight"
                >
                    How can we <span className="text-emerald-400">help you</span> today?
                </motion.h1>

                <div className="relative max-w-2xl mx-auto group">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors">
                        <Search className="w-5 h-5" />
                    </div>
                    <input 
                        type="text" 
                        placeholder="Search FAQs, help articles..."
                        className="w-full pl-12 pr-6 py-4 md:py-5 bg-white rounded-2xl md:rounded-3xl shadow-2xl outline-none focus:ring-4 ring-white/10 transition-all text-gray-800 text-sm md:text-base border border-transparent focus:border-emerald-500/30"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>
            
            {/* Background Decor - better positioning */}
            <div className="absolute -top-20 -right-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px]" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px]" />
        </section>

        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 -mt-8 md:-mt-12 pb-20 relative z-20">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                    
                    {/* ─── Main Content (2/3) ─── */}
                    <div className="lg:col-span-2 space-y-8">
                        
                        {/* 1. Contact Options Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <ContactCard 
                                icon={Phone}
                                title="Call Us"
                                desc="24/7 Support Line"
                                color="bg-blue-50 text-blue-600"
                                onClick={() => window.open('tel:+918062180429')}
                            />
                            <ContactCard 
                                icon={MessageSquare}
                                title="WhatsApp"
                                desc="Quick Chat Help"
                                color="bg-emerald-50 text-emerald-600"
                                onClick={() => window.open('https://wa.me/918062180429')}
                            />
                            <ContactCard 
                                icon={Plus}
                                title="Raise Ticket"
                                desc="Submit a Request"
                                color="bg-amber-50 text-amber-600"
                                onClick={() => isAuthenticated ? setShowTicketModal(true) : window.location.href = '/auth'}
                            />
                        </div>

                        {/* 2. Search Results / FAQs */}
                        <motion.div 
                            layout
                            className="bg-white rounded-[1.5rem] md:rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/50 p-6 md:p-8"
                        >
                            <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <BadgeHelp className="w-5 h-5 text-emerald-500" />
                                {searchQuery ? 'Search Results' : 'Common FAQs'}
                            </h2>
                            <div className="space-y-6">
                                {(searchQuery ? filteredFAQs : FAQ_DATA.slice(0, 5)).map((faq) => (
                                    <div key={faq.id} className="group cursor-default border-b border-gray-50 pb-6 last:border-0 last:pb-0">
                                        <h3 className="text-sm md:text-base font-bold text-gray-900 mb-2 group-hover:text-[var(--color-primary)] transition-colors">{faq.q}</h3>
                                        <p className="text-xs md:text-sm text-gray-500 leading-relaxed">{faq.a}</p>
                                    </div>
                                ))}
                                {searchQuery && filteredFAQs.length === 0 && (
                                    <div className="text-center py-10 text-gray-400">
                                        No matches found for &quot;{searchQuery}&quot;
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        {/* 3. My Tickets Section (Authenticated Only) */}
                        {isAuthenticated && (
                            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
                                <div className="p-8 pb-0 flex items-center justify-between">
                                    <h2 className="text-xl font-bold text-gray-900">My Support Tickets</h2>
                                    <button 
                                        onClick={fetchTickets}
                                        className="text-xs font-bold text-[var(--color-primary)] hover:underline"
                                    >
                                        Refresh
                                    </button>
                                </div>
                                
                                <div className="p-8">
                                    {loadingTickets ? (
                                        <div className="flex justify-center py-12">
                                            <Loader2 className="w-8 h-8 text-emerald-200 animate-spin" />
                                        </div>
                                    ) : myTickets.length === 0 ? (
                                        <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                                            <p className="text-gray-400 text-sm">You haven&apos;t raised any tickets yet.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {myTickets.map(ticket => (
                                                <div 
                                                    key={ticket.id}
                                                    onClick={() => handleOpenTicket(ticket.id)}
                                                    className="p-5 bg-white border border-gray-100 rounded-2xl hover:border-emerald-100 transition-all shadow-sm group cursor-pointer"
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-xs font-mono text-gray-400 uppercase">{ticket.ticketCode}</span>
                                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-tight ${STATUS_COLORS[ticket.status]}`}>
                                                            {ticket.status.replace('_', ' ')}
                                                        </span>
                                                    </div>
                                                    <h4 className="font-bold text-gray-900 group-hover:text-[var(--color-primary)] transition-colors">{ticket.subject}</h4>
                                                    <div className="flex items-center justify-between mt-3">
                                                        <span className="text-xs text-gray-400 capitalize">{ticket.category}</span>
                                                        <span className="text-xs text-[var(--color-primary)] font-bold flex items-center gap-1">
                                                            View Conversation <ArrowRight className="w-3.5 h-3.5" />
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ─── Sidebar (1/3) ─── */}
                    <div className="space-y-8">
                        {/* 1. Support Promise */}
                        <div className="bg-[var(--color-primary-deep)] rounded-[2.5rem] p-8 text-white shadow-xl">
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-emerald-400" />
                                Support Promise
                            </h3>
                            <div className="space-y-6">
                                {SUPPORT_PROMISE.map(item => (
                                    <div key={item.id} className="flex gap-4">
                                        <div className="mt-1">
                                            <item.icon className="w-5 h-5 text-emerald-400" />
                                        </div>
                                        <p className="text-sm text-emerald-50/80 leading-relaxed font-medium">
                                            {item.text}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 2. Official Contacts */}
                        <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-gray-100 shadow-xl p-6 md:p-8">
                            <h2 className="font-bold text-gray-900 mb-8 flex items-center gap-2">
                                <Info className="w-5 h-5 text-emerald-500" />
                                Contact Details
                            </h2>
                            
                            <div className="space-y-5">
                                {/* Headquarters */}
                                <div>
                                    <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-4">Headquarters</p>
                                    <div className="flex gap-4 items-start">
                                        <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                                            <MapPin className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-900 mb-1 leading-tight">Ayuxa Gentlora Esteem LLP</h4>
                                            <p className="text-[13px] text-gray-500 leading-relaxed font-medium">
                                                No 402-B 1TF, ITI HBCS Layout, Phase 3,<br />
                                                Mysore Road, Rajarajeshwari Nagar,<br />
                                                Bangalore 560039
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Customer Support */}
                                <div className="pt-8 border-t border-gray-50">
                                    <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-4">Customer Support</p>
                                    <div className="space-y-5">
                                        <div className="flex items-center gap-4 text-sm font-bold text-gray-800">
                                            <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center shrink-0">
                                                <Phone className="w-5 h-5" />
                                            </div>
                                            +91 80621 80429
                                        </div>
                                        <div className="flex items-center gap-4 text-sm font-bold text-gray-800">
                                            <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center shrink-0">
                                                <Mail className="w-5 h-5" />
                                            </div>
                                            client@Ayuxa.com
                                        </div>
                                    </div>
                                </div>

                                {/* Grievance Redressal */}
                                <div className="pt-8 border-t border-gray-50">
                                    <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-4">Grievance Officer</p>
                                    <div className="space-y-5">
                                        <div className="flex items-center gap-4 text-sm font-bold text-gray-800">
                                            <div className="w-10 h-10 bg-gray-50 text-gray-500 rounded-xl flex items-center justify-center shrink-0">
                                                <User className="w-5 h-5" />
                                            </div>
                                            SK Murgan
                                        </div>
                                        <div className="flex items-center gap-4 text-sm font-bold text-gray-800">
                                            <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center shrink-0 transition-colors">
                                                <Mail className="w-5 h-5" />
                                            </div>
                                            compliance@Ayuxa.com
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* ─── Ticket Conversation Modal (Replica of Mobile Chat) ─── */}
            <AnimatePresence>
                {selectedTicketId && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-end">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" 
                            onClick={() => setSelectedTicketId(null)}
                        />
                        <motion.div 
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="bg-white w-full max-w-2xl h-full shadow-2xl relative z-10 flex flex-col"
                        >
                            {/* Header */}
                            <div className="p-6 md:p-8 bg-[var(--color-primary-deep)] text-white flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setSelectedTicketId(null)} className="p-2 hover:bg-white/10 rounded-full">
                                        <X className="w-6 h-6" />
                                    </button>
                                    <div>
                                        <h3 className="text-xl font-bold line-clamp-1">{ticketDetails?.subject || 'Ticket'}</h3>
                                        <p className="text-xs text-white/60 font-mono tracking-widest">{ticketDetails?.ticketCode}</p>
                                    </div>
                                </div>
                                <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-tighter ${STATUS_COLORS[ticketDetails?.status || 'open']}`}>
                                    {ticketDetails?.status?.replace('_', ' ') || 'open'}
                                </span>
                            </div>

                            {/* Chat Content */}
                            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-gray-50/50">
                                {loadingDetails ? (
                                    <div className="h-full flex flex-col items-center justify-center space-y-4">
                                        <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
                                        <p className="text-sm text-gray-400 font-medium">Loading conversation...</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Description Header */}
                                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                <Info className="w-3.5 h-3.5" /> Detailed Description
                                            </div>
                                            <p className="text-sm text-gray-700 leading-relaxed italic">&quot;{ticketDetails?.description}&quot;</p>
                                            <div className="pt-4 border-t border-gray-50 text-[10px] font-semibold text-gray-400 flex items-center gap-3">
                                                <span>{ticketDetails?.category}</span>
                                                <div className="w-1 h-1 bg-gray-200 rounded-full" />
                                                <span>Created {ticketDetails?.createdAt ? new Date(ticketDetails.createdAt).toLocaleDateString() : ''}</span>
                                            </div>
                                        </div>

                                        {/* Messages */}
                                        <div className="space-y-6">
                                            {messages.length === 0 ? (
                                                <div className="text-center py-20">
                                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-50 text-gray-300">
                                                        <MessageSquare className="w-8 h-8" />
                                                    </div>
                                                    <p className="text-sm text-gray-400">No messages yet. Our team will respond shortly.</p>
                                                </div>
                                            ) : (
                                                messages.map(msg => {
                                                    const isUser = msg.senderType === 'user';
                                                    return (
                                                        <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                                                            <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${
                                                                isUser 
                                                                ? 'bg-[var(--color-primary)] text-white rounded-tr-none' 
                                                                : 'bg-white text-gray-800 border border-gray-50 rounded-tl-none'
                                                            }`}>
                                                                <div className="flex items-center gap-2 mb-1 opacity-60 text-[10px] uppercase font-bold tracking-tighter">
                                                                    {isUser ? 'You' : 'Support Team'}
                                                                </div>
                                                                {msg.message}
                                                            </div>
                                                            <span className="text-[10px] text-gray-400 mt-2 font-medium">
                                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                        <div ref={messagesEndRef} />
                                    </>
                                )}
                            </div>

                            {/* Reply Input bar */}
                            {(ticketDetails?.status === 'resolved' || ticketDetails?.status === 'closed') ? (
                                <div className="p-6 md:p-8 bg-white border-t border-gray-100 flex items-center justify-center">
                                    <div className="flex items-center gap-2 text-sm text-gray-400 font-medium">
                                        <Clock className="w-4 h-4" /> This ticket has been {ticketDetails?.status?.replace('_', ' ')}.
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleSendReply} className="p-6 md:p-8 bg-white border-t border-gray-100">
                                    <div className="flex items-end gap-4">
                                        <div className="flex-1 relative">
                                            <textarea 
                                                rows={1}
                                                placeholder="Type your message..."
                                                className="w-full px-5 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-4 ring-emerald-500/10 focus:border-emerald-500/30 transition-all resize-none outline-none text-sm pr-12"
                                                value={replyText}
                                                onChange={e => setReplyText(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        handleSendReply(e as unknown as React.FormEvent);
                                                    }
                                                }}
                                            />
                                        </div>
                                        <button 
                                            disabled={replying || !replyText.trim()}
                                            type="submit"
                                            className="w-12 h-12 bg-[var(--color-primary-deep)] text-white rounded-xl shadow-lg shadow-emerald-900/10 flex items-center justify-center hover:scale-110 active:scale-95 transition-all disabled:bg-gray-200 disabled:shadow-none translate-y-[-2px]"
                                        >
                                            {replying ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5 -rotate-45" />}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ─── Raise Ticket Modal ─── */}
            <AnimatePresence>
                {showTicketModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" 
                            onClick={() => !submitting && setShowTicketModal(false)}
                        />
                        <motion.div 
                            initial={{ opacity: 0, y: 50, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 50, scale: 0.95 }}
                            className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden border border-emerald-100"
                        >
                            <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gradient-to-r from-white to-emerald-50/30">
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900">Raise a Support Ticket</h3>
                                    <p className="text-xs text-gray-500 mt-1">Our team typically responds in less than 48 hours.</p>
                                </div>
                                <button onClick={() => setShowTicketModal(false)} className="p-2 hover:bg-white hover:shadow-sm rounded-full transition-all">
                                    <X className="w-6 h-6 text-gray-400" />
                                </button>
                            </div>

                            <form onSubmit={handleCreateTicket} className="p-8 space-y-5 overflow-y-auto max-h-[70vh] scrollbar-thin">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Category</label>
                                        <select 
                                            className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:ring-4 ring-emerald-500/10 focus:border-emerald-500/30 transition-all text-sm outline-none cursor-pointer"
                                            value={form.category}
                                            onChange={e => setForm({...form, category: e.target.value as TicketCategory})}
                                        >
                                            {TICKET_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Priority</label>
                                        <div className="flex bg-gray-50 p-1 rounded-xl">
                                            {['low', 'medium', 'high'].map(p => (
                                                <button
                                                    key={p}
                                                    type="button"
                                                    onClick={() => setForm({...form, priority: p})}
                                                    className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                                                        form.priority === p 
                                                        ? 'bg-white text-emerald-700 shadow-sm border border-emerald-100' 
                                                        : 'text-gray-400 hover:text-gray-600'
                                                    }`}
                                                >
                                                    {p}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 text-emerald-600">Subject</label>
                                    <div className="relative">
                                        <BadgeHelp className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                        <input 
                                            required
                                            type="text" 
                                            placeholder="Brief summary of your issue"
                                            className="w-full pl-11 pr-5 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-4 ring-emerald-500/10 focus:border-emerald-500/30 transition-all text-sm"
                                            value={form.subject}
                                            onChange={e => setForm({...form, subject: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <PhoneInput
                                    label="Contact Phone"
                                    value={form.contactNumber}
                                    onChange={val => setForm({...form, contactNumber: val})}
                                />

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Detailed Description</label>
                                    <textarea 
                                        required
                                        rows={4}
                                        placeholder="Describe your issue in detail. Providing dates or booking codes helps resolve issues faster."
                                        className="w-full px-5 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-4 ring-emerald-500/10 focus:border-emerald-500/30 transition-all resize-none text-sm outline-none"
                                        value={form.description}
                                        onChange={e => setForm({...form, description: e.target.value})}
                                    />
                                </div>

                                <div className="pt-2">
                                    <button 
                                        disabled={submitting}
                                        type="submit"
                                        className="w-full bg-[var(--color-primary-deep)] text-white py-4 rounded-2xl font-bold text-lg hover:shadow-2xl hover:shadow-emerald-900/20 active:translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:bg-gray-300 shadow-xl shadow-emerald-900/10"
                                    >
                                        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Submit Ticket <ArrowRight className="w-5 h-5" /></>}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Sub-Components ───

interface ContactCardProps {
    icon: React.ElementType;
    title: string;
    desc: string;
    color: string;
    onClick: () => void;
}

function ContactCard({ icon: Icon, title, desc, color, onClick }: ContactCardProps) {
    return (
        <button 
            onClick={onClick}
            className="bg-white p-6 rounded-3xl shadow-xl shadow-gray-200/40 border border-gray-50 flex flex-col items-center text-center group hover:-translate-y-1 transition-all w-full"
        >
            <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <Icon className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">{title}</h3>
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-tight">{desc}</p>
        </button>
    );
}

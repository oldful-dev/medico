'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Phone, Mail, MessageSquare, Search, Plus, 
  CheckCircle, Info, ArrowRight, X, Clock,
  Loader2, BadgeHelp, CheckCircle2
} from 'lucide-react';
import { supportService, SupportTicket, TicketCategory } from '@/services/api/supportService';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

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
    const [form, setForm] = useState({ subject: '', description: '', category: 'service' as TicketCategory });
    const [submitting, setSubmitting] = useState(false);

    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [ticketDetails, setTicketDetails] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [chatLoading, setChatLoading] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [replying, setReplying] = useState(false);

    useEffect(() => {
        if (isAuthenticated) {
            fetchTickets();
        }
    }, [isAuthenticated]);

    // Poll for new messages when a ticket is open
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (selectedTicketId) {
            interval = setInterval(() => {
                refreshMessages();
            }, 10000);
        }
        return () => clearInterval(interval);
    }, [selectedTicketId]);

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

    const handleSendReply = async (e: React.FormEvent) => {
        e.preventDefault();
        const text = replyText.trim();
        if (!text || !selectedTicketId) return;

        setReplying(true);
        try {
            const res = await supportService.addMessage(selectedTicketId, text);
            if (res.success && res.data) {
                setMessages(prev => [...prev, res.data]);
                setReplyText('');
                // Scroll to bottom logic would go here if we had a ref
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to send message');
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
                setForm({ subject: '', description: '', category: 'service' });
                fetchTickets();
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to raise ticket');
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
                                onClick={() => window.open('tel:+919480198108')}
                            />
                            <ContactCard 
                                icon={MessageSquare}
                                title="WhatsApp"
                                desc="Quick Chat Help"
                                color="bg-emerald-50 text-emerald-600"
                                onClick={() => window.open('https://wa.me/919480198108')}
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
                            <h3 className="font-bold text-gray-900 mb-6">Contact Details</h3>
                            <div className="space-y-8">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Customer Support</p>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 text-sm font-semibold text-gray-700">
                                            <div className="w-8 h-8 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center">
                                                <Phone className="w-4 h-4" />
                                            </div>
                                            +91 94801 98108
                                        </div>
                                        <div className="flex items-center gap-3 text-sm font-semibold text-gray-700">
                                            <div className="w-8 h-8 bg-emerald-50 text-emerald-500 rounded-lg flex items-center justify-center">
                                                <Mail className="w-4 h-4" />
                                            </div>
                                            client@oldful.com
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-6 border-t border-gray-50">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Grievance Officer</p>
                                    <div className="space-y-4">
                                        <p className="text-sm font-bold text-gray-900">SK Murgan</p>
                                        <div className="flex items-center gap-3 text-sm font-semibold text-gray-700">
                                            <div className="w-8 h-8 bg-amber-50 text-amber-500 rounded-lg flex items-center justify-center">
                                                <Mail className="w-4 h-4" />
                                            </div>
                                            compliance@oldful.com
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
                                    {ticketDetails?.status.replace('_', ' ')}
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
                                                <span>Created {new Date(ticketDetails?.createdAt).toLocaleDateString()}</span>
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
                                    </>
                                )}
                            </div>

                            {/* Reply Input bar */}
                            {(ticketDetails?.status === 'resolved' || ticketDetails?.status === 'closed') ? (
                                <div className="p-6 md:p-8 bg-white border-t border-gray-100 flex items-center justify-center">
                                    <div className="flex items-center gap-2 text-sm text-gray-400 font-medium">
                                        <Clock className="w-4 h-4" /> This ticket has been {ticketDetails.status.replace('_', ' ')}.
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
                                                        handleSendReply(e as any);
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
                            className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden"
                        >
                            <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                                <h3 className="text-2xl font-bold text-gray-900">Raise a Support Ticket</h3>
                                <button onClick={() => setShowTicketModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                    <X className="w-6 h-6 text-gray-400" />
                                </button>
                            </div>

                            <form onSubmit={handleCreateTicket} className="p-8 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Subject</label>
                                    <input 
                                        required
                                        type="text" 
                                        placeholder="Brief summary of your issue"
                                        className="w-full px-5 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-4 ring-emerald-500/10 focus:border-emerald-500/30 transition-all"
                                        value={form.subject}
                                        onChange={e => setForm({...form, subject: e.target.value})}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Category</label>
                                    <div className="flex flex-wrap gap-2">
                                        {TICKET_CATEGORIES.map(c => (
                                            <button 
                                                key={c.id}
                                                type="button"
                                                onClick={() => setForm({...form, category: c.id as TicketCategory})}
                                                className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${
                                                    form.category === c.id 
                                                    ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-lg shadow-emerald-200' 
                                                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                                                }`}
                                            >
                                                {c.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Detailed Description</label>
                                    <textarea 
                                        required
                                        rows={4}
                                        placeholder="Describe your issue in detail..."
                                        className="w-full px-5 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-4 ring-emerald-500/10 focus:border-emerald-500/30 transition-all resize-none"
                                        value={form.description}
                                        onChange={e => setForm({...form, description: e.target.value})}
                                    />
                                </div>

                                <button 
                                    disabled={submitting}
                                    type="submit"
                                    className="w-full bg-[var(--color-primary-deep)] text-white py-4 rounded-2xl font-bold text-lg hover:shadow-2xl hover:shadow-emerald-900/20 active:translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:bg-gray-300"
                                >
                                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit Ticket"}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Sub-Components ───

function ContactCard({ icon: Icon, title, desc, color, onClick }: any) {
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

'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { 
  CalendarDays, Activity, Stethoscope, ArrowRight, 
  Bell, Search, Shield, Clock, Zap, ChevronRight,
  Ambulance, Heart, FileText
} from 'lucide-react';
import { useSDUIHooks } from '@/hooks/useSDUIHooks';
import { useAuthStore } from '@/store/authStore';
import { useUserHooks } from '@/hooks/useUserHooks';
import { getAssetUrl } from '@/utils/getAssetUrl';
import { notificationService } from '@/services/api/notificationService';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const QUICK_ACTIONS = [
  { icon: Stethoscope, label: 'Doctor Visit', href: '/app/services/doctor-visit', color: 'bg-emerald-50 text-emerald-700', border: 'border-emerald-100' },
  { icon: Activity, label: 'Health Check', href: '/app/services', color: 'bg-blue-50 text-blue-700', border: 'border-blue-100' },
  { icon: CalendarDays, label: 'My Bookings', href: '/app/account', color: 'bg-violet-50 text-violet-700', border: 'border-violet-100' },
  { icon: Heart, label: 'Wellness', href: '/app/wellness', color: 'bg-rose-50 text-rose-700', border: 'border-rose-100' },
  { icon: FileText, label: 'Reports', href: '/app/account', color: 'bg-amber-50 text-amber-700', border: 'border-amber-100' },
  { icon: Ambulance, label: 'Emergency', href: '#sos', color: 'bg-red-50 text-red-600', border: 'border-red-100' },
];

const STATS = [
  { label: 'Doctors Available', value: '48', sub: 'Right now', icon: Stethoscope, color: 'text-emerald-600' },
  { label: 'Avg. Response', value: '45m', sub: 'To your door', icon: Clock, color: 'text-blue-600' },
  { label: 'Active Plans', value: '3', sub: 'Services', icon: Shield, color: 'text-violet-600' },
  { label: 'Health Score', value: '92%', sub: 'Excellent', icon: Activity, color: 'text-rose-600' },
];

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuthStore();
  const { useBookings, useNotifications, useProfile } = useUserHooks();
  const { useHomeConfig } = useSDUIHooks();
  
  const { data: config, isLoading: configLoading } = useHomeConfig();
  const { data: bookings, isLoading: bookingsLoading } = useBookings();
  const { data: notificationsData, isLoading: notificationsLoading } = useNotifications();
  const { data: profile } = useProfile();

  const [showNotifications, setShowNotifications] = React.useState(false);

  // Derived Values
  const totalBookingsCount = bookings?.length || 0;
  const activePlan = profile?.subscriptions?.find((s: Record<string, unknown>) => s.status === 'ACTIVE')?.plan?.name || 'Guest User';
  const nextBooking = bookings ? [...bookings]
    .filter(b => b.scheduledDate && new Date(b.scheduledDate) > new Date() && !['CANCELLED', 'PENDING'].includes(b.status))
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())[0] : null;

  const notifications = notificationsData || [];
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const queryClient = useQueryClient();

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch (e) { console.error(e); }
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const allServices = (config?.sections || [])
    .flatMap(s => s.services)
    .filter(s => s.enabled)
    .slice(0, 8);

  const banner = config?.banners?.[0];

  return (
    <div className="min-h-screen bg-[var(--color-bg-screen)]">
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* ── Top Bar ── */}
        <div className="flex items-center justify-between mb-8">
          <div>
            {authLoading ? (
              <div className="h-8 w-48 bg-gray-200 animate-pulse rounded-lg" />
            ) : (
              <h1 className="text-2xl font-bold text-gray-900">
                {greeting()}, {user?.name?.split(' ')[0] || 'there'} 👋
              </h1>
            )}
            <p className="text-sm text-gray-500 mt-0.5">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="flex items-center gap-3 relative">
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2.5 rounded-xl border transition-all relative ${
                  showNotifications ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm' : 'bg-white border-gray-100 text-gray-600 hover:shadow-md'
                }`}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <>
                    <div 
                      className="fixed inset-0 z-[110]" 
                      onClick={() => setShowNotifications(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 15, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 15, scale: 0.95 }}
                      className="absolute right-0 mt-3 w-80 sm:w-96 bg-white/95 backdrop-blur-xl border border-gray-100 rounded-2xl shadow-2xl z-[120] overflow-hidden"
                    >
                      <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-white/50">
                        <h3 className="font-bold text-gray-900">Notifications</h3>
                        <button 
                          onClick={async () => {
                            await notificationService.markAllAsRead();
                            queryClient.invalidateQueries({ queryKey: ['notifications'] });
                          }}
                          className="text-xs font-bold text-[var(--color-primary)] hover:underline"
                        >
                          Mark all as read
                        </button>
                      </div>
                      
                      <div className="max-h-[70vh] overflow-y-auto overflow-x-hidden scrollbar-thin">
                        {notificationsLoading ? (
                          <div className="p-8 flex flex-col items-center gap-3">
                            <motion.div 
                              animate={{ rotate: 360 }} 
                              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                            >
                              <Loader2 className="w-6 h-6 text-gray-300" />
                            </motion.div>
                            <p className="text-xs text-gray-400">Fetching alerts...</p>
                          </div>
                        ) : notifications.length === 0 ? (
                          <div className="p-12 text-center text-gray-400">
                            <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                            <p className="text-sm">No new notifications</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-50">
                            {notifications.map(n => (
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
                                  <p className="text-xs text-gray-600 leading-relaxed">{n.body}</p>
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
            </div>
            
            <button 
              className="flex items-center gap-2 bg-red-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-red-500/30 hover:bg-red-600 transition-colors"
              onClick={() => {/* SOS logic */}}
            >
              🚨 SOS
            </button>
          </div>
        </div>

        {/* ── Main Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left Column (2/3 width) ── */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* Hero Banner */}
            {configLoading ? (
              <div className="h-52 bg-gray-100 animate-pulse rounded-2xl" />
            ) : banner?.enabled && (
              <div className="relative h-52 rounded-2xl overflow-hidden shadow-lg group cursor-pointer">
                <Image
                  src="https://storage.googleapis.com/oldful-assets/mobile/assets/images/welcome_banner.png"
                  alt={banner.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="900px"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent flex flex-col justify-end p-8">
                  <span className="text-emerald-300 text-xs font-bold uppercase tracking-widest mb-2">
                    {greeting()}
                  </span>
                  <h2 className="text-white font-bold text-2xl leading-tight max-w-sm">
                    {new Date().getHours() >= 16 
                      ? `Good Evening, Mr. ${user?.name || 'Member'}`
                      : `How can we help you, ${user?.name?.split(' ')[0] || 'Member'}?`}
                  </h2>
                  <p className="text-white/80 text-sm mt-2">
                    {new Date().getHours() >= 16 
                      ? "Ready for your evening wellness check?"
                      : "Your health journey continues here."}
                  </p>
                  <button className="mt-5 self-start flex items-center gap-1 bg-white text-[var(--color-primary-deep)] text-sm font-bold px-6 py-2.5 rounded-full hover:bg-emerald-50 shadow-lg transition-all active:scale-95">
                    Start Now <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {STATS.map(stat => (
                <div key={stat.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all">
                  <stat.icon className={`w-5 h-5 ${stat.color} mb-3`} />
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-xs font-semibold text-gray-500 mt-0.5">{stat.label}</div>
                  <div className="text-xs text-gray-400">{stat.sub}</div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-bold text-gray-900">Quick Actions</h2>
                <Link href="/app/services" className="text-xs text-[var(--color-primary)] font-semibold flex items-center gap-1 hover:gap-2 transition-all">
                  All Services <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {QUICK_ACTIONS.map(action => (
                  <Link
                    key={action.label}
                    href={action.href}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border ${action.border} ${action.color} hover:shadow-sm transition-all group`}
                  >
                    <action.icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold text-center leading-tight">{action.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Services Grid */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-bold text-gray-900">Our Services</h2>
                <Link href="/app/services" className="text-xs text-[var(--color-primary)] font-semibold flex items-center gap-1 hover:gap-2 transition-all">
                  Browse all <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              {configLoading ? (
                <div className="grid grid-cols-4 gap-3">
                  {[...Array(8)].map((_, i) => <div key={i} className="h-24 bg-gray-50 animate-pulse rounded-xl" />)}
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {allServices.map(service => (
                    <Link
                      key={service.id}
                      href={service.route}
                      className="flex flex-col items-center gap-2 p-4 bg-[var(--color-bg-screen)] rounded-xl hover:bg-emerald-50 hover:shadow-sm border border-transparent hover:border-emerald-100 transition-all group"
                    >
                      <div className="w-12 h-12 relative">
                        <Image src={getAssetUrl(service.icon)} alt={service.label} fill className="object-contain group-hover:scale-110 transition-transform" />
                      </div>
                      <span className="text-[10px] font-bold text-gray-600 text-center leading-tight">{service.label.replace('\n', ' ')}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Right Sidebar (1/3 width) ── */}
          <div className="flex flex-col gap-4">

            {/* Profile Card */}
            <div className="bg-[var(--color-primary-deep)] text-white rounded-2xl p-5 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-xl font-bold overflow-hidden border-2 border-white/30">
                  {user?.profileImageUrl ? (
                    <Image src={user.profileImageUrl} alt={user.name || ''} width={48} height={48} className="w-full h-full object-cover" />
                  ) : (
                    user?.name?.[0] || 'U'
                  )}
                </div>
                <div>
                  <div className="font-bold text-white">{user?.name || 'Member'}</div>
                  <div className="text-emerald-300 text-xs">{user?.uniqueUserId || 'Oldful Member'}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[{ label: 'Bookings', val: String(totalBookingsCount) }, { label: 'Plan', val: activePlan }].map(s => (
                  <div key={s.label} className="bg-white/10 rounded-xl p-3 text-center">
                    <div className="font-bold text-lg truncate" title={s.val}>{s.val}</div>
                    <div className="text-white/60 text-[10px] uppercase tracking-wider">{s.label}</div>
                  </div>
                ))}
              </div>
              <Link href="/app/account" className="block w-full text-center bg-white/20 hover:bg-white/30 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                View Profile →
              </Link>
            </div>

            {/* Upcoming Appointment */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-[var(--color-primary)]" /> Upcoming
              </h3>
              <div className="flex flex-col gap-3">
                {bookingsLoading ? (
                  <div className="h-16 bg-gray-50 animate-pulse rounded-xl" />
                ) : nextBooking ? (
                  <div className="flex items-center gap-3 p-3 bg-[var(--color-bg-screen)] rounded-xl">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-xl">
                      {nextBooking.service?.name?.toLowerCase().includes('doctor') ? '👨‍⚕️' : '🏥'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-800 truncate">{nextBooking.service?.name}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(nextBooking.scheduledDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, 
                        {nextBooking.scheduledTime || 'TBD'}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full capitalize">
                      {nextBooking.status.toLowerCase()}
                    </span>
                  </div>
                ) : (
                  <div className="text-center py-4 px-2">
                    <p className="text-xs text-gray-500 mb-3">No upcoming bookings scheduled.</p>
                    <Link href="/app/services" className="text-xs font-bold text-[var(--color-primary)] hover:underline">
                      Book a Service now
                    </Link>
                  </div>
                )}
              </div>
              <Link 
                href="/app/account?tab=bookings" 
                className="mt-4 block w-full text-xs text-[var(--color-primary)] font-bold text-center hover:underline"
              >
                View all bookings →
              </Link>
            </div>

            {/* Health Tip */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">Health Tip</span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                Stay hydrated! Elderly adults should aim for 6–8 glasses of water daily to maintain cognitive function and reduce fall risk.
              </p>
            </div>

            {/* Search */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search services..."
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-[var(--color-bg-screen)] rounded-xl outline-none focus:ring-2 ring-[var(--color-primary)]/20 transition-all"
                  onClick={() => router.push('/app/services')}
                  readOnly
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

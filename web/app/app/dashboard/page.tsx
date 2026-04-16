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
import { useUserHooks, USER_QUERY_KEYS } from '@/hooks/useUserHooks';
import { getAssetUrl } from '@/utils/getAssetUrl';
import { notificationService } from '@/services/api/notificationService';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { NotificationDropdown } from '@/components/dashboard/NotificationDropdown';

const QUICK_ACTIONS = [
  { icon: Stethoscope, label: 'Doctor Visit', href: '/app/services/doctor-home-visit', color: 'bg-emerald-50 text-emerald-700', border: 'border-emerald-100' },
  { icon: Activity, label: 'Health Check', href: '/app/services/blood-test', color: 'bg-blue-50 text-blue-700', border: 'border-blue-100' },
  { icon: CalendarDays, label: 'My Bookings', href: '/app/account?tab=bookings', color: 'bg-violet-50 text-violet-700', border: 'border-violet-100' },
  { icon: Heart, label: 'Wellness', href: '/wellness', color: 'bg-rose-50 text-rose-700', border: 'border-rose-100' },
  { icon: FileText, label: 'Medical Card', href: '/app/account?tab=medical', color: 'bg-amber-50 text-amber-700', border: 'border-amber-100' },
  { icon: Ambulance, label: 'Emergency', href: '/app/account?tab=medical', color: 'bg-red-50 text-red-600', border: 'border-red-100' },
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
  const { data: bookingsData, isLoading: bookingsLoading } = useBookings();
  const { data: notificationsData, isLoading: notificationsLoading } = useNotifications();
  const { data: profile, isLoading: profileLoading } = useProfile();

  const [showNotifications, setShowNotifications] = React.useState(false);

  // Derived Values
  // Filter out ghost/failed bookings (Synchronized with Account page logic)
  const bookings = (bookingsData || []).filter(b => {
    const s = b.status?.toUpperCase();
    return s !== 'PAYMENT_PENDING' && s !== 'PAYMENT_FAILED';
  });
  
  const totalBookingsCount = bookings.length;
  const activePlan = profile?.subscriptions?.find((s) => s.status === 'ACTIVE')?.plan?.name || 'Guest User';
  const notifications = notificationsData || [];
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const queryClient = useQueryClient();

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.notifications });
    } catch (e) { console.error(e); }
  };

  const greeting = React.useCallback(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const allServices = React.useMemo(() => (config?.sections || [])
    .flatMap(s => s.services)
    .filter(s => s.enabled)
    .slice(0, 8), [config]);

  const banner = config?.banners?.[0];

  const upcomingUpcoming = React.useMemo(() => {
    if (!bookings) return [];
    const now = new Date();
    // Reset hours for date comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return [...bookings]
      .filter(b => {
        if (!b.scheduledDate) return false;
        const s = b.status?.toUpperCase();
        if (s === 'CANCELLED' || s === 'COMPLETED') return false;
        
        const bDate = new Date(b.scheduledDate);
        return bDate >= today; 
      })
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
  }, [bookings]);


  const getStatusStyles = (status: string) => {
    const s = status.toUpperCase();
    if (s.includes('PENDING') || s === 'PAYMENT_PENDING') return 'text-amber-600 bg-amber-50';
    if (s.includes('FAILED') || s === 'CANCELLED') return 'text-red-600 bg-red-50';
    return 'text-emerald-600 bg-emerald-50';
  };

  // Dynamic Stats
  const emergencyContactsCount = profile?.emergencyContacts?.length || 0;
  
  const STATS = [
    { 
      label: 'My Bookings', 
      value: bookingsLoading ? '—' : String(totalBookingsCount), 
      sub: 'All time', 
      icon: CalendarDays, 
      color: 'text-emerald-600' 
    },
    { 
      label: 'Unread Alerts', 
      value: notificationsLoading ? '—' : String(unreadCount), 
      sub: 'Notifications', 
      icon: Bell, 
      color: 'text-blue-600' 
    },
    { 
      label: 'Emergency', 
      value: profileLoading ? '—' : String(emergencyContactsCount), 
      sub: 'Contacts set', 
      icon: Heart, 
      color: 'text-rose-600' 
    },
    { 
      label: 'Active Plan', 
      value: profileLoading ? '—' : (activePlan === 'Guest User' ? 'None' : activePlan.split(' ')[0]), 
      sub: 'Subscription', 
      icon: Shield, 
      color: 'text-violet-600' 
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-bg-screen)]">
      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex-1 min-w-0">
            {profileLoading ? (
              <div className="h-8 w-48 bg-gray-200 animate-pulse rounded-lg" />
            ) : (
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words pr-4">
                {greeting()}, {user?.name?.split(' ')[0] || 'there'} 👋
              </h1>
            )}
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="flex items-center gap-3 relative shrink-0">
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

              <NotificationDropdown 
                isOpen={showNotifications}
                onClose={() => setShowNotifications(false)}
                notifications={notifications}
                isLoading={notificationsLoading}
              />
            </div>
            
            <button 
              className="flex items-center gap-2 bg-red-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-red-500/30 hover:bg-red-600 transition-colors"
              onClick={() => router.push('/app/sos')}
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
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative min-h-[185px] h-auto rounded-2xl overflow-hidden shadow-lg group cursor-pointer"
            >
                <Image
                  src="https://storage.googleapis.com/oldful-assets/mobile/assets/images/welcome_banner.png"
                  alt={banner.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="900px"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent flex flex-col justify-end p-4 sm:p-6">
                  <span className="text-emerald-300 text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-1 sm:mb-2">
                    {greeting()}
                  </span>
                  <h2 className="text-white font-bold text-lg sm:text-2xl leading-tight max-w-[200px] sm:max-w-sm break-words">
                    {new Date().getHours() >= 16 
                      ? `Good Evening, ${user?.name || 'Member'}`
                      : `How can we help you, ${user?.name?.split(' ')[0] || 'Member'}?`}
                  </h2>
                  <p className="text-white/80 text-[11px] sm:text-sm mt-1 sm:mt-2 line-clamp-2">
                    {new Date().getHours() >= 16 
                      ? "Ready for your evening wellness check?"
                      : "Your health journey continues here."}
                  </p>
                  <button 
                    onClick={() => router.push('/app/services')}
                    className="mt-5 self-start flex items-center gap-1 bg-white text-[var(--color-primary-deep)] text-sm font-bold px-6 py-2.5 rounded-full hover:bg-emerald-50 shadow-lg transition-all active:scale-95"
                  >
                    Start Now <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
            </motion.div>
        )}

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-4"
            >
              {STATS.map((stat, i) => (
                <motion.div 
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 + (i * 0.05) }}
                  className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all"
                >
                  <stat.icon className={`w-5 h-5 ${stat.color} mb-3`} />
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-xs font-semibold text-gray-500 mt-0.5">{stat.label}</div>
                  <div className="text-xs text-gray-400">{stat.sub}</div>
                </motion.div>
              ))}
            </motion.div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-900">Quick Actions</h2>
                <Link href="/app/services" className="text-xs text-[var(--color-primary)] font-semibold flex items-center gap-1 hover:gap-2 transition-all">
                  All Services <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
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
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
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
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-[var(--color-primary-deep)] text-white rounded-2xl p-5 shadow-lg"
            >
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
                {[{ label: 'Bookings', val: bookingsLoading ? '—' : String(totalBookingsCount) }, { label: 'Plan', val: profileLoading ? '—' : activePlan }].map(s => (
                  <div key={s.label} className="bg-white/10 rounded-xl p-3 text-center">
                    <div className="font-bold text-lg truncate" title={s.val}>{s.val}</div>
                    <div className="text-white/60 text-[10px] uppercase tracking-wider">{s.label}</div>
                  </div>
                ))}
              </div>
              <Link href="/app/account" className="block w-full text-center bg-white/20 hover:bg-white/30 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                View Profile →
              </Link>
            </motion.div>

            {/* Upcoming Appointment */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-[var(--color-primary)]" /> Upcoming
              </h3>
              <div className="flex flex-col gap-3">
                {bookingsLoading ? (
                  <div className="h-16 bg-gray-50 animate-pulse rounded-xl" />
                ) : upcomingUpcoming.length > 0 ? (
                  <div className="flex flex-col gap-3 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
                    {upcomingUpcoming.map((booking) => (
                      <div key={booking.id} className="flex items-center gap-3 p-3 bg-[var(--color-bg-screen)] rounded-xl border border-gray-100/50">
                        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-xl shrink-0">
                          {booking.service?.slug?.toLowerCase().includes('doctor') ? '👨‍⚕️' : '🏥'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-800 truncate">{booking.service?.name}</div>
                          <div className="text-[10px] text-gray-500">
                            {new Date(booking.scheduledDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, 
                            {booking.scheduledTime || 'TBD'}
                          </div>
                        </div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full capitalize shrink-0 ${getStatusStyles(booking.status)}`}>
                          {booking.status.toLowerCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 px-2">
                    <p className="text-[11px] text-gray-500 mb-2">No upcoming bookings scheduled.</p>
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
                Stay active with Oldful! Regular walking for 30 minutes daily strengthens heart health and mobility. Need a walking partner? Contact us!
              </p>
            </div>

            {/* Search removed as requested */}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, MapPin, FileText, Heart, Settings, HelpCircle,
  LogOut, ChevronRight, Shield, Bell, Phone, Mail,
  Edit3, Plus, Trash2, CheckCircle2, AlertCircle,
  Clock, Package, Stethoscope, Activity, Camera,
  Save, X, Loader2, ExternalLink, UploadCloud, History, Image as LucideImage
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { userService, UserProfile, Address, EmergencyContact, MedicalCard, Booking, HealthReport } from '@/services/api/userService';
import { useUserHooks, USER_QUERY_KEYS } from '@/hooks/useUserHooks';
import { getServiceConfig } from '@/lib/services-config';
import { getAssetUrl } from '@/utils/getAssetUrl';
import { formatPrice } from '@/utils/formatPrice';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { PhoneInput } from '@/components/common/PhoneInput';
import { toast } from 'sonner';

// ─── Query Keys ────────────────────────────────────────────────────────────
// Standardized query keys are now handled via useUserHooks.

// ─── Tab types ──────────────────────────────────────────────────────────────
type TabId = 'profile' | 'bookings' | 'addresses' | 'medical' | 'preferences' | 'support' | 'prescriptions';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'profile',       label: 'Profile',       icon: User },
  { id: 'bookings',      label: 'Bookings',      icon: Package },
  { id: 'addresses',     label: 'Addresses',        icon: MapPin },
  { id: 'prescriptions', label: 'Prescriptions', icon: FileText },
  { id: 'medical',       label: 'Medical Card',     icon: Heart },
  { id: 'preferences',   label: 'Preferences',      icon: Settings },
  { id: 'support',       label: 'Help & Support',   icon: HelpCircle },
];

const BOOKING_STATUS_STYLE: Record<string, string> = {
  CONFIRMED:       'bg-emerald-50 text-emerald-700 border-emerald-200',
  COMPLETED:       'bg-gray-100 text-gray-600 border-gray-200',
  CANCELLED:       'bg-red-50 text-red-600 border-red-100',
  PENDING:         'bg-amber-50 text-amber-700 border-amber-200',   // COD — real booking
  IN_PROGRESS:     'bg-blue-50 text-blue-700 border-blue-200',
  ASSIGNED:        'bg-indigo-50 text-indigo-700 border-indigo-200',
  PAYMENT_PENDING: 'bg-orange-50 text-orange-600 border-orange-200',// Awaiting payment
  PAYMENT_FAILED:  'bg-red-50 text-red-500 border-red-100',         // Failed /cancelled
};

// ─── Reusable UI atoms ──────────────────────────────────────────────────────
function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-4 ${className}`}>{children}</div>;
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      {action}
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center text-gray-400">
      <Icon className="w-10 h-10 opacity-30" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

// ─── Profile Tab ────────────────────────────────────────────────────────────
function ProfileTab({ profile }: { profile: UserProfile }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: profile.name || '',
    email: profile.email || '',
    gender: profile.gender || '',
    dateOfBirth: profile.dateOfBirth?.split('T')[0] || '',
  });

  const { useUpdateProfile } = useUserHooks();
  const updateMut = useUpdateProfile();

  const avatarMut = useMutation({
    mutationFn: (file: File) => userService.uploadAvatar(file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USER_QUERY_KEYS.profile });
      toast.success('Profile picture updated');
    },
    onError: () => {
      toast.error('Failed to upload profile picture');
    }
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) avatarMut.mutate(f);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Avatar + summary */}
      <SectionCard className="flex items-center gap-5">
        <div className="relative shrink-0">
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[var(--color-primary-deep)] flex items-center justify-center text-3xl font-bold text-white">
            {profile.profileImageUrl
              ? <Image src={profile.profileImageUrl} alt={profile.name} width={80} height={80} className="w-full h-full object-cover" />
              : profile.name?.[0]}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:border-[var(--color-primary)] transition-colors"
          >
            {avatarMut.isPending ? <Loader2 className="w-5 h-5 animate-spin text-emerald-600" /> : <Camera className="w-3.5 h-3.5 text-gray-500" />}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-gray-900 text-lg truncate">{profile.name}</div>
          <div className="text-sm text-gray-500">{profile.phone}</div>
          <div className="text-xs text-gray-400 mt-0.5">{profile.uniqueUserId}</div>
          <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Verified Member
          </span>
        </div>
        <button
          onClick={() => setEditing(!editing)}
          className="shrink-0 flex items-center gap-1.5 text-sm font-semibold text-[var(--color-primary)] border border-[var(--color-primary)]/30 px-3 py-1.5 rounded-xl hover:bg-emerald-50 transition-colors"
        >
          {editing ? <><X className="w-4 h-4" /> Cancel</> : <><Edit3 className="w-4 h-4" /> Edit</>}
        </button>
      </SectionCard>

      {/* Edit form or read-only fields */}
      {editing ? (
        <SectionCard>
          <SectionHeader title="Edit Profile" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            {([
              { key: 'name', label: 'Full Name', type: 'text', icon: User },
              { key: 'email', label: 'Email Address', type: 'email', icon: Mail },
              { key: 'gender', label: 'Gender', type: 'text', icon: User },
              { key: 'dateOfBirth', label: 'Date of Birth', type: 'date', icon: Activity },
            ] as const).map(field => (
              <div key={field.key}>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">{field.label}</label>
                <div className="relative">
                  <field.icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={field.type}
                    value={form[field.key]}
                    onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                    className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[var(--color-primary)] transition-all"
                  />
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => updateMut.mutate(form, { 
              onSuccess: () => {
                setEditing(false);
                toast.success('Profile updated successfully');
              },
              onError: () => {
                toast.error('Failed to update profile');
              }
            })}
            disabled={updateMut.isPending}
            className="flex items-center gap-2 bg-[var(--color-primary-deep)] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-[#023d22] transition-colors disabled:opacity-50"
          >
            {updateMut.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save Changes
          </button>
        </SectionCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: 'Phone', value: profile.phone, icon: Phone },
            { label: 'Email', value: profile.email || 'Not added', icon: Mail },
            { label: 'Gender', value: profile.gender || '—', icon: User },
            { label: 'Member ID', value: profile.uniqueUserId, icon: Shield },
            { label: 'City', value: profile.city?.name || '—', icon: MapPin },
            { label: 'Health Tag', value: profile.healthTag || 'NORMAL', icon: Activity },
          ].map(f => (
            <SectionCard key={f.label} className="!p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <f.icon className="w-4 h-4 text-gray-400" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{f.label}</span>
              </div>
              <div className="text-sm font-semibold text-gray-900">{f.value}</div>
            </SectionCard>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Bookings Tab ────────────────────────────────────────────────────────────
function BookingsTab() {
  const router = useRouter();
  const qc = useQueryClient();
  const { useBookings, useCancelBooking } = useUserHooks();
  const { data: bookingsData, isLoading } = useBookings();

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);

  const cancelMut = useCancelBooking();

  const handleCancelClick = (id: string) => {
    setCancelId(id);
    setShowCancelModal(true);
  };

  const bookings: Booking[] = (bookingsData || []).filter((b: Booking) => {
    const s = b.status?.toUpperCase();
    return s !== 'PAYMENT_PENDING' && s !== 'PAYMENT_FAILED';
  });

  const upcoming = bookings.filter(b => ['PENDING', 'CONFIRMED', 'ASSIGNED', 'IN_PROGRESS'].includes(b.status));
  const past = bookings.filter(b => ['COMPLETED', 'CANCELLED'].includes(b.status));

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-2">
        {[
          { label: 'Total', value: bookings.length, icon: Package, color: 'text-gray-700 bg-gray-50' },
          { label: 'Upcoming', value: upcoming.length, icon: Clock, color: 'text-emerald-700 bg-emerald-50' },
          { label: 'Completed', value: past.filter(b => b.status === 'COMPLETED').length, icon: CheckCircle2, color: 'text-blue-700 bg-blue-50' },
        ].map(s => (
          <SectionCard key={s.label} className={`!p-4 flex items-center gap-3 ${s.color}`}>
            <s.icon className="w-5 h-5 shrink-0" />
            <div>
              <div className="text-xl font-bold">{isLoading ? '—' : s.value}</div>
              <div className="text-xs font-semibold">{s.label}</div>
            </div>
          </SectionCard>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-50 animate-pulse rounded-2xl" />)}
        </div>
      ) : bookings.length === 0 ? (
        <SectionCard>
          <EmptyState icon={Package} text="No bookings yet. Book your first service!" />
        </SectionCard>
      ) : (
        <div className="flex flex-col gap-3">
          {bookings.map(booking => (
            <SectionCard key={booking.id} className="hover:shadow-md transition-all !p-0 overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-[var(--color-bg-screen)] rounded-xl flex items-center justify-center shrink-0">
                      {booking.service?.slug && getServiceConfig(booking.service.slug) ? (
                        <Image 
                          src={getAssetUrl(getServiceConfig(booking.service.slug)!.icon)}
                          alt={booking.service.name} 
                          width={24} height={24} className="object-contain" 
                        />
                      ) : (
                        <Stethoscope className="w-5 h-5 text-[var(--color-primary)]" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-sm">{booking.service?.name || 'Healthcare Service'}</div>
                      <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {booking.scheduledDate
                          ? new Date(booking.scheduledDate).toLocaleDateString('en-IN', { dateStyle: 'medium' }) + ' · ' + (booking.scheduledTime || 'TBD')
                          : 'Time TBD'}
                      </div>
                      {booking.addressLine && (
                        <div className="text-[10px] sm:text-xs text-gray-400 mt-1 flex items-start gap-1 leading-normal max-w-[180px] sm:max-w-none break-words">
                          <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                          <span>{booking.addressLine}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${BOOKING_STATUS_STYLE[booking.status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                      {booking.status}
                    </span>
                    <div className="flex flex-col items-end">
                      {booking.amount && <span className="text-sm font-bold text-gray-900">₹{formatPrice(booking.amount)}</span>}
                      {booking.payments?.some((p) => p.status === 'SUCCESS') ? (
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 mt-1 flex items-center gap-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5" /> PAID
                        </span>
                      ) : booking.payments?.some((p) => p.status === 'REFUND_INITIATED') ? (
                        <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 mt-1 flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" /> REFUND PROCESSING
                        </span>
                      ) : booking.payments?.some((p) => p.status === 'REFUNDED') ? (
                        <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 mt-1 flex items-center gap-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5" /> REFUNDED
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 mt-1">
                           PAY ON ARRIVAL
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-5 pb-4 flex items-center justify-between border-t border-gray-50 pt-3">
                <span className="text-xs font-mono text-gray-400">{booking.bookingCode || booking.id.slice(0, 8).toUpperCase()}</span>
                <div className="flex items-center gap-3">
                  {['CONFIRMED', 'PENDING', 'ASSIGNED'].includes(booking.status) && (
                    <button
                      onClick={() => handleCancelClick(booking.id)}
                      disabled={cancelMut.isPending && cancelId === booking.id}
                      className="text-xs font-semibold text-red-500 hover:underline disabled:opacity-50"
                    >
                      {cancelMut.isPending && cancelId === booking.id ? 'Cancelling...' : 'Cancel'}
                    </button>
                  )}
                  <button 
                    onClick={() => router.push(`/app/account/bookings/${booking.id}`)}
                    className="text-xs font-semibold text-[var(--color-primary)] flex items-center gap-0.5 hover:underline"
                  >
                    Details <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </SectionCard>
          ))}
        </div>
      )}

      <ConfirmationModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={() => {
          if (!cancelId) return;
          cancelMut.mutate(cancelId, {
            onSuccess: () => {
              setShowCancelModal(false);
              setCancelId(null);
              toast.success('Booking cancelled successfully');
            },
            onError: (err: unknown) => {
              const e = err as { response?: { data?: { message?: string } }; message?: string };
              toast.error(e.response?.data?.message || e.message || 'Failed to cancel booking');
            }
          });
        }}
        title="Cancel Booking"
        message="Are you sure you want to cancel this booking? This action cannot be undone."
        confirmText="Yes, Cancel"
        cancelText="No, Keep It"
        type="danger"
        isLoading={cancelMut.isPending}
      />
    </div>
  );
}

// ─── Addresses Tab ───────────────────────────────────────────────────────────
function AddressesTab({ profile }: { profile: UserProfile }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ label: 'Home', line1: '', line2: '', landmark: '', pincode: '', cityName: '', state: '' });

  const addMut = useMutation({
    mutationFn: (data: Partial<Address>) => userService.addAddress(profile.id, data),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: USER_QUERY_KEYS.profile }); 
      setAdding(false); 
      setForm({ label: 'Home', line1: '', line2: '', landmark: '', pincode: '', cityName: '', state: '' }); 
    },
  });

  const updateMut = useMutation({
    mutationFn: (data: Partial<Address>) => userService.updateAddress(profile.id, editingId!, data),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: USER_QUERY_KEYS.profile }); 
      setEditingId(null); 
      setForm({ label: 'Home', line1: '', line2: '', landmark: '', pincode: '', cityName: '', state: '' }); 
    },
  });

  const deleteMut = useMutation({
    mutationFn: (addressId: string) => userService.deleteAddress(profile.id, addressId),
    onSuccess: () => qc.invalidateQueries({ queryKey: USER_QUERY_KEYS.profile }),
  });

  const handleEdit = (addr: Address) => {
    setEditingId(addr.id);
    setAdding(false);
    setForm({
      label: addr.label || 'Home',
      line1: addr.line1 || '',
      line2: addr.line2 || '',
      landmark: addr.landmark || '',
      pincode: addr.pincode || '',
      cityName: addr.cityName || '',
      state: addr.state || '',
    });
  };

  const handleCancel = () => {
    setAdding(false);
    setEditingId(null);
    setForm({ label: 'Home', line1: '', line2: '', landmark: '', pincode: '', cityName: '', state: '' });
  };

  const addresses: Address[] = profile.addresses || [];

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader
        title="Saved Addresses"
        action={
          <button
            onClick={() => { setAdding(!adding); setEditingId(null); }}
            className={`flex items-center gap-1.5 text-sm font-semibold border px-3 py-1.5 rounded-xl transition-colors ${
              adding 
                ? 'text-gray-500 border-gray-200 hover:bg-gray-50' 
                : 'text-[var(--color-primary)] border-[var(--color-primary)]/30 hover:bg-emerald-50'
            }`}
          >
            {adding ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Add Address</>}
          </button>
        }
      />

      {(adding || editingId) && (
        <SectionCard className={editingId ? 'border-amber-100 bg-amber-50/10' : ''}>
          <h3 className="text-sm font-bold text-gray-900 mb-4">
            {editingId ? 'Edit Address' : 'New Address'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {([
              { key: 'label', label: 'Label (Home/Work)', placeholder: 'Home' },
              { key: 'line1', label: 'Flat / Door No. / Line 1 *', placeholder: 'B-102 or Street name' },
              { key: 'line2', label: 'Area / Street / Line 2', placeholder: '12th Main Road...' },
              { key: 'landmark', label: 'Landmark', placeholder: 'Near ___' },
              { key: 'pincode', label: 'Pincode', placeholder: '560038' },
              { key: 'cityName', label: 'City', placeholder: 'Bangalore' },
              { key: 'state', label: 'State', placeholder: 'Karnataka' },
            ] as const).map(f => (
              <div key={f.key} className={(f.key === 'line1' || f.key === 'line2') ? 'sm:col-span-2' : ''}>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">{f.label}</label>
                <input
                  placeholder={f.placeholder}
                  value={form[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[var(--color-primary)] transition-all"
                />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => editingId ? updateMut.mutate(form) : addMut.mutate(form)}
              disabled={!form.line1 || addMut.isPending || updateMut.isPending}
              className="flex items-center gap-2 bg-[var(--color-primary-deep)] text-white px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-[#023d22] transition-colors"
            >
              {(addMut.isPending || updateMut.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editingId ? 'Update Address' : 'Save Address'}
            </button>
            {(adding || editingId) && (
              <button 
                onClick={handleCancel}
                className="text-sm font-semibold text-gray-500 hover:text-gray-700 px-3"
              >
                Cancel
              </button>
            )}
          </div>
        </SectionCard>
      )}

      {addresses.length === 0 && !adding ? (
        <SectionCard><EmptyState icon={MapPin} text="No addresses saved yet." /></SectionCard>
      ) : (
        <div className="flex flex-col gap-3">
          {addresses.map(addr => (
            <SectionCard key={addr.id}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-[var(--color-bg-screen)] rounded-xl flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-[var(--color-primary)]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-gray-900 text-sm">{addr.label || 'Address'}</span>
                      {addr.isDefault && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Default</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed max-w-sm">
                      {[addr.line1, addr.line2, addr.landmark, addr.cityName, addr.state, addr.pincode].filter(Boolean).join(', ')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button 
                    onClick={() => handleEdit(addr)}
                    className="p-2 hover:bg-emerald-50 rounded-lg transition-colors" title="Edit"
                  >
                    <Edit3 className="w-4 h-4 text-emerald-600" />
                  </button>
                  {!addr.isDefault && (
                    <button 
                      onClick={() => { if(confirm('Delete address?')) deleteMut.mutate(addr.id); }}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors" title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  )}
                </div>
              </div>
            </SectionCard>
          ))}
        </div>
      )}
    </div>
  );
}


// ─── Prescriptions Tab ───────────────────────────────────────────────────────
function PrescriptionsTab({ profile }: { profile: UserProfile }) {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const reports = profile.healthReports || [];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File sized exceeds 5MB limit');
      return;
    }

    setUploading(true);
    try {
      const title = file.name.split('.')[0].replace(/[-_]/g, ' ');
      const res = await userService.uploadHealthReport(profile.id, file, title);
      
      if (res.success) {
        toast.success('Prescription uploaded successfully');
        qc.invalidateQueries({ queryKey: USER_QUERY_KEYS.profile });
      } else {
        toast.error(res.message || 'Upload failed');
      }
    } catch (err) {
      toast.error('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const getSeverityStyles = (severity?: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL': return 'text-red-600 bg-red-50 border-red-100';
      case 'HIGH': return 'text-orange-600 bg-orange-50 border-orange-100';
      default: return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <SectionCard className="!p-0 overflow-hidden">
        <div className="p-6 flex items-center justify-between border-b border-gray-50 flex-wrap gap-4">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                 <History className="w-5 h-5" />
              </div>
              <div>
                 <h3 className="font-bold text-gray-900">Upload History</h3>
                 <p className="text-xs text-gray-400 font-medium">{reports.length} reports stored</p>
              </div>
           </div>

           <label className="relative cursor-pointer group">
              <input 
                type="file" 
                className="hidden" 
                accept="image/*,application/pdf"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              <div className="bg-[var(--color-primary)] text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-[var(--color-primary-deep)] hover:shadow-lg active:scale-95 transition-all disabled:opacity-50 text-sm">
                 {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                 <span>{uploading ? 'Uploading...' : 'Upload New'}</span>
              </div>
           </label>
        </div>

        <div className="p-6">
          {reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-12 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100">
               <FileText className="w-10 h-10 text-gray-200 mb-4" />
               <h4 className="text-sm font-bold text-gray-900 mb-1">No prescriptions yet</h4>
               <p className="text-xs text-gray-400 max-w-[200px] mx-auto leading-relaxed">
                 Upload your first prescription or medical lab report here.
               </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reports.map((report: HealthReport) => (
                <div 
                  key={report.id}
                  className="group bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all flex flex-col gap-3 relative"
                >
                  <div className="flex items-start gap-3">
                     <div className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${report.fileType === 'pdf' ? 'bg-orange-50 text-orange-500' : 'bg-emerald-50 text-emerald-500'}`}>
                        {report.fileType === 'pdf' ? <FileText className="w-5 h-5" /> : <LucideImage className="w-5 h-5" />}
                     </div>
                     
                     <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 truncate pr-4 text-xs uppercase tracking-tight">{report.title}</h4>
                        <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
                          {new Date(report.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                     </div>

                     <a 
                       href={report.fileUrl} 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                     >
                       <ExternalLink className="w-4 h-4" />
                     </a>
                  </div>

                  {report.flagNote && (
                      <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[9px] font-bold border uppercase tracking-wider ${getSeverityStyles(report.flagSeverity)}`}>
                         <AlertCircle className="w-3 h-3" />
                         <span className="truncate">{report.flagSeverity}: {report.flagNote}</span>
                      </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Medical Card Tab ────────────────────────────────────────────────────────
function MedicalTab({ profile }: { profile: UserProfile }) {
  const qc = useQueryClient();
  const card: MedicalCard | undefined = profile.medicalCards?.[0];
  const [editing, setEditing] = useState(!card);
  const [form, setForm] = useState({
    bloodGroup: card?.bloodGroup || '',
    allergies: card?.allergies?.join(', ') || '',
    chronicConditions: card?.chronicConditions?.join(', ') || '',
    currentMedications: card?.currentMedications?.join(', ') || '',
  });

  // Emergency Contact state
  const [addingEc, setAddingEc] = useState(false);
  const [ecForm, setEcForm] = useState({ name: '', phone: '', relationship: '' });

  const upsertMut = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        allergies: form.allergies ? form.allergies.split(',').map(s => s.trim()).filter(Boolean) : [],
        chronicConditions: form.chronicConditions ? form.chronicConditions.split(',').map(s => s.trim()).filter(Boolean) : [],
        currentMedications: form.currentMedications ? form.currentMedications.split(',').map(s => s.trim()).filter(Boolean) : [],
      };
      return userService.upsertMedicalCard(profile.id, payload);
    },
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: USER_QUERY_KEYS.profile }); 
      setEditing(false); 
      toast.success('Medical Card updated');
    },
  });

  const addEcMut = useMutation({
    mutationFn: (data: Omit<EmergencyContact, 'id'>) => userService.addEmergencyContact(profile.id, data),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: USER_QUERY_KEYS.profile }); 
      setAddingEc(false);
      setEcForm({ name: '', phone: '', relationship: '' });
      toast.success('Emergency contact added');
    },
  });

  const removeEcMut = useMutation({
    mutationFn: (contactId: string) => userService.removeEmergencyContact(profile.id, contactId),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: USER_QUERY_KEYS.profile }); 
      toast.success('Emergency contact removed');
    },
  });

  return (
    <div className="flex flex-col gap-5">
      {/* Visual card */}
      <div className="bg-gradient-to-br from-[var(--color-primary-deep)] to-[#026b47] rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-emerald-300 text-xs font-bold uppercase tracking-widest mb-1">Ayuxa Health ID</div>
            <div className="text-xl font-bold">Medical Card</div>
            <div className="text-white/50 text-xs">{profile.uniqueUserId}</div>
          </div>
          <Heart className="w-8 h-8 text-white/20" />
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {[
            { label: 'Blood Group', value: card?.bloodGroup || '—' },
            { label: 'Patient', value: profile.name },
            { label: 'Allergies', value: card?.allergies?.join(', ') || 'None' },
            { label: 'Conditions', value: card?.chronicConditions?.join(', ') || 'None' },
          ].map(item => (
            <div key={item.label}>
              <div className="text-white/50 text-xs mb-0.5">{item.label}</div>
              <div className="font-semibold truncate">{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {!card && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">Your medical card is empty. Fill it in so our doctors can provide better care.</p>
        </div>
      )}

      {/* Edit/View Form */}
      <SectionCard>
        <SectionHeader
          title="Health Details"
          action={
            <button
              onClick={() => setEditing(!editing)}
              className="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-primary)] hover:underline"
            >
              {editing ? <><X className="w-4 h-4" /> Cancel</> : <><Edit3 className="w-4 h-4" /> Update</>}
            </button>
          }
        />

        {editing ? (
          <div className="flex flex-col gap-4">
            {([
              { key: 'bloodGroup', label: 'Blood Group', placeholder: 'e.g. B+' },
              { key: 'allergies', label: 'Known Allergies', placeholder: 'e.g. Penicillin, Dust' },
              { key: 'chronicConditions', label: 'Chronic Conditions', placeholder: 'e.g. Hypertension, Diabetes' },
              { key: 'currentMedications', label: 'Current Medications', placeholder: 'e.g. Amlodipine 5mg daily' },
            ] as const).map(f => (
              <div key={f.key}>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">{f.label}</label>
                <input
                  placeholder={f.placeholder}
                  value={form[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[var(--color-primary)] transition-all"
                />
              </div>
            ))}
            <button
               onClick={() => upsertMut.mutate()}
              disabled={upsertMut.isPending}
              className="flex items-center gap-2 bg-[var(--color-primary-deep)] text-white px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 w-fit hover:bg-[#023d22] transition-colors"
            >
              {upsertMut.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Save Medical Card
            </button>
          </div>
        ) : card ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Blood Group', value: card.bloodGroup, icon: Heart },
              { label: 'Allergies', value: card.allergies?.join(', '), icon: AlertCircle },
              { label: 'Chronic Conditions', value: card.chronicConditions?.join(', '), icon: Activity },
              { label: 'Current Medications', value: card.currentMedications?.join(', '), icon: FileText },
            ].map(f => (
              <div key={f.label} className="p-4 bg-[var(--color-bg-screen)] rounded-xl">
                <div className="flex items-center gap-2 mb-1.5">
                  <f.icon className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{f.label}</span>
                </div>
                <div className="text-sm font-medium text-gray-900">{f.value || 'Not set'}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">Click &quot;Update&quot; to fill in your medical details.</p>
        )}
      </SectionCard>

      {/* Emergency Contacts */}
      <div id="emergency-section" />
      <SectionCard>
        <SectionHeader 
          title="Emergency Contacts" 
          action={
            <button
              onClick={() => setAddingEc(!addingEc)}
              className="text-xs font-bold text-[var(--color-primary)] flex items-center gap-1 hover:underline"
            >
              {addingEc ? <><X className="w-3.5 h-3.5" /> Cancel</> : <><Plus className="w-3.5 h-3.5" /> Add New</>}
            </button>
          }
        />

        {addingEc && (
          <div className="bg-[var(--color-bg-screen)] p-4 rounded-xl mb-4 border border-emerald-100 flex flex-col gap-3">
             <div className="grid grid-cols-2 gap-3">
                <input 
                  placeholder="Full Name" 
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-100 rounded-lg outline-none focus:border-emerald-500"
                  value={ecForm.name}
                  onChange={e => setEcForm({...ecForm, name: e.target.value})}
                />
                <PhoneInput 
                  value={ecForm.phone}
                  onChange={val => setEcForm({...ecForm, phone: val})}
                  placeholder="Phone"
                  className="!space-y-0"
                />
             </div>
             <input 
                placeholder="Relationship (e.g. Son, Wife)" 
                className="w-full px-3 py-2 text-sm bg-white border border-gray-100 rounded-lg outline-none focus:border-emerald-500"
                value={ecForm.relationship}
                onChange={e => setEcForm({...ecForm, relationship: e.target.value})}
             />
             <button 
                disabled={!ecForm.name || !ecForm.phone || addEcMut.isPending}
                onClick={() => {
                  if (ecForm.phone.length < 10) {
                    toast.error('Please enter a valid 10-digit phone number');
                    return;
                  }
                  addEcMut.mutate(ecForm);
                }}
                className="bg-[var(--color-primary-deep)] text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 disabled:bg-gray-300 transition-all active:scale-[0.98]"
             >
                {addEcMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Contact
             </button>
          </div>
        )}

        {profile.emergencyContacts?.length > 0 ? (
          <div className="flex flex-col gap-3">
            {profile.emergencyContacts.map((ec: EmergencyContact) => (
              <div key={ec.id} className="flex items-center justify-between p-3 bg-[var(--color-bg-screen)] rounded-xl group relative">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-red-50 rounded-full flex items-center justify-center">
                    <Phone className="w-4 h-4 text-red-500" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{ec.name}</div>
                    <div className="text-xs text-gray-500">{ec.phone} · {ec.relationship || 'Contact'}</div>
                  </div>
                </div>
                <button 
                  onClick={() => { if(confirm('Remove this contact?')) removeEcMut.mutate(ec.id); }}
                  disabled={removeEcMut.isPending}
                  className="p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : !addingEc && (
          <EmptyState icon={Phone} text="No emergency contacts added." />
        )}
      </SectionCard>
    </div>
  );
}

// ─── Preferences Tab ────────────────────────────────────────────────────────
function PreferencesTab({ profile }: { profile: UserProfile }) {
  const qc = useQueryClient();
  const [selectedLang, setSelectedLang] = useState(profile.preferredLanguage || 'en');

  const updateMut = useMutation({
    mutationFn: (data: Partial<UserProfile>) => userService.updateProfile(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USER_QUERY_KEYS.profile });
      toast.success('Preferences updated successfully');
    },
    onError: () => {
      toast.error('Failed to update preferences. Please try again.');
    }
  });

  const LANGS = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'हिन्दी' },
    { code: 'kn', label: 'ಕನ್ನಡ' },
    { code: 'ta', label: 'தமிழ்' },
    { code: 'te', label: 'తెలుగు' },
    { code: 'bn', label: 'বাংলা' },
  ];

  const NOTIF_PREFS = [
    { id: 'pushEnabled',           label: 'Push Notifications', sub: 'Booking updates, reminders', on: !!profile.pushEnabled },
    { id: 'smsEnabled',            label: 'SMS Alerts',         sub: 'Doctor arrival, status updates', on: !!profile.smsEnabled },
    { id: 'whatsappEnabled',       label: 'WhatsApp Updates',   sub: 'Booking confirmation on WhatsApp', on: !!profile.whatsappEnabled },
    { id: 'emailMarketingEnabled', label: 'Email Marketing',    sub: 'Health tips, new services', on: !!profile.emailMarketingEnabled },
  ] as const;

  return (
    <div className="flex flex-col gap-5">
      <SectionCard>
        <SectionHeader title="Notification Preferences" />
        <div className="divide-y divide-gray-50">
          {NOTIF_PREFS.map(pref => (
            <div key={pref.id} className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-gray-400" />
                <div>
                  <div className="text-sm font-semibold text-gray-800">{pref.label}</div>
                  <div className="text-xs text-gray-500">{pref.sub}</div>
                </div>
              </div>
              <button 
                onClick={() => updateMut.mutate({ [pref.id]: !pref.on })}
                disabled={updateMut.isPending}
                className={`w-12 h-7 rounded-full transition-all relative focus:outline-none ${pref.on ? 'bg-[var(--color-primary)] shadow-lg shadow-emerald-500/20' : 'bg-gray-200'}`}
              >
                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all ${pref.on ? 'left-6' : 'left-1'}`} />
                {updateMut.isPending && updateMut.variables && (updateMut.variables as Partial<UserProfile>)[pref.id as keyof UserProfile] !== undefined && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <Loader2 className={`w-5 h-5 animate-spin ${pref.on ? 'text-white' : 'text-emerald-600'}`} />
                  </div>
                )}
              </button>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard>
        <SectionHeader title="Preferred Language" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {LANGS.map(lang => (
            <button
              key={lang.code}
              onClick={() => { setSelectedLang(lang.code); updateMut.mutate({ preferredLanguage: lang.code }); }}
              className={`py-2.5 px-4 rounded-xl border text-sm font-semibold transition-all ${
                selectedLang === lang.code
                  ? 'border-[var(--color-primary)] bg-emerald-50 text-[var(--color-primary-deep)]'
                  : 'border-gray-100 text-gray-600 hover:border-gray-200'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
        {updateMut.isPending && (updateMut.variables as Partial<UserProfile>)?.preferredLanguage && <p className="text-xs text-gray-400 mt-2">Saving...</p>}
      </SectionCard>
    </div>
  );
}

// ─── Support Tab ────────────────────────────────────────────────────────────
function SupportTab() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    { q: 'How do I reschedule a booking?', a: 'You can reschedule any confirmed booking up to 2 hours before the scheduled time from the "Bookings" tab in your account.' },
    { q: 'How do I cancel and get a refund?', a: 'Cancellations made 2+ hours in advance are eligible for a full refund. Refunds typically take 5-7 business days to process.' },
    { q: 'Is my health data secure?', a: 'Yes, we use industry-standard encryption and follow strict privacy protocols to ensure your sensitive health data is always safe.' },
    { q: 'How do I add a family member?', a: 'You can book services for others by selecting "Book for Others" during checkout or managing family details in your profile settings.' },
    { q: 'What service areas do you cover?', a: 'Currently, we provide comprehensive home-healthcare services across Bangalore, Mysore, and Chennai. Check our "Locations" page for the latest updates.' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { label: 'Call Us', sub: '+91 80621 80429', icon: Phone, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
          { label: 'Email Support', sub: 'client@Ayuxa.com', icon: Mail, color: 'text-blue-700 bg-blue-50 border-blue-200' },
        ].map(item => (
          <div key={item.label} className={`${item.color} border rounded-2xl p-5`}>
            <item.icon className="w-6 h-6 mb-3" />
            <div className="font-bold text-sm mb-0.5">{item.label}</div>
            <div className="text-xs opacity-70 mb-3">{item.sub}</div>
          </div>
        ))}
      </div>
      <SectionCard>
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Frequently Asked</div>
        <div className="divide-y divide-gray-50">
          {faqs.map((faq, i) => (
            <div key={faq.q} className="py-0.5">
              <button 
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className={`w-full flex items-center justify-between py-4 text-sm font-medium rounded-xl px-2 transition-all text-left ${
                  openIndex === i ? 'text-[var(--color-primary-deep)] bg-emerald-50/50' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {faq.q}
                <ChevronRight className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-300 ${openIndex === i ? 'rotate-90 text-[var(--color-primary)]' : ''}`} />
              </button>
              {openIndex === i && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="overflow-hidden"
                >
                  <div className="px-2 pb-5 pt-3 text-sm text-gray-600 leading-relaxed border-t border-emerald-100/30 mt-1">
                    <div className="flex gap-2">
                       <span className="text-emerald-600 font-black text-[10px] uppercase tracking-wider mt-1 shrink-0">Answer:</span> 
                       <span className="font-medium">{faq.a}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Main Account Page Content ──────────────────────────────────────────────
function AccountContent() {
  const searchParams = useSearchParams();
  const { logout, user: authUser, isLoading: authLoading } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabId>('profile');

  React.useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'emergency') {
      setActiveTab('medical');
      // Small timeout to ensure the tab content is rendered before scrolling
      setTimeout(() => {
        const el = document.getElementById('emergency-section');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    } else if (tab && TABS.some(t => t.id === tab)) {
      setActiveTab(tab as TabId);
    }
  }, [searchParams]);

  const { useProfile } = useUserHooks();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const isLoading = authLoading || profileLoading;

  return (
    <div className="min-h-screen bg-[var(--color-bg-screen)]">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">

          {/* ── LEFT SIDEBAR ── */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            {/* Profile card */}
            <div className="bg-[var(--color-primary-deep)] rounded-2xl p-5 text-white">
              {isLoading ? (
                <div className="flex flex-col gap-3">
                  <div className="w-14 h-14 bg-white/20 rounded-2xl animate-pulse" />
                  <div className="h-4 w-28 bg-white/20 rounded animate-pulse" />
                  <div className="h-3 w-20 bg-white/10 rounded animate-pulse" />
                </div>
              ) : (
                <>
                  <div className="w-14 h-14 bg-white/20 rounded-2xl overflow-hidden flex items-center justify-center text-2xl font-bold mb-3">
                    {profile?.profileImageUrl
                      ? <Image src={profile.profileImageUrl} alt={profile.name} width={56} height={56} className="w-full h-full object-cover" />
                      : (profile?.name?.[0] ?? authUser?.name?.[0] ?? 'U')}
                  </div>
                  <div className="font-bold text-base">{profile?.name ?? authUser?.name ?? 'Member'}</div>
                  <div className="text-emerald-300 text-xs mt-0.5">{profile?.phone ?? authUser?.phone ?? ''}</div>
                  <div className="text-white/40 text-xs mt-0.5">{profile?.uniqueUserId ?? authUser?.uniqueUserId ?? ''}</div>
                </>
              )}
            </div>

            {/* Tabs navigation */}
            <nav className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all border-b border-gray-50 last:border-0 ${
                    activeTab === tab.id
                      ? 'bg-emerald-50 text-[var(--color-primary-deep)]'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <tab.icon className={`w-4 h-4 shrink-0 ${activeTab === tab.id ? 'text-[var(--color-primary)]' : 'text-gray-400'}`} />
                  <span className="text-sm font-semibold">{tab.label}</span>
                  {activeTab === tab.id && <div className="ml-auto w-1.5 h-1.5 bg-[var(--color-primary)] rounded-full" />}
                </button>
              ))}
            </nav>

            {/* Logout */}
            <button
              onClick={() => logout()}
              className="w-full flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl border border-gray-100 shadow-sm text-red-500 hover:bg-red-50 hover:border-red-200 transition-all text-sm font-semibold"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>

          {/* ── RIGHT CONTENT ── */}
          <div className="lg:col-span-3">
            {isLoading ? (
              <div className="flex flex-col gap-4">
                {[120, 180, 100].map((h, i) => (
                  <div key={i} style={{ height: h }} className="bg-white animate-pulse rounded-2xl border border-gray-100" />
                ))}
              </div>
            ) : !profile ? (
              <SectionCard className="text-center py-16">
                <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Could not load profile. Please try refreshing.</p>
              </SectionCard>
            ) : (
              <>
                {activeTab === 'profile'       && <ProfileTab profile={profile} />}
                {activeTab === 'bookings'      && <BookingsTab />}
                {activeTab === 'addresses'     && <AddressesTab profile={profile} />}
                {activeTab === 'prescriptions' && <PrescriptionsTab profile={profile} />}
                {activeTab === 'medical'       && <MedicalTab profile={profile} />}
                {activeTab === 'preferences'   && <PreferencesTab profile={profile} />}
                {activeTab === 'support'       && <SupportTab />}
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    }>
      <AccountContent />
    </React.Suspense>
  );
}

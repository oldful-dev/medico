'use client';

import { labService, LabPackage, TimeSlot } from '@/services/api/labService';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { formatPrice } from '@/utils/formatPrice';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Activity, AlertCircle, ArrowLeft, ArrowRight, CalendarDays, 
    ChevronDown, Clock, Loader2, MapPin, Search, Zap
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PhoneInput } from '@/components/common/PhoneInput';

interface LabSlot {
    slot_id: number;
    slot: string;
    slot_time?: string;
}

export default function LabTestBooking() {
    const { user } = useAuthStore();
    const { addItem, clearCart } = useCartStore();
    const router = useRouter();
    
    // UI State
    const [loading, setLoading] = useState(false);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    
    // Data State
    const [packages, setPackages] = useState<LabPackage[]>([]);
    const [availableSlots, setAvailableSlots] = useState<LabSlot[]>([]);
    
    // Selection State
    const [selectedPackage, setSelectedPackage] = useState<LabPackage | null>(null);
    const [bookingDate, setBookingDate] = useState('');
    const [selectedSlot, setSelectedSlot] = useState<LabSlot | null>(null);
    const [address, setAddress] = useState('');
    const [pincode, setPincode] = useState('');
    const [serviceability, setServiceability] = useState<'unchecked' | 'checking' | 'serviceable' | 'non-serviceable'>('unchecked');

    const [showFastingAlert, setShowFastingAlert] = useState(false);
    const [fastingAcknowledged, setFastingAcknowledged] = useState(false);

    const [coords, setCoords] = useState({ lat: "12.9716", long: "77.5946" });
    const [showAddressPicker, setShowAddressPicker] = useState(false);
    const [patientPhone, setPatientPhone] = useState(user?.phone || '');

    const reverseGeocode = async (lat: string, long: string) => {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${long}`);
            const data = await res.json();
            if (data?.display_name) {
                setAddress(data.display_name);
                const postcode = data.address?.postcode;
                if (postcode) setPincode(postcode);
            }
        } catch {
            // silently fail — user can type manually
        }
    };

    const checkServiceability = async (lat: string, long: string) => {
        setServiceability('checking');
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://oldful.onrender.com/api'}/labs/serviceability?lat=${lat}&lng=${long}`);
            const data = await res.json();
            // Backend returns { success: true, data: { status: 'success'|'failure', message: '...' } }
            const status = data?.data?.status;
            setServiceability(status === 'success' ? 'serviceable' : 'non-serviceable');
        } catch {
            setServiceability('unchecked');
        }
    };

    const updateAddressFromStored = (addr: { label?: string; line1: string; cityName?: string; pincode?: string; lat?: string; long?: string }) => {
        const label = addr.label || 'Saved Address';
        setAddress(`${label}: ${addr.line1}${addr.cityName ? ', ' + addr.cityName : ''}`);
        setPincode(addr.pincode || '');
        const newCoords = { lat: addr.lat || "12.9716", long: addr.long || "77.5946" };
        setCoords(newCoords);
        checkServiceability(newCoords.lat, newCoords.long);
    };

    useEffect(() => {
        fetchPackages();

        // Initial Location logic — auto-fill address if user has no saved addresses
        if (navigator.geolocation && !(user?.addresses?.length)) {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const lat = pos.coords.latitude.toString();
                    const long = pos.coords.longitude.toString();
                    setCoords({ lat, long });
                    await reverseGeocode(lat, long);
                    checkServiceability(lat, long);
                },
                (err) => {
                    console.log('Geolocation skipped:', err);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        }

        if (user?.addresses && user.addresses.length > 0) {
            const def = user.addresses.find(a => a.isDefault) || user.addresses[0];
            updateAddressFromStored(def);
        }
        if (user?.phone) {
            setPatientPhone(user.phone.replace('+91', ''));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    useEffect(() => {
        if (bookingDate) fetchSlots();
    }, [bookingDate]);

    useEffect(() => {
        if (pincode.length !== 6) return;
        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&postalcode=${pincode}&countrycodes=in&limit=1`);
                const data = await res.json();
                if (data?.[0]) {
                    const lat = data[0].lat;
                    const long = data[0].lon;
                    setCoords({ lat, long });
                    checkServiceability(lat, long);
                }
            } catch {
                // silently fail
            }
        }, 600);
        return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pincode]);

    const fetchPackages = async () => {
        setLoading(true);
        try {
            const res = await labService.searchPackages('');
            if (res.success) setPackages(res.data || []);
        } catch (err) {
            toast.error('Could not load test packages');
        } finally {
            setLoading(false);
        }
    };

    const fetchSlots = async () => {
        try {
            const res = await labService.getTimeSlots(bookingDate, coords.lat, coords.long);
            if (res.success) setAvailableSlots(res.data || []);
        } catch (err) {
            toast.error('Could not load time slots');
        }
    };

    const handleHoldBooking = async () => {
        if (!selectedPackage || !selectedSlot || !bookingDate || !address) {
            toast.error('Please complete all fields');
            return;
        }

        if (selectedPackage.fasting && !fastingAcknowledged) {
            setShowFastingAlert(true);
            return;
        }

        setBookingLoading(true);

        // Re-check serviceability at booking time in case coords changed without a check
        try {
            const svcRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://oldful.onrender.com/api'}/labs/serviceability?lat=${coords.lat}&lng=${coords.long}`);
            const svcData = await svcRes.json();
            if (svcData?.data?.status !== 'success') {
                toast.error('Home collection is not available at your location. Please update your address.');
                setServiceability('non-serviceable');
                setBookingLoading(false);
                return;
            }
            setServiceability('serviceable');
        } catch {
            // Network error — let booking proceed rather than blocking
        }
        try {
            const payload = {
                bookingType: 'HOME' as const,
                patient: {
                    name: user?.name || 'User',
                    age: 30,
                    gender: 'Male',
                    phone: patientPhone || user?.phone || '',
                },
                address: { lat: coords.lat, long: coords.long, pincode, line1: address },
                packages: [{ code: selectedPackage.code, name: selectedPackage.name, cost: selectedPackage.discounted_cost || selectedPackage.cost }],
                slot: { date: bookingDate, time: selectedSlot.slot || selectedSlot.slot_time || '', slotId: selectedSlot.slot_id }
            };

            const res = await labService.holdBooking(payload);
            if (res.success) {
                // Store raw discounted price — checkout applies GST + service fee on top
                const basePrice = selectedPackage.discounted_cost || selectedPackage.cost || 0;

                // Clear existing items (since lab booking is single-item checkout for now)
                clearCart();

                addItem({
                  type: 'service',
                  serviceId: 'blood-test',
                  name: selectedPackage.name,
                  price: basePrice,
                  redcliffeBookingId: res.data?.order?.redcliffeBookingId,
                  clientRefId: res.data?.order?.clientRefId,
                  slot: payload.slot,
                  address: address,
                  pincode: pincode,
                  packageCode: selectedPackage.code,
                  patient: payload.patient
                });

                toast.success('Slot reserved! Proceeding to payment...');
                router.push('/app/checkout');
            }
        } catch (err) {
            const error = err as Error;
            toast.error(error.message || 'Booking failed');
        } finally {
            setBookingLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--color-bg-screen)] pb-32">
            
            {/* ── OLDUL HEADER BANNER ── */}
            <div className="bg-[var(--color-primary-deep)] text-white pt-6 pb-16 px-6">
                <div className="max-w-4xl mx-auto flex items-start gap-4">
                    <button onClick={() => router.back()} className="mt-1 p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black mb-1">Diagnostic Labs</h1>
                        <p className="text-emerald-100/80 font-medium text-sm">Experience hospital-grade tests at home</p>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto -mt-8 px-6 grid grid-cols-1 gap-6">
                
                {/* ── STEP 1: TEST SELECTION ── */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[2rem] p-6 shadow-xl border border-gray-100">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                           <Activity className="w-5 h-5 text-emerald-500" /> 
                           What test or package do you need?
                        </h2>
                        {selectedPackage?.fasting && (
                             <div className="bg-amber-50 text-amber-600 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter border border-amber-100 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Fasting
                             </div>
                        )}
                    </div>

                    <div className="relative">
                        <button 
                            onClick={() => setIsOpen(!isOpen)}
                            className={`w-full h-16 px-6 rounded-2xl border-2 transition-all flex items-center justify-between group ${
                                isOpen ? 'border-emerald-500 bg-emerald-50/30' : 'border-gray-50 bg-gray-50 hover:border-emerald-200'
                            }`}
                        >
                            <div className="flex flex-col items-start min-w-0">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Select Test</span>
                                <span className="text-base font-bold text-gray-900 truncate w-full pr-4">
                                    {selectedPackage?.name || "Choose a lab package"}
                                </span>
                            </div>
                            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180 text-emerald-500' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {isOpen && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }} 
                                    animate={{ opacity: 1, y: 0 }} 
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute top-[105%] left-0 right-0 z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
                                >
                                    <div className="max-h-72 overflow-y-auto custom-scrollbar">
                                        {loading ? (
                                            <div className="p-8 flex items-center justify-center gap-3">
                                                <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                                                <span className="text-sm font-bold text-gray-400">Loading tests...</span>
                                            </div>
                                        ) : packages.map((pkg) => (
                                            <button 
                                                key={pkg.code}
                                                className={`w-full px-6 py-4 text-left border-b border-gray-50 last:border-0 transition-all ${
                                                    selectedPackage?.code === pkg.code ? 'bg-emerald-50 shadow-inner' : 'hover:bg-emerald-50/30'
                                                }`}
                                                onClick={() => {
                                                    setSelectedPackage(pkg);
                                                    setIsOpen(false);
                                                }}
                                            >
                                                <div className="flex items-center justify-between gap-4">
                                                    <span className={`font-bold text-sm ${selectedPackage?.code === pkg.code ? 'text-emerald-700' : 'text-gray-700'}`}>
                                                        {pkg.name}
                                                    </span>
                                                    <div className="flex flex-col items-end shrink-0">
                                                        <span className="text-emerald-600 font-black text-sm">₹{pkg.discounted_cost || pkg.cost}</span>
                                                        {(pkg.discounted_cost ?? 0) < (pkg.cost ?? 0) && (
                                                            <span className="text-[10px] text-gray-300 line-through">₹{pkg.cost}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                {pkg.tests_count && (
                                                    <div className="text-[10px] text-gray-400 font-bold mt-0.5">• {pkg.tests_count} Tests included</div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>

                {/* ── STEP 2: TIME & LOGISTICS ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Collection Date */}
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[2rem] p-6 shadow-md border border-gray-100">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Sample Collection Day</h3>
                        <div className="relative group">
                            <input 
                                type="date"
                                value={bookingDate}
                                onChange={(e) => setBookingDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full h-16 px-6 bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-emerald-50/20 rounded-2xl outline-none font-bold text-gray-900 transition-all cursor-pointer"
                            />
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none">
                                <CalendarDays className="w-5 h-5 text-gray-400" />
                            </div>
                        </div>
                    </motion.div>

                    {/* Time Slots */}
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[2rem] p-6 shadow-md border border-gray-100">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Choose Time Slot</h3>
                        {!bookingDate ? (
                            <div className="h-16 flex items-center justify-center border-2 border-dashed border-gray-100 rounded-2xl">
                                <p className="text-[10px] font-black text-gray-300 uppercase italic">Pick a date first</p>
                            </div>
                        ) : availableSlots.length === 0 ? (
                            <div className="h-16 flex items-center justify-center border-2 border-dashed border-amber-100 rounded-2xl bg-amber-50/20">
                                <p className="text-[10px] font-black text-amber-600 uppercase italic">No slots available for this date</p>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {availableSlots.map(s => (
                                    <button 
                                        key={s.slot_id}
                                        onClick={() => setSelectedSlot(s)}
                                        className={`flex-1 min-w-[100px] py-3 rounded-xl border-2 transition-all font-black text-[10px] flex items-center justify-center gap-1.5 ${
                                            selectedSlot?.slot_id === s.slot_id 
                                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md' 
                                            : 'border-gray-50 bg-gray-50 text-gray-500 hover:border-emerald-200'
                                        }`}
                                    >
                                        <Clock className="w-3 h-3" />
                                        {(s.slot || s.slot_time || "").split(' - ')[0]}
                                    </button>
                                ))}
                            </div>
                        )}
                    </motion.div>
                </div>

                {/* ── STEP 3: ADDRESS ── */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[2rem] p-6 shadow-md border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Collection Address</h3>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => {
                                    if (navigator.geolocation) {
                                        toast.info("Detecting your location...");
                                        navigator.geolocation.getCurrentPosition(
                                            async (pos) => {
                                                const lat = pos.coords.latitude.toString();
                                                const long = pos.coords.longitude.toString();
                                                setCoords({ lat, long });
                                                await reverseGeocode(lat, long);
                                                checkServiceability(lat, long);
                                                toast.success("Location detected!");
                                            },
                                            () => toast.error("Could not detect location. Please enter manually."),
                                            { enableHighAccuracy: true, timeout: 10000 }
                                        );
                                    }
                                }}
                                className="text-[10px] font-black text-emerald-600 uppercase flex items-center gap-1 hover:bg-emerald-50 px-2 py-1 rounded-lg transition-colors border border-emerald-100"
                            >
                                <Zap className="w-3 h-3" /> Detect
                            </button>
                            {user?.addresses && user.addresses.length > 0 && (
                                <button 
                                    onClick={() => setShowAddressPicker(true)}
                                    className="text-[10px] font-black text-emerald-600 uppercase flex items-center gap-1 hover:bg-emerald-50 px-2 py-1 rounded-lg transition-colors border border-emerald-100"
                                >
                                    <MapPin className="w-3 h-3" /> Saved
                                </button>
                            )}
                        </div>
                    </div>
                    
                    <div className="relative group mb-4">
                        <MapPin className="absolute left-6 top-6 w-5 h-5 text-emerald-500" />
                        <textarea 
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Enter full address for sample collection..."
                            className="w-full pl-16 pr-6 py-6 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-emerald-500 focus:bg-white outline-none transition-all text-sm font-medium min-h-[100px]"
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                        <div className="flex-1 h-14 relative group">
                            <input 
                                placeholder="Pincode"
                                value={pincode}
                                onChange={e => setPincode(e.target.value)}
                                className="w-full h-full px-6 bg-gray-50 border-2 border-transparent focus:border-emerald-500 rounded-xl outline-none font-bold text-sm text-gray-700"
                            />
                        </div>
                        <PhoneInput 
                            value={patientPhone}
                            onChange={setPatientPhone}
                            className="!space-y-0"
                            placeholder="Collection Contact"
                        />
                    </div>
                    {serviceability === 'checking' && (
                        <div className="bg-gray-50 text-gray-500 px-4 h-14 rounded-xl flex items-center gap-2 border border-gray-100 mt-4">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Checking serviceability...</span>
                        </div>
                    )}
                    {serviceability === 'serviceable' && (
                        <div className="bg-emerald-50 text-emerald-600 px-4 h-14 rounded-xl flex items-center gap-2 border border-emerald-100 mt-4">
                            <Zap className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Location is serviceable</span>
                        </div>
                    )}
                    {serviceability === 'non-serviceable' && (
                        <div className="bg-red-50 text-red-600 px-4 h-14 rounded-xl flex items-center gap-2 border border-red-100 mt-4">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Sorry, home collection not available at this location</span>
                        </div>
                    )}
                </motion.div>

            </div>

            {/* ── STICKY ACTIONS FOOTER ── */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-6 flex items-center justify-center z-[90]">
                 <div className="max-w-4xl w-full flex items-center justify-between gap-6">
                    <div className="hidden sm:block">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Payable</p>
                        <div className="flex flex-col">
                             <div className="flex items-baseline gap-2">
                                <p className="text-2xl font-black text-gray-900">
                                    ₹{formatPrice(
                                        (selectedPackage?.discounted_cost || selectedPackage?.cost || 0) * 1.18 + 50
                                    )}
                                </p>
                                {(selectedPackage?.discounted_cost || 0) < (selectedPackage?.cost || 0) && (
                                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-lg font-black uppercase">
                                        Saved ₹{formatPrice((selectedPackage?.cost || 0) - (selectedPackage?.discounted_cost || 0))}
                                    </span>
                                )}
                             </div>
                             <p className="text-[9px] text-gray-400 font-bold mt-0.5 italic">Incl. 18% GST + ₹50 Service Fee</p>
                        </div>
                    </div>
                    
                    <button 
                        onClick={handleHoldBooking}
                        disabled={!selectedSlot || bookingLoading || loading || serviceability === 'non-serviceable' || serviceability === 'checking'}
                        className="flex-1 sm:flex-none sm:min-w-[300px] h-14 bg-[var(--color-primary-deep)] text-white rounded-2xl font-black shadow-xl shadow-emerald-900/20 active:scale-[0.98] transition-all disabled:opacity-30 disabled:scale-100 flex items-center justify-center gap-3"
                    >
                        {bookingLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                {selectedPackage?.fasting ? 'Book Fasting Test' : 'Confirm & Book Now'}
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                 </div>
            </div>

            {/* ── FASTING ALERT MODAL ── */}
            <AnimatePresence>
                {showFastingAlert && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }} 
                            animate={{ scale: 1, opacity: 1 }} 
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full shadow-3xl text-center relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full -mr-8 -mt-8" />
                            
                            <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-8 relative z-10 shadow-lg shadow-amber-900/10">
                                <AlertCircle className="w-10 h-10" />
                            </div>
                            
                            <h3 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight leading-none">Fasting Required!</h3>
                            <p className="text-gray-500 text-sm font-bold leading-relaxed mb-10 px-4">
                                This test requires at least 10-12 hours of fasting. Please do not consume anything besides water.
                            </p>
                            
                            <div className="flex flex-col gap-3">
                                <button 
                                    onClick={() => {
                                        setFastingAcknowledged(true);
                                        setShowFastingAlert(false);
                                        // Trigger booking immediately after acknowledgement
                                        setTimeout(() => handleHoldBooking(), 100);
                                    }}
                                    className="w-full bg-[var(--color-primary-deep)] text-white h-16 rounded-2xl font-black shadow-xl shadow-emerald-900/20 active:scale-95 transition-all"
                                >
                                    I Understand
                                </button>
                                <button 
                                    onClick={() => setShowFastingAlert(false)}
                                    className="w-full text-gray-400 h-12 rounded-2xl font-black text-xs uppercase"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ── ADDRESS PICKER DIALOG ── */}
            <AnimatePresence>
                {showAddressPicker && (
                    <div className="fixed inset-0 z-[201] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }} 
                            animate={{ scale: 1, opacity: 1 }} 
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-3xl overflow-hidden"
                        >
                            <h3 className="text-xl font-black text-gray-900 mb-6 uppercase tracking-tight">Select Collection Address</h3>
                            
                            <div className="space-y-3 max-h-80 overflow-y-auto mb-6 custom-scrollbar pr-2">
                                {user?.addresses?.map((addr) => (
                                    <button 
                                        key={addr.id}
                                        onClick={() => {
                                            updateAddressFromStored(addr);
                                            setShowAddressPicker(false);
                                        }}
                                        className="w-full text-left p-4 rounded-2xl border-2 border-gray-50 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all group"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                                                <MapPin className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 text-sm mb-0.5">{addr.label || 'Saved Address'}</p>
                                                <p className="text-gray-400 text-[10px] font-medium leading-tight">{addr.line1}, {addr.cityName} - {addr.pincode}</p>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                                
                                <button 
                                    onClick={() => {
                                        if (navigator.geolocation) {
                                            navigator.geolocation.getCurrentPosition(async (pos) => {
                                                const lat = pos.coords.latitude.toString();
                                                const long = pos.coords.longitude.toString();
                                                setCoords({ lat, long });
                                                await reverseGeocode(lat, long);
                                                checkServiceability(lat, long);
                                                toast.success("Location detected!");
                                            }, () => {
                                                toast.error("Location access failed. Please enter manually.");
                                            }, { timeout: 10000 });
                                        }
                                        setShowAddressPicker(false);
                                    }}
                                    className="w-full text-left p-4 rounded-2xl border-2 border-emerald-100 bg-emerald-50/20 hover:bg-emerald-50 transition-all flex items-center gap-4"
                                >
                                    <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center">
                                        <Zap className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-black text-emerald-700 text-xs uppercase">Detect Current Location</p>
                                        <p className="text-emerald-600/60 text-[10px] font-bold italic">Uses device GPS for high precision</p>
                                    </div>
                                </button>
                            </div>
                            
                            <button 
                                onClick={() => setShowAddressPicker(false)}
                                className="w-full text-gray-400 font-black text-xs uppercase py-2"
                            >
                                Close
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
}

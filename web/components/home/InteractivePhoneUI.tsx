import { Bell, HeartPulse, Stethoscope, Search, User, ShieldAlert, Activity, Pill, Loader2, Home, Sparkles, ShoppingCart } from 'lucide-react';
import { useSDUIHooks } from '@/hooks/useSDUIHooks';
import Image from 'next/image';
import { getAssetUrl } from '@/utils/getAssetUrl';
import { motion } from 'framer-motion';

export function InteractivePhoneUI() {
  const { useHomeConfig } = useSDUIHooks();
  const { data: config, isLoading } = useHomeConfig();

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.3 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  // Find the active sections in our home configuration
  const quickServicesSection = config?.sections?.find(s => s.type === 'quick_services' && s.enabled);
  const mainServicesSection = config?.sections?.find(s => s.type === 'service_grid' && s.enabled);

  // Extract enabled services lists
  const quickServices = (quickServicesSection?.services || []).filter(s => s.enabled).slice(0, 4);
  const mainServices = (mainServicesSection?.services || []).filter(s => s.enabled).slice(0, 6);

  // Fallback defaults if configuration is loading or empty
  const defaultQuickServices = [
    { id: '1', label: "Doctor Visit", icon: "svc_doctor_visit", route: "/doctor-visit" },
    { id: '2', label: "Nursing Care", icon: "svc_homing_nursing", route: "/nurse-care" },
    { id: '3', label: "Caregiver Support", icon: "badge_family", route: "/caregiver-support" },
    { id: '4', label: "Emergency Assist", icon: "svc_hospital_trip", route: "/sos-emergency" }
  ];

  const defaultMainServices = [
    { id: '1', label: "Doctor Visit", icon: "svc_doctor_visit" },
    { id: '2', label: "Homing Nursing", icon: "svc_homing_nursing" },
    { id: '3', label: "Home Blood Test", icon: "svc_blood_test" },
    { id: '4', label: "Fitness Therapy", icon: "svc_fitness" },
    { id: '5', label: "Rent Equipment", icon: "svc_equipment" },
    { id: '6', label: "Order Medicines", icon: "svc_medicines" }
  ];

  const displayQuick = quickServices.length > 0 ? quickServices : defaultQuickServices.map(s => ({
    id: s.id,
    label: s.label,
    icon: s.icon,
    enabled: true
  }));

  const displayMain = mainServices.length > 0 ? mainServices : defaultMainServices.map(s => ({
    id: s.id,
    label: s.label,
    icon: s.icon,
    enabled: true
  }));

  const getQuickIconElement = (iconName: string, id: string) => {
    // If it's a direct URL or hash
    if (iconName.includes('/') || iconName.includes('.')) {
      return <Image src={getAssetUrl(iconName)} alt="Icon" width={32} height={32} className="object-contain" />;
    }
    // Map standard icon keys to GCS assets
    const mapping: Record<string, string> = {
      'doctor_quick': '32a4661f97e2fa2dd2c85c403a7c530b7214e7f7.png',
      'doctor_visit': '32a4661f97e2fa2dd2c85c403a7c530b7214e7f7.png',
      'nurse_quick': 'afd8e2afab202de7ddce09bf8add378c861b9347.png',
      'homing_nursing': 'afd8e2afab202de7ddce09bf8add378c861b9347.png',
      'hospital_quick': 'e1baef7b977f856b4e0401f74fbf21e0ce5348f7.png',
      'hospital_trip': 'e1baef7b977f856b4e0401f74fbf21e0ce5348f7.png',
      'caregiver_quick': '2fb222a5f206ff64415b72a8d4ac9290b4e6f720.png',
      'caregiver-support': '2fb222a5f206ff64415b72a8d4ac9290b4e6f720.png',
      'svc_doctor_visit': '32a4661f97e2fa2dd2c85c403a7c530b7214e7f7.png',
      'svc_homing_nursing': 'afd8e2afab202de7ddce09bf8add378c861b9347.png',
      'svc_hospital_trip': 'e1baef7b977f856b4e0401f74fbf21e0ce5348f7.png'
    };
    const asset = mapping[iconName] || mapping[id] || '32a4661f97e2fa2dd2c85c403a7c530b7214e7f7.png';
    return <Image src={getAssetUrl(asset)} alt="Icon" width={32} height={32} className="object-contain" />;
  };

  const getMainIconElement = (iconName: string, id: string) => {
    if (iconName.includes('/') || iconName.includes('.')) {
      return <Image src={getAssetUrl(iconName)} alt="Icon" width={28} height={28} className="object-contain" />;
    }
    const mapping: Record<string, string> = {
      'doctor_visit': '32a4661f97e2fa2dd2c85c403a7c530b7214e7f7.png',
      'homing_nursing': 'afd8e2afab202de7ddce09bf8add378c861b9347.png',
      'blood_test': 'f74321d18a86a9e77628058ed35a50d284752eb2.png',
      'fitness': '54f5c849cf75e776592dec8236f221da3694ca53.png',
      'equipment': 'd3906f517597b2ef10369d92c422b16bf20e879e.png',
      'medicines': '79c15725f6f1a73658b615886f1289634cef9408.png',
      'scan_ecg': 'f74321d18a86a9e77628058ed35a50d284752eb2.png',
      'meal': '8f136eff1200bb21c080348f6cdb7ad1c2831bdf.png',
      'physio': '4ea419052803769fad63ff4292316ce7f8f77dbc.png'
    };
    const asset = mapping[iconName] || mapping[id] || '32a4661f97e2fa2dd2c85c403a7c530b7214e7f7.png';
    return <Image src={getAssetUrl(asset)} alt="Icon" width={28} height={28} className="object-contain" />;
  };

  return (
    <div className="w-full h-full bg-[#FFFFE3] relative flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <div className="pt-8 pb-3 px-4 flex items-center justify-between bg-white/80 backdrop-blur-md z-10 sticky top-0 border-b border-[#E5E5CA]/50 shadow-sm">
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-[#048357] to-[#035E3E] rounded-md flex items-center justify-center shadow-lg">
                <HeartPulse className="text-white w-5 h-5 fill-current" />
            </div>
        </div>
        <div className="flex-1 mx-3 relative">
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2">
                <Search className="w-3.5 h-3.5 text-gray-400" />
            </div>
            <input 
              type="text" 
              placeholder="Your Location" 
              className="w-full bg-white border border-[#E5E5CA] rounded-full py-1.5 pl-8 pr-3 text-[10px] text-gray-700 outline-none shadow-inner"
              readOnly
              value="Bengaluru, KA"
            />
        </div>
        <div className="flex items-center gap-1.5">
          <div className="bg-[#FF3B30] rounded-full w-8 h-8 flex items-center justify-center shadow-md animate-pulse">
             <span className="text-white text-[9px] font-black tracking-widest leading-none">SOS</span>
          </div>
          <div className="w-8 h-8 bg-white rounded-full border border-[#E5E5CA] flex items-center justify-center shadow-sm text-[#048357]">
             <Bell className="w-4 h-4 fill-current outline-none" />
          </div>
        </div>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex-1 overflow-y-auto no-scrollbar pb-10"
      >
        {/* Hero Banner */}
        <motion.div variants={itemVariants} className="relative w-full h-[140px] bg-gradient-to-r from-[#035E3E] to-[#048357] overflow-hidden shadow-md">
           <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4"></div>
           <div className="absolute bottom-0 left-0 w-[100px] h-[100px] bg-black/10 rounded-full blur-xl translate-y-1/2 -translate-x-1/4"></div>
           
           <div className="relative z-10 px-5 pt-8 flex items-center justify-between">
              <div className="flex flex-col">
                 <h2 className="text-white text-xl font-bold tracking-tight">Good Morning,<br/>Mr. Chen</h2>
                 <p className="text-white/80 text-[11px] mt-1 font-medium italic">How can we assist you today?</p>
              </div>
              
              {/* Profile Logo Placeholder */}
              <div className="relative w-12 h-12 bg-white/15 backdrop-blur-md rounded-full border border-white/20 p-2 flex items-center justify-center overflow-hidden">
                 <Image src="/onlylogo.png" alt="Ayuxa Logo Profile" width={28} height={28} className="object-contain" />
              </div>
           </div>
        </motion.div>

        {/* 4 Main Cards */}
        <div className="px-3 -mt-6 relative z-20">
          <motion.div variants={itemVariants} className="flex gap-1.5 justify-between">
            {displayQuick.map((card) => (
               <motion.div 
                 key={card.id}
                 whileHover={{ y: -5 }}
                 className="flex-1 bg-white rounded-xl shadow-lg border border-white p-1.5 flex flex-col items-center justify-center gap-1.5 h-[85px] cursor-pointer"
               >
                 <div className="w-8 h-8 bg-[#E6F3EE] rounded-lg flex items-center justify-center shadow-sm">
                    {getQuickIconElement(card.icon, card.id)}
                 </div>
                 <span className="text-center font-bold text-[#035E3E] text-[8px] leading-[10px] w-full">{card.label}</span>
               </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Ayuxa Services Grid */}
        <motion.div variants={itemVariants} className="px-4 mt-6">
            <div className="flex justify-between items-end mb-3">
               <h3 className="text-[#035E3E] font-extrabold text-[15px] tracking-tight">
                 {mainServicesSection?.title || "Ayuxa Services"}
               </h3>
               <span className="text-[9px] font-bold text-gray-400 cursor-pointer">View All</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
                {displayMain.map((s) => (
                   <motion.div 
                     key={s.id}
                     whileHover={{ scale: 1.05 }}
                     className="bg-white rounded-xl shadow-sm border border-[#E5E5CA]/50 p-2 h-[85px] flex flex-col items-center justify-center group cursor-pointer"
                   >
                      <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 mb-2 group-hover:text-[#048357] group-hover:bg-[#E6F3EE] transition-colors">
                         {getMainIconElement(s.icon, s.id)}
                      </div>
                      <span className="text-[8px] font-bold text-center text-[#035E3E] leading-[10px]">{s.label}</span>
                   </motion.div>
                ))}
            </div>
        </motion.div>

        {/* Trust Badges */}
        <motion.div variants={itemVariants} className="px-4 mt-6">
            <div className="bg-white rounded-xl shadow-sm border border-[#E5E5CA]/50 p-3 flex justify-between divide-x divide-gray-100">
               {[
                 { t: "24/7 Support", i: "📞" },
                 { t: "Verified Caregivers", i: "🛡️" },
                 { t: "Family-first Care", i: "🏥" }
               ].map((b, i) => (
                 <div key={i} className="flex-1 flex flex-col items-center justify-center px-1">
                    <span className="text-xl mb-1 opacity-80">{b.i}</span>
                    <span className="text-[7px] font-black uppercase text-[#035E3E] text-center">{b.t}</span>
                 </div>
               ))}
            </div>
        </motion.div>

        {/* Bottom spacer for simulated tabbar */}
        <div className="h-20"></div>
      </motion.div>

      {/* Simulated Tab Bar */}
      <div className="absolute bottom-0 left-0 w-full h-16 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.05)] border-t border-gray-100 flex items-center justify-around px-2 z-30 pb-2 rounded-b-[26px]">
         {[
           { t: "Home", active: true, icon: <Home className="w-4 h-4" /> },
           { t: "Plans", active: false, icon: <Sparkles className="w-4 h-4" /> },
           { t: "Wellness", active: false, icon: <HeartPulse className="w-4 h-4" /> },
           { t: "Account", active: false, icon: <User className="w-4 h-4" /> },
           { t: "Cart", active: false, icon: <ShoppingCart className="w-4 h-4" /> }
         ].map((t, i) => (
           <div key={i} className="flex flex-col items-center gap-1 cursor-pointer w-12">
              <div className={`w-7 h-7 rounded-full ${t.active ? 'bg-[#048357] text-white shadow-sm' : 'bg-transparent text-gray-400'} flex items-center justify-center`}>
                 {t.icon}
              </div>
              <span className={`text-[8px] font-bold ${t.active ? 'text-[#048357]' : 'text-gray-400'}`}>{t.t}</span>
           </div>
         ))}
      </div>
    </div>
  );
}

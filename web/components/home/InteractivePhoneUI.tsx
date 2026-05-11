'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Bell, HeartPulse, Stethoscope, Search, User, ShieldAlert, Activity, Pill } from 'lucide-react';

export function InteractivePhoneUI() {
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
           
           <div className="relative z-10 px-5 pt-8 flex flex-col">
              <h2 className="text-white text-xl font-bold tracking-tight">Good Morning,<br/>Mr. Chen</h2>
              <p className="text-white/80 text-[11px] mt-1 font-medium italic">How can we assist you today?</p>
           </div>
        </motion.div>

        {/* 4 Main Cards */}
        <div className="px-3 -mt-6 relative z-20">
          <motion.div variants={itemVariants} className="flex gap-1.5 justify-between">
            {[
              { title: "Doctor Visit", icon: <Stethoscope className="w-5 h-5 text-[#048357]" />, color: "bg-[#E6F3EE]" },
              { title: "Nursing Care", icon: <User className="w-5 h-5 text-[#007AFF]" />, color: "bg-[#E6F0FF]" },
              { title: "Caregiver Support", icon: <HeartPulse className="w-5 h-5 text-[#FF3B30]" />, color: "bg-[#FFEBEA]" },
              { title: "Emergency Assist", icon: <ShieldAlert className="w-5 h-5 text-[#FF9500]" />, color: "bg-[#FFF4E6]" }
            ].map((card, i) => (
               <motion.div 
                 key={i}
                 whileHover={{ y: -5 }}
                 className="flex-1 bg-white rounded-xl shadow-lg border border-white p-1.5 flex flex-col items-center justify-center gap-1.5 h-[85px] cursor-pointer"
               >
                 <div className={`w-8 h-8 ${card.color} rounded-lg flex items-center justify-center shadow-sm`}>
                    {card.icon}
                 </div>
                 <span className="text-center font-bold text-[#035E3E] text-[8px] leading-[10px] w-full">{card.title}</span>
               </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Ayuxacare Services Grid */}
        <motion.div variants={itemVariants} className="px-4 mt-6">
            <div className="flex justify-between items-end mb-3">
               <h3 className="text-[#035E3E] font-extrabold text-[15px] tracking-tight">Ayuxacare Services</h3>
               <span className="text-[9px] font-bold text-gray-400 cursor-pointer">View All</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
               {[
                 { t: "Doctor Visit", i: <Stethoscope className="w-5 h-5" /> },
                 { t: "Homing Nursing", i: <User className="w-5 h-5" /> },
                 { t: "Home Blood Test", i: <Activity className="w-5 h-5" /> },
                 { t: "Fitness Therapy", i: <HeartPulse className="w-5 h-5" /> },
                 { t: "Rent Equipment", i: <ShieldAlert className="w-5 h-5" /> },
                 { t: "Order Medicines", i: <Pill className="w-5 h-5" /> }
               ].map((s, i) => (
                  <motion.div 
                    key={i}
                    whileHover={{ scale: 1.05 }}
                    className="bg-white rounded-xl shadow-sm border border-[#E5E5CA]/50 p-2 h-[85px] flex flex-col items-center justify-center group cursor-pointer"
                  >
                     <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 mb-2 group-hover:text-[#048357] group-hover:bg-[#E6F3EE] transition-colors">
                        {s.i}
                     </div>
                     <span className="text-[8px] font-bold text-center text-[#035E3E] leading-[10px]">{s.t}</span>
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
           { t: "Home", active: true },
           { t: "Plans", active: false },
           { t: "Wellness", active: false },
           { t: "Account", active: false },
           { t: "Cart", active: false }
         ].map((t, i) => (
           <div key={i} className="flex flex-col items-center gap-1 cursor-pointer w-12">
              <div className={`w-5 h-5 rounded-full ${t.active ? 'bg-[#048357]' : 'bg-gray-100'} flex items-center justify-center`}></div>
              <span className={`text-[8px] font-bold ${t.active ? 'text-[#048357]' : 'text-gray-400'}`}>{t.t}</span>
           </div>
         ))}
      </div>
    </div>
  );
}

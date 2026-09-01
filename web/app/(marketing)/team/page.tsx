'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowRight, X, MapPin } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  linkedin: string;
  image: string;
  shortBio: string;
  fullBio: string[];
  city?: string;
}

interface GroupedTeam {
  management: TeamMember[];
  shareholders: TeamMember[];
  doctors: TeamMember[];
  nurses: TeamMember[];
  caregivers: TeamMember[];
}

export default function TeamPage() {
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [teamData, setTeamData] = useState<GroupedTeam>({
    management: [],
    shareholders: [],
    doctors: [],
    nurses: [],
    caregivers: []
  });
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.ayuxacare.com/api';
        const res = await fetch(`${apiUrl}/public/team`);
        const json = await res.json();
        if (json.success) {
          setTeamData(json.data);
        }
      } catch (err) {
        console.error('Failed to fetch team data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTeam();
  }, []);

  // Handle hash scrolling on load or hash change
  useEffect(() => {
    if (!loading && typeof window !== 'undefined') {
      const handleHashScroll = () => {
        if (window.location.hash) {
          const id = window.location.hash.substring(1);
          const element = document.getElementById(id);
          if (element) {
            setTimeout(() => {
              element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 150);
          }
        }
      };

      handleHashScroll();
      window.addEventListener('hashchange', handleHashScroll);
      return () => window.removeEventListener('hashchange', handleHashScroll);
    }
  }, [loading, pathname]);

  const handleEmail = (e: React.MouseEvent, email: string) => {
    e.preventDefault(); e.stopPropagation();
    window.open(`mailto:${email}`, '_self');
  };

  const handleLinkedIn = (e: React.MouseEvent, url: string) => {
    e.preventDefault(); e.stopPropagation();
    window.open(url.startsWith('http') ? url : `https://${url}`, '_blank');
  };

  const renderSection = (title: string, id: string, members: TeamMember[]) => {
    if (!members || members.length === 0) return null;

    return (
      <section id={id} key={id} className="scroll-mt-24 mb-20">
        <div className="container mx-auto px-6">
          <div className="flex items-center gap-4 mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold text-[var(--color-text-dark)] uppercase tracking-wide">
              {title}
            </h2>
            <div className="flex-1 h-[1.5px] bg-gradient-to-r from-emerald-100 to-transparent" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {members.map((member, index) => (
              <TeamMemberCard 
                key={member.id} 
                member={member} 
                index={index} 
                onSelect={setSelectedMember}
                onEmail={handleEmail}
                onLinkedIn={handleLinkedIn}
                categoryTitle={title}
              />
            ))}
          </div>
        </div>
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-screen)]">
      {/* Hero Section */}
      <section className="relative pt-10 md:pt-16 pb-12 overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-emerald-50/50 rounded-bl-[200px] -z-10" />
        <div className="container mx-auto px-6 text-center md:text-left">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
            <span className="inline-block px-4 py-1.5 bg-emerald-100 text-[var(--color-primary-text)] rounded-full text-sm font-bold mb-6">
              OUR FAMILY
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold text-[var(--color-text-dark)] leading-tight mb-8">
              The Missionaries of <span className="text-[var(--color-primary)] italic">Care</span>
            </h1>
            <p className="text-lg md:text-xl text-[var(--color-text-body)] leading-relaxed opacity-80">
              Meet our dedicated management team committed to senior citizens&apos; well-being.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Grid Sections */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-40">
          <div className="w-12 h-12 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin mb-4" />
          <p className="text-sm font-semibold text-gray-500">Loading Team Members...</p>
        </div>
      ) : (
        <div className="pb-12">
          {renderSection('Management', 'management', teamData.management)}
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedMember && (
          <FullProfileModal 
            member={selectedMember} 
            onClose={() => setSelectedMember(null)} 
          />
        )}
      </AnimatePresence>

      <section className="bg-[var(--color-primary-deep)] py-16 md:py-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-400/10 rounded-full blur-[100px]" />
        <div className="container mx-auto px-6 text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-8">Building the future of Senior Care.</h2>
          <Link href="/careers" className="inline-flex items-center gap-3 px-10 py-5 bg-white text-[var(--color-primary-deep)] rounded-[20px] font-bold hover:bg-emerald-50 transition-all active:scale-95 shadow-xl">
            View Careers <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}

// ─── Sub-Components ────────────────────────────────────────────────────────────

function TeamMemberCard({ member, index, onSelect, onEmail, onLinkedIn, categoryTitle }: {
  member: TeamMember;
  index: number;
  onSelect: (m: TeamMember) => void;
  onEmail: (e: React.MouseEvent, email: string) => void;
  onLinkedIn: (e: React.MouseEvent, linkedin: string) => void;
  categoryTitle: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
      className="group relative bg-white rounded-[40px] p-8 shadow-sm hover:shadow-2xl transition-all duration-500 border border-gray-100/50 flex flex-col h-full"
    >
      <div className="relative mb-8 pt-4">
        <div className="absolute -top-4 -left-4 w-24 h-24 bg-emerald-50 rounded-full group-hover:scale-150 transition-transform duration-700 -z-10" />
        <div className="relative w-full aspect-[4/5] rounded-[32px] overflow-hidden shadow-xl grayscale-[50%] group-hover:grayscale-0 transition-all duration-500">
          <img src={member.image} alt={member.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10 pointer-events-none" />
        </div>
      </div>

      <div className="flex flex-col gap-3 flex-1">
        <div className="flex flex-col gap-1">
          <h3 className="text-2xl font-bold text-[var(--color-text-dark)] group-hover:text-[var(--color-primary)] transition-colors line-clamp-1">{member.name}</h3>
          <div className="flex items-center gap-2">
            <div className="w-4 h-[2px] bg-emerald-200" />
            <span className="text-[10px] font-bold tracking-[0.2em] text-emerald-600 uppercase italic">{member.role}</span>
          </div>
        </div>

        {member.shortBio && (
          <p className="text-gray-600 mt-2 leading-relaxed line-clamp-3 text-sm italic opacity-80">&quot;{member.shortBio}&quot;</p>
        )}
        
        {/* Directly visible contact links */}
        <div className="mt-6 flex flex-col gap-2.5 relative z-20">
           {member.email && (
             <button 
               onClick={(e) => onEmail(e, member.email)}
               className="flex items-center gap-3 text-xs font-bold text-gray-500 hover:text-[var(--color-primary)] transition-all group/mail"
             >
               <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center group-hover/mail:bg-[var(--color-primary)] group-hover/mail:text-white transition-all">
                  <Mail className="w-4 h-4" />
               </div>
               {member.email}
             </button>
           )}
           {member.linkedin && (
             <button 
               onClick={(e) => onLinkedIn(e, member.linkedin)}
               className="flex items-center gap-3 text-xs font-bold text-gray-500 hover:text-emerald-700 transition-all group/link"
             >
               <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center group-hover/link:bg-emerald-700 group-hover/link:text-white transition-all">
                  <LinkedInIcon className="w-4 h-4" />
               </div>
               LinkedIn Profile
             </button>
           )}
           {member.city && (
             <div className="flex items-center gap-3 text-xs font-bold text-gray-400">
               <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-emerald-600" />
               </div>
               {member.city}
             </div>
           )}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-50 flex items-center justify-between">
          <button onClick={() => onSelect(member)} className="flex items-center gap-2 text-[var(--color-primary)] font-extrabold text-[10px] uppercase tracking-[0.15em] hover:gap-3 transition-all">
             Full Profile <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <div className="text-[10px] font-bold text-gray-300 group-hover:text-emerald-200 transition-colors uppercase tracking-widest">
             {categoryTitle}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function FullProfileModal({ member, onClose }: { member: TeamMember; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-[var(--color-primary-deep)]/90 backdrop-blur-xl" 
        onClick={onClose} 
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white w-full max-w-5xl h-fit max-h-[90vh] overflow-hidden rounded-[40px] shadow-2xl flex flex-col md:flex-row z-[110]"
      >
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 z-[120] w-12 h-12 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 transition-all shadow-lg border border-gray-100"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Left Side: Image */}
        <div className="w-full md:w-2/5 h-64 md:h-auto relative bg-gray-100">
           <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
           <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-black/80 to-transparent">
              <h2 className="text-3xl font-bold text-white mb-2">{member.name}</h2>
              <p className="text-emerald-300 font-bold uppercase tracking-widest text-xs italic">{member.role}</p>
           </div>
        </div>

        {/* Right Side: Content */}
        <div className="flex-1 overflow-y-auto p-8 md:p-16">

          <div className="max-w-xl">
             <div className="flex flex-wrap gap-4 mb-10">
                {member.email && (
                  <a href={`mailto:${member.email}`} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-50 text-[var(--color-primary)] rounded-full text-sm font-bold hover:bg-[var(--color-primary)] hover:text-white transition-all">
                     <Mail className="w-4 h-4" /> Email Me
                  </a>
                )}
                {member.linkedin && (
                  <a href={member.linkedin.startsWith('http') ? member.linkedin : `https://${member.linkedin}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-5 py-2.5 bg-emerald-50 text-[var(--color-primary)] rounded-full text-sm font-bold hover:bg-[var(--color-primary)] hover:text-white transition-all">
                     <LinkedInIcon className="w-4 h-4" /> LinkedIn
                  </a>
                )}
             </div>

             <div className="space-y-6">
                {member.fullBio && member.fullBio.length > 0 ? (
                  member.fullBio.map((para, i) => (
                    <p key={i} className="text-lg text-gray-700 leading-relaxed font-medium opacity-90">
                      {para}
                    </p>
                  ))
                ) : (
                  <p className="text-lg text-gray-400 italic">No detailed profile description available.</p>
                )}
             </div>

             <div className="mt-16 pt-8 border-t border-gray-100">
                <Link href="/contact" className="inline-flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-[var(--color-primary)] transition-colors">
                  Contact for Corporate Inquiries <ArrowRight className="w-4 h-4" />
                </Link>
             </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

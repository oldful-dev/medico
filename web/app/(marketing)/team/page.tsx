'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, ExternalLink, X } from 'lucide-react';

const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

interface TeamMember {
  name: string;
  role: string;
  email: string;
  linkedin: string;
  image: string;
  shortBio: string;
  fullBio: string[];
}

const team: TeamMember[] = [
  {
    name: 'Dhemaan G. Aditya',
    role: 'Founder & CEO',
    email: 'dhemaan@ayuxacare.com',
    linkedin: 'linkedin.com/in/dhemaan',
    image: 'https://www.ayuxacare.com/wp-content/uploads/2026/03/IMG_0207-e1774297139859.jpg',
    shortBio: 'Business leader with 15+ years experience in Marketing Leadership, AI-driven systems, and Emotionally Intelligent strategy.',
    fullBio: [
      'Professional Summary: Dhemaan G. Aditya is a business leader with over 15 years of combined experience in marketing leadership, artificial intelligence, and emotionally intelligent business strategy. He is known for building trust-driven brands and scalable service systems, particularly in people-centric industries.',
      'Education: Master of Business Administration (MBA) Specialization: Marketing & Information Technology — Presidency College, Bangalore.',
      'Core Leadership Experience: Marketing & Growth Leadership, 10 years of experience as Marketing Head and senior marketing leader.',
      'Expertise in: Brand strategy and positioning, Revenue-driven marketing systems, Digital and offline campaign leadership, Emotional and trust-based marketing frameworks, Consumer psychology and behavior analysis.',
      'Technology & Artificial Intelligence Expertise: AI, Machine Learning & Deep Learning. 5 years of hands-on experience in: Artificial Intelligence systems, Machine Learning models, Deep Learning applications, AI-powered customer interaction and automation. Applied Use Cases: AI-based customer support and call intelligence, Sales automation and CRM intelligence, Data-driven operational decision systems, Emotion-aware engagement models.',
      'Emotional Intelligence & Human-Centered Design: Strong practitioner of Emotional Intelligence (EI) in business operations. Application of EI in: Leadership and team management, Customer experience and relationship handling, Caregiver and workforce engagement, Conflict resolution and service recovery.',
      'Founder & Entrepreneurial Role: ayuxacare – Elder Care Brand Founder & CEO. Focus areas: Professional elder care services, Structured caregiver training and quality systems, Technology-enabled yet human-first service delivery, Building trust, dignity, and long-term family relationships.'
    ]
  },
  {
    name: 'Dr. Satish Babu H. V.',
    role: 'Head of the Medical Division',
    email: 'satish@ayuxacare.com',
    linkedin: 'https://www.linkedin.com/in/dr-h-v-satish-babu-65553437/',
    image: 'https://www.ayuxacare.com/wp-content/uploads/2026/01/Satish-Babu-1.avif',
    shortBio: 'Senior Neurosurgeon with 40+ years experience. Medical Director & Professor dedicated to Senior Citizen well-being.',
    fullBio: [
      'Dr. Satish Babu H. V. is a highly distinguished Senior Neurosurgeon with over 40 years of experience in Health care. He is currently serving as Medical Director and Head of the Neuroscience Department at Columbia Multi-Specialty Hospital, and has a distinguished academic leadership as a Professor of Neurosurgery at Bangalore.',
      'He is the Head of the Medical Division at ayuxacare, a Specialized Healthcare Organization dedicated to the well-being of Senior Citizens. Throughout his illustrious career, he has excelled as a clinician, teacher, and administrator, earning a reputation for blending surgical precision with deep empathy.',
      'His professional journey includes significant roles such as Medical Director and Head of the Neuroscience Department at Columbia Multi-Specialty Hospital, Professor of Neurosurgery at various medical colleges. He was Trained at the prestigious Christian Medical College (CMC), Vellore and his clinical expertise spans complex cranial surgeries, minimally invasive spine procedures, and Neuro-trauma care.',
      'As an administrator, Dr. Satish Babu has been instrumental in establishing neurosurgical centers and postgraduate residency programs, demonstrating a commitment to nurturing the next generation of medical professionals. At ayuxacare, he leverages this multifaceted experience to lead the medical division, ensuring that senior patients receive advanced, compassionate, and holistic care tailored to their unique neurological needs.'
    ]
  },
  {
    name: "Adv. Manjunatha V. Rayappa",
    role: "Legal Adviser",
    email: "rayappa@ayuxacare.com",
    linkedin: "https://www.linkedin.com/feed/",
    image: "https://www.ayuxacare.com/wp-content/uploads/2026/01/Advocate-Manjunatha-V.-Rayappa.avif",
    shortBio: "Legal Adviser specializing in Corporate Law, Regulatory Compliance, and Strategic Governance for ayuxacare.",
    fullBio: [
      "Advocate Manjunatha V. Rayappa serves as the Legal Adviser to ayuxacare, providing strategic legal guidance and compliance oversight across the organization’s operations. With strong expertise in corporate law, regulatory compliance, and advisory services, he plays a critical role in ensuring that ayuxacare operates within a robust and ethical legal framework.",
      "He advises the management on matters relating to company law, LLP and corporate structuring, contracts, vendor agreements, employment and labor laws, consumer protection, and statutory compliances relevant to elder care services. His counsel supports risk mitigation, operational clarity, and long-term legal sustainability for the organization.",
      "Adv. Rayappa is known for his practical, business-aligned legal approach balancing regulatory requirements with operational realities. His ability to translate complex legal provisions into clear, actionable guidance enables leadership teams to make informed decisions without unnecessary legal friction.",
      "As Legal Adviser to ayuxacare, he contributes not only as a legal professional but also as a trusted advisor, ensuring that governance, transparency, and accountability remain central to the company’s growth and reputation."
    ]
  },
];

export default function TeamPage() {
  const [selectedMember, setSelectedMember] = React.useState<TeamMember | null>(null);

  const handleEmail = (e: React.MouseEvent, email: string) => {
    e.preventDefault(); e.stopPropagation();
    window.open(`mailto:${email}`, '_self');
  };

  const handleLinkedIn = (e: React.MouseEvent, url: string) => {
    e.preventDefault(); e.stopPropagation();
    window.open(url.startsWith('http') ? url : `https://${url}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-screen)]">
      {/* Hero Section */}
      <section className="relative pt-10 md:pt-16 pb-16 overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-emerald-50/50 rounded-bl-[200px] -z-10" />
        <div className="container mx-auto px-6 text-center md:text-left">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
            <span className="inline-block px-4 py-1.5 bg-emerald-100 text-[var(--color-primary-text)] rounded-full text-sm font-bold mb-6">
              OUR LEADERSHIP
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold text-[var(--color-text-dark)] leading-tight mb-8">
              The Missionaries of <span className="text-[var(--color-primary)] italic">Care</span>
            </h1>
            <p className="text-lg md:text-xl text-[var(--color-text-body)] leading-relaxed opacity-80">
              Meet the visionary minds committed to redesigning domestic healthcare and support systems for seniors.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Grid */}
      <section className="pb-20">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {team.map((member, index) => (
              <TeamMemberCard 
                key={member.name} 
                member={member} 
                index={index} 
                onSelect={setSelectedMember}
                onEmail={handleEmail}
                onLinkedIn={handleLinkedIn}
              />
            ))}
          </div>
        </div>
      </section>

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
          <a href="/careers" className="inline-flex items-center gap-3 px-10 py-5 bg-white text-[var(--color-primary-deep)] rounded-[20px] font-bold hover:bg-emerald-50 transition-all active:scale-95 shadow-xl">
            View Careers <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </section>
    </div>
  );
}

// ─── Sub-Components ────────────────────────────────────────────────────────────

import { AnimatePresence } from 'framer-motion';

function TeamMemberCard({ member, index, onSelect, onEmail, onLinkedIn }: {
  member: TeamMember;
  index: number;
  onSelect: (m: TeamMember) => void;
  onEmail: (e: React.MouseEvent, email: string) => void;
  onLinkedIn: (e: React.MouseEvent, linkedin: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
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

        <p className="text-gray-600 mt-2 leading-relaxed line-clamp-3 text-sm italic opacity-80">&quot;{member.shortBio}&quot;</p>
        
        {/* Directly visible contact links */}
        <div className="mt-6 flex flex-col gap-2 relative z-20">
           <button 
             onClick={(e) => onEmail(e, member.email)}
             className="flex items-center gap-3 text-xs font-bold text-gray-500 hover:text-[var(--color-primary)] transition-all group/mail"
           >
             <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center group-hover/mail:bg-[var(--color-primary)] group-hover/mail:text-white transition-all">
                <Mail className="w-4 h-4" />
             </div>
             {member.email}
           </button>
           <button 
             onClick={(e) => onLinkedIn(e, member.linkedin)}
             className="flex items-center gap-3 text-xs font-bold text-gray-500 hover:text-emerald-700 transition-all group/link"
           >
             <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center group-hover/link:bg-emerald-700 group-hover/link:text-white transition-all">
                <LinkedInIcon className="w-4 h-4" />
             </div>
             LinkedIn Profile
           </button>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-50 flex items-center justify-between">
          <button onClick={() => onSelect(member)} className="flex items-center gap-2 text-[var(--color-primary)] font-extrabold text-[10px] uppercase tracking-[0.15em] hover:gap-3 transition-all">
             Full Profile <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <div className="text-[10px] font-bold text-gray-300 group-hover:text-emerald-200 transition-colors uppercase tracking-widest">
             Leadership
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
             <div className="flex gap-4 mb-10">
                <a href={`mailto:${member.email}`} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-50 text-[var(--color-primary)] rounded-full text-sm font-bold hover:bg-[var(--color-primary)] hover:text-white transition-all">
                   <Mail className="w-4 h-4" /> Email Me
                </a>
                <a href={member.linkedin.startsWith('http') ? member.linkedin : `https://${member.linkedin}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-5 py-2.5 bg-emerald-50 text-[var(--color-primary)] rounded-full text-sm font-bold hover:bg-[var(--color-primary)] hover:text-white transition-all">
                   <LinkedInIcon className="w-4 h-4" /> LinkedIn
                </a>
             </div>

             <div className="space-y-6">
                {member.fullBio.map((para, i) => (
                  <p key={i} className="text-lg text-gray-700 leading-relaxed font-medium opacity-90">
                    {para}
                  </p>
                ))}
             </div>

             <div className="mt-16 pt-8 border-t border-gray-100">
                <a href="/contact" className="inline-flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-[var(--color-primary)] transition-colors">
                  Contact for Corporate Inquiries <ArrowRight className="w-4 h-4" />
                </a>
             </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

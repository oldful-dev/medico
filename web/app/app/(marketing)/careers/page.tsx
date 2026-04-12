'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Send, CheckCircle, ArrowRight, Star, Heart, Clock, Shield } from 'lucide-react';
import { apiClient } from '@/services/api/apiClient';

const ROLES = [
  "General Caregiver",
  "Specialized Nurse (ICU/Geriatric)",
  "Physiotherapist",
  "Psychologist / Elder Companion",
  "Operations & Logistics",
  "Marketing & Growth",
  "Technology & Product"
];

const PERKS = [
  { icon: Heart, label: "Compassionate Culture", sub: "We treat our team like family." },
  { icon: Shield, label: "Job Security", sub: "Competitive pay & insurance benefits." },
  { icon: Clock, label: "Flexible Shifts", sub: "Work-life balance is a priority." },
  { icon: Star, label: "Growth Paths", sub: "Continuous learning & promotions." },
];

export default function CareersPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: ROLES[0],
    experience: '',
    resumeLink: '',
    coverLetter: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiClient.post('/support/careers', form); 
      if (res.success) {
        setSuccess(true);
      }
    } catch (error) {
      console.error('Application failed:', error);
      alert('Something went wrong. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-screen)] selection:bg-[var(--color-primary)] selection:text-white">
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-full text-emerald-700 text-xs font-bold uppercase tracking-widest mb-6"
          >
            <Briefcase className="w-3.5 h-3.5" /> Work with us
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-bold text-gray-900 leading-[1.1] mb-6"
          >
            Join the family that cares for <span className="text-[var(--color-primary)] underline decoration-emerald-200 underline-offset-8">everyone</span>.
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed"
          >
            Building the future of elder healthcare in India. We&apos;re looking for compassionate, bold, and skilled individuals to join our mission.
          </motion.p>
        </div>
        
        {/* Background shapes */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-96 h-96 bg-emerald-50 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-[500px] h-[500px] bg-yellow-50 rounded-full blur-3xl opacity-40" />
      </section>

      {/* Perks Grid */}
      <section className="py-20 px-6 bg-white/50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {PERKS.map((perk, i) => (
            <motion.div
              key={perk.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-[var(--color-primary)] transition-colors">
                <perk.icon className="w-6 h-6 text-[var(--color-primary)] group-hover:text-white transition-colors" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">{perk.label}</h3>
              <p className="text-sm text-gray-500">{perk.sub}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Application Form */}
      <section className="py-24 px-6 relative" id="apply">
        <div className="max-w-3xl mx-auto">
          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white border-2 border-emerald-100 rounded-3xl p-12 text-center shadow-xl"
            >
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-emerald-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Application Received!</h2>
              <p className="text-gray-500 mb-8 max-w-sm mx-auto">
                Thank you for applying to join Oldful. Our talent acquisition team will review your profile and get back to you at <strong>business@oldful.com</strong> soon.
              </p>
              <button 
                onClick={() => setSuccess(false)}
                className="text-[var(--color-primary)] font-bold text-sm hover:underline flex items-center gap-1 mx-auto"
              >
                Apply for another role <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          ) : (
            <div className="bg-white/70 backdrop-blur-xl border border-gray-100 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative">
              <div className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Apply for a position</h2>
                <p className="text-sm text-gray-500 font-medium">Please fill out the form below and we&apos;ll be in touch.</p>
              </div>

              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Full Name</label>
                  <input
                    required
                    type="text"
                    placeholder="John Doe"
                    className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl outline-none focus:ring-2 ring-[var(--color-primary)]/20 focus:bg-white focus:border-[var(--color-primary)]/30 transition-all text-sm"
                    value={form.name}
                    onChange={e => setForm({...form, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Email Address</label>
                  <input
                    required
                    type="email"
                    placeholder="john@example.com"
                    className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl outline-none focus:ring-2 ring-[var(--color-primary)]/20 focus:bg-white focus:border-[var(--color-primary)]/30 transition-all text-sm"
                    value={form.email}
                    onChange={e => setForm({...form, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Phone Number</label>
                  <input
                    required
                    type="tel"
                    placeholder="+91 00000 00000"
                    className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl outline-none focus:ring-2 ring-[var(--color-primary)]/20 focus:bg-white focus:border-[var(--color-primary)]/30 transition-all text-sm"
                    value={form.phone}
                    onChange={e => setForm({...form, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Role of Interest</label>
                  <select
                    className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl outline-none focus:ring-2 ring-[var(--color-primary)]/20 focus:bg-white focus:border-[var(--color-primary)]/30 transition-all text-sm appearance-none cursor-pointer"
                    value={form.role}
                    onChange={e => setForm({...form, role: e.target.value})}
                  >
                    {ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Experience (Years)</label>
                  <input
                    required
                    type="number"
                    placeholder="e.g. 5"
                    className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl outline-none focus:ring-2 ring-[var(--color-primary)]/20 focus:bg-white focus:border-[var(--color-primary)]/30 transition-all text-sm"
                    value={form.experience}
                    onChange={e => setForm({...form, experience: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Portfolio / Resume Link</label>
                  <input
                    required
                    type="url"
                    placeholder="Drive/Dropbox link"
                    className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl outline-none focus:ring-2 ring-[var(--color-primary)]/20 focus:bg-white focus:border-[var(--color-primary)]/30 transition-all text-sm"
                    value={form.resumeLink}
                    onChange={e => setForm({...form, resumeLink: e.target.value})}
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Cover Letter / Why Oldful?</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Tell us a bit about yourself and why you want to work with us..."
                    className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl outline-none focus:ring-2 ring-[var(--color-primary)]/20 focus:bg-white focus:border-[var(--color-primary)]/30 transition-all text-sm resize-none"
                    value={form.coverLetter}
                    onChange={e => setForm({...form, coverLetter: e.target.value})}
                  />
                </div>
                
                <div className="md:col-span-2 pt-4">
                  <button
                    disabled={loading}
                    type="submit"
                    className="w-full bg-[var(--color-primary-deep)] text-white py-4 rounded-2xl font-bold text-base shadow-xl shadow-emerald-900/10 hover:shadow-emerald-900/20 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 disabled:bg-gray-400"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <><Send className="w-5 h-5" /> Submit Application</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

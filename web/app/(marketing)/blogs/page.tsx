'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Calendar, User, ArrowRight, BookOpen, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { supportService } from '@/services/api/supportService';
import { toast } from 'sonner';

const BLOG_POSTS = [
  {
    id: 1,
    title: "Understanding Elder Care: A Comprehensive Guide",
    excerpt: "Learn about the different aspects of elder care and how to choose the right services for your loved ones.",
    author: "Dr. Satish Babu",
    date: "April 10, 2026",
    image: "https://plus.unsplash.com/premium_photo-1663036976879-4baf18adfd5b?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8ZWxkZXIlMjBjYXJlfGVufDB8fDB8fHww",
    category: "Caregiving"
  },
  {
    id: 2,
    title: "The Importance of Social Interaction for Seniors",
    excerpt: "Discover why staying socially active is crucial for the mental and physical health of senior citizens.",
    author: "Emily Chen",
    date: "April 5, 2026",
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=800&auto=format&fit=crop",
    category: "Wellness"
  },
  {
    id: 3,
    title: "Tech Solutions for Aging in Place",
    excerpt: "Exploring how modern technology is making it safer and easier for elders to live independently at home.",
    author: "Dhemaan G. Aditya",
    date: "March 28, 2026",
    image: "https://images.unsplash.com/photo-1733685373369-95bda03f2b40?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTV8fHRlY2glMjBzb2x1dGlvbiUyMGZvciUyMGFnaW5nfGVufDB8fDB8fHww",
    category: "Technology"
  }
];

export default function BlogsPage() {
  const [email, setEmail] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleSubscribe = async () => {
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const res = await supportService.subscribe(email);
      if (res.success) {
        toast.success("You've subscribed successfully!", {
          description: "Check your inbox for a confirmation email."
        });
        setEmail('');
      } else {
        toast.error(res.message || 'Subscription failed');
      }
    } catch (err) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#FFFCF6] min-h-screen pb-12 px-6 md:px-12 lg:px-24 font-[var(--font-poppins)] pt-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-12">
        
        {/* Header Section */}
        <header className="text-center space-y-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest"
          >
            <BookOpen className="w-3.5 h-3.5" /> Our Journal
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-extrabold text-gray-900 tracking-tight"
          >
            Insights & <span className="text-[var(--color-primary)]">Articles</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed"
          >
            Resources, stories, and expert advice on geriatric care, wellness, and building a better life for our elders.
          </motion.p>
        </header>

        {/* Featured Post */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="relative h-[400px] md:h-[500px] rounded-[2.5rem] overflow-hidden group shadow-2xl"
        >
          <Image 
            src="https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=1200&auto=format&fit=crop"
            alt="Featured Post"
            fill
            unoptimized={true}
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 p-8 md:p-12 w-full max-w-3xl">
            <span className="inline-block px-3 py-1 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg mb-4">
              Featured Article
            </span>
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-4 line-clamp-2">
              The Future of Memory Care: How AI is Helping Families Navigate Alzheimer&apos;s
            </h2>
            <p className="text-gray-200 text-sm md:text-base mb-6 line-clamp-2 opacity-90">
              Integrating artificial intelligence with compassionate human care is providing new avenues for early detection and personalized care plans for those living with memory loss.
            </p>
            <button className="flex items-center gap-2 bg-white text-gray-900 px-6 py-3 rounded-xl font-bold text-sm hover:bg-emerald-50 transition-all">
              Read Full Story <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>

        {/* Blog Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {BLOG_POSTS.map((post, i) => (
            <motion.div 
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all group flex flex-col"
            >
              <div className="relative h-56 overflow-hidden">
                <Image 
                  src={post.image}
                  alt={post.title}
                  fill
                  unoptimized={true}
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <span className="absolute top-4 left-4 px-3 py-1 bg-white/90 backdrop-blur-md text-[var(--color-primary)] text-[10px] font-bold uppercase tracking-widest rounded-lg">
                  {post.category}
                </span>
              </div>
              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center gap-4 text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-4">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" /> {post.date}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <User className="w-3 h-3" /> {post.author}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-[var(--color-primary)] transition-colors">
                  {post.title}
                </h3>
                <p className="text-sm text-gray-500 mb-6 line-clamp-3 leading-relaxed">
                  {post.excerpt}
                </p>
                <div className="mt-auto">
                  <button className="flex items-center gap-2 text-[var(--color-primary)] font-bold text-sm group/btn">
                    Keep Reading <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </section>

        {/* Newsletter Signup */}
        <section className="bg-emerald-900 text-white rounded-[2.5rem] p-10 md:p-16 relative overflow-hidden text-center">
            <div className="relative z-10 space-y-6">
                <h2 className="text-3xl md:text-4xl font-bold">Stay Updated</h2>
                <p className="text-emerald-100/80 max-w-xl mx-auto leading-relaxed">
                    Get the latest expert advice, health tips, and community updates delivered straight to your inbox every week.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mt-8">
                    <input 
                        type="email" 
                        placeholder="Your email address" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                        className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:bg-white/10 transition-all text-sm disabled:opacity-50"
                    />
                    <button 
                        onClick={handleSubscribe}
                        disabled={loading}
                        className="bg-[var(--color-primary)] text-white px-8 py-4 rounded-2xl font-bold text-sm hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-950/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {loading ? 'Subscribing...' : 'Subscribe'}
                    </button>
                </div>
                <p className="text-[10px] text-emerald-100/40 uppercase font-bold tracking-widest">
                    No spam. Only high-quality care insights.
                </p>
            </div>
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        </section>

      </div>
    </div>
  );
}

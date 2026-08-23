'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Loader2, X, Clock, User, ArrowRight } from 'lucide-react';
import { supportService } from '@/services/api/supportService';
import { uiConfigService } from '@/services/api/uiConfigService';
import { toast } from 'sonner';

interface BlogPost {
  id: string;
  date: string;
  image: string;
  title: string;
  author: string;
  excerpt: string;
  category: string;
  content?: string;
}

const DEFAULT_POSTS: BlogPost[] = [
  {
    id: "1",
    date: "April 10, 2026",
    image: "https://plus.unsplash.com/premium_photo-1663036976879-4baf18adfd5b?w=600&auto=format&fit=crop&q=60",
    title: "Understanding Elder Care: A Comprehensive Guide",
    author: "Dr. Satish Babu",
    excerpt: "Learn about the different aspects of elder care and how to choose the right services for your loved ones.",
    category: "Caregiving",
    content: `
      <p class="text-base text-gray-600 mb-4 leading-relaxed">
        Elder care is a multifaceted responsibility that involves medical, social, and emotional care. As our loved ones age, their needs become more unique and require specialized caregiving. Choosing the right services can help them retain independence and dignity while ensuring they receive appropriate medical attention.
      </p>
      <h3 class="text-xl font-bold text-gray-900 mt-6 mb-3">Selecting Geriatric Care</h3>
      <p class="text-base text-gray-600 mb-4 leading-relaxed">
        Geriatric care focuses on health promotion and prevention of disease. The goals of care are to maintain autonomy, optimize health status, and enhance the quality of life. Professional caregivers can assist with activities of daily living, medication management, and nursing support, ensuring safety and peace of mind at home.
      </p>
      <p class="text-base text-gray-600 mb-4 leading-relaxed">
        When evaluating geriatric care services, consider their credentials, references, and compatibility with your loved one. Active communication between family members and professional staff is key to a successful care plan.
      </p>
    `
  },
  {
    id: "2",
    date: "April 5, 2026",
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=800&auto=format&fit=crop",
    title: "The Importance of Social Interaction for Seniors",
    author: "Emily Chen",
    excerpt: "Discover why staying socially active is crucial for the mental and physical health of senior citizens.",
    category: "Wellness",
    content: `
      <p class="text-base text-gray-600 mb-4 leading-relaxed">
        Social isolation is a significant health risk for older adults, often leading to depression, anxiety, and cognitive decline. Staying socially active has been shown to reduce stress, improve sleep, and delay the onset of age-related illnesses.
      </p>
      <h3 class="text-xl font-bold text-gray-900 mt-6 mb-3">Staying Connected</h3>
      <p class="text-base text-gray-600 mb-4 leading-relaxed">
        Participating in community events, family gatherings, or senior clubs helps maintain emotional health. Regular interactions stimulate brain function and delay cognitive decline. Encouraging elders to stay connected with friends and family is just as important as managing their physical health.
      </p>
      <p class="text-base text-gray-600 mb-4 leading-relaxed">
        At Ayuxa, we prioritize social wellness by organizing interactive events and promoting companionship services. Simple acts like regular phone calls or shared hobbies can make a meaningful difference.
      </p>
    `
  },
  {
    id: "3",
    date: "March 28, 2026",
    image: "https://images.unsplash.com/photo-1733685373369-95bda03f2b40?w=600&auto=format&fit=crop&q=60",
    title: "Tech Solutions for Aging in Place",
    author: "Dhemaan G. Aditya",
    excerpt: "Exploring how modern technology is making it safer and easier for elders to live independently at home.",
    category: "Technology",
    content: `
      <p class="text-base text-gray-600 mb-4 leading-relaxed">
        Technology is revolutionizing how elders live at home, allowing them to retain independence while ensuring their safety. From smart pill dispensers and motion sensors to video monitoring, smart tech can alert caregivers of potential issues in real-time.
      </p>
      <h3 class="text-xl font-bold text-gray-900 mt-6 mb-3">Smart Home Upgrades</h3>
      <p class="text-base text-gray-600 mb-4 leading-relaxed">
        Embracing technology can reduce anxiety for family members who live far away, knowing their loved ones are safe and monitored. Key gadgets include fall-detection wearables, voice-controlled virtual assistants, and smart lights that prevent night-time tripping.
      </p>
      <p class="text-base text-gray-600 mb-4 leading-relaxed">
        Choosing technology that is user-friendly and intuitive is essential. Simple interfaces, clear displays, and reliable connectivity ensure that seniors can operate these tools with confidence.
      </p>
    `
  }
];

const DEFAULT_FEATURED: BlogPost = {
  id: "featured",
  date: "April 15, 2026",
  image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=1200&auto=format&fit=crop",
  title: "The Future of Memory Care: How AI is Helping Families Navigate Alzheimer's",
  author: "Dr. Satish Babu",
  excerpt: "Integrating artificial intelligence with compassionate human care is providing new avenues for early detection and personalized care plans for those living with memory loss.",
  category: "Featured Article",
  content: `
    <p class="text-base text-gray-600 mb-4 leading-relaxed">
      Memory care is undergoing a significant transformation due to advancements in artificial intelligence and machine learning. These technological integrations, when combined with compassionate human care, offer promising solutions for families navigating Alzheimer's and other forms of dementia.
    </p>
    <h3 class="text-xl font-bold text-gray-900 mt-6 mb-3">AI in Early Detection</h3>
    <p class="text-base text-gray-600 mb-4 leading-relaxed">
      AI tools can analyze speech, cognitive patterns, and motor skills to detect signs of dementia years before clinical symptoms manifest. Early detection allows families to plan care, start medication, and prepare adjustments sooner, leading to better outcomes.
    </p>
    <p class="text-base text-gray-600 mb-4 leading-relaxed">
      Additionally, AI-driven home automation can create personalized schedules, lighting, and voice prompts to help Alzheimer's patients live safely at home, reducing stress for family caregivers and supporting independence.
    </p>
  `
};

export default function BlogsPage() {
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [posts, setPosts] = useState<BlogPost[]>(DEFAULT_POSTS);
  const [featuredPost, setFeaturedPost] = useState<BlogPost>(DEFAULT_FEATURED);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const config = await uiConfigService.getCompanyGlobalConfig();
        if (config && config.blogs_content) {
          const bc = config.blogs_content;
          if (bc.posts && bc.posts.length > 0) {
            setPosts(bc.posts);
          }
          if (bc.featured && bc.featured.title) {
            setFeaturedPost({
              id: 'featured',
              category: 'Featured Article',
              date: bc.featured.date || 'April 15, 2026',
              author: bc.featured.author || 'Dr. Satish Babu',
              ...bc.featured
            });
          }
        }
      } catch (err) {
        console.error("Error loading blogs content:", err);
      } finally {
        setPageLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSubscribe = async () => {
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setSubscribing(true);
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
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubscribing(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="bg-[#FFFCF6] min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

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

        {/* Featured Post Card */}
        {featuredPost && (
          <div className="relative h-[400px] md:h-[500px] rounded-[2.5rem] overflow-hidden group shadow-2xl">
            <img 
              src={featuredPost.image}
              alt={featuredPost.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
            <div className="absolute bottom-0 left-0 p-8 md:p-12 w-full max-w-3xl">
              <span className="inline-block px-3 py-1 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg mb-4">
                {featuredPost.category}
              </span>
              <h2 className="text-2xl md:text-4xl font-bold text-white mb-4 line-clamp-2">
                {featuredPost.title}
              </h2>
              <p className="text-gray-200 text-sm md:text-base mb-6 line-clamp-2 opacity-90">
                {featuredPost.excerpt}
              </p>
              <button 
                onClick={() => setSelectedPost(featuredPost)}
                className="flex items-center gap-2 bg-white text-gray-900 px-6 py-3 rounded-xl font-bold text-sm hover:bg-emerald-50 transition-all active:scale-95 shadow-sm"
              >
                Read Full Story
              </button>
            </div>
          </div>
        )}

        {/* Blog Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {posts.map((post) => (
            <div key={post.id} className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all group flex flex-col">
              <div className="relative h-56 overflow-hidden">
                <img 
                  src={post.image}
                  alt={post.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <span className="absolute top-4 left-4 px-3 py-1 bg-white/90 backdrop-blur-md text-emerald-700 text-[10px] font-bold uppercase tracking-widest rounded-lg">
                  {post.category}
                </span>
              </div>
              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center gap-4 text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-4">
                  <div className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {post.date}</div>
                  <div className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {post.author}</div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-emerald-600 transition-colors line-clamp-2">
                  {post.title}
                </h3>
                <p className="text-sm text-gray-500 mb-6 line-clamp-3 leading-relaxed">
                  {post.excerpt}
                </p>
                <div className="mt-auto">
                  <button 
                    onClick={() => setSelectedPost(post)}
                    className="flex items-center gap-1 text-emerald-600 font-bold text-sm hover:underline"
                  >
                    Keep Reading <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Article Reader Modal */}
        <AnimatePresence>
          {selectedPost && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedPost(null)}
            >
              <motion.div 
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-[#FFFCF6] w-full max-w-3xl rounded-[2.5rem] overflow-hidden shadow-2xl max-h-[85vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header Image */}
                <div className="relative h-64 md:h-80 w-full flex-shrink-0">
                  <img src={selectedPost.image} alt={selectedPost.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <button 
                    onClick={() => setSelectedPost(null)}
                    className="absolute top-6 right-6 w-10 h-10 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-6 left-6 right-6">
                    <span className="inline-block px-3 py-1 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg mb-2">
                      {selectedPost.category}
                    </span>
                    <h2 className="text-xl md:text-3xl font-bold text-white leading-tight">
                      {selectedPost.title}
                    </h2>
                  </div>
                </div>
                
                {/* Article Content */}
                <div className="p-8 overflow-y-auto flex-1 space-y-6">
                  <div className="flex items-center gap-6 text-gray-400 text-xs font-bold uppercase tracking-widest pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {selectedPost.date}</div>
                    <div className="flex items-center gap-1.5"><User className="w-4 h-4" /> By {selectedPost.author}</div>
                  </div>
                  <div 
                    className="prose max-w-none text-gray-600 leading-relaxed text-sm md:text-base space-y-4"
                    dangerouslySetInnerHTML={{ __html: selectedPost.content || `<p>${selectedPost.excerpt}</p>` }}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Newsletter Signup */}
        <section className="bg-emerald-950 text-white rounded-[2.5rem] p-10 md:p-16 relative overflow-hidden text-center">
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
                        disabled={subscribing}
                        className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:bg-white/10 transition-all text-sm disabled:opacity-50"
                    />
                    <button 
                        onClick={handleSubscribe}
                        disabled={subscribing}
                        className="bg-[var(--color-primary)] text-white px-8 py-4 rounded-2xl font-bold text-sm hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-950/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {subscribing && <Loader2 className="w-4 h-4 animate-spin" />}
                        {subscribing ? 'Subscribing...' : 'Subscribe'}
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

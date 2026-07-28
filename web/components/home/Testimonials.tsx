'use client';

import React from 'react';
import { Star } from 'lucide-react';
import { motion } from 'framer-motion';

export interface Review {
  text: string;
  author: string;
  role: string;
  rating?: number;
}

const DEFAULT_REVIEWS: Review[] = [
  {
    text: "The physiotherapist was incredibly professional. Booking through the app took less than a minute.",
    author: "Arun K.",
    role: "Son of patient",
    rating: 5,
  },
  {
    text: "Ayuxa's 24/7 care is a lifesaver. It feels like having an extended family looking out for my parents.",
    author: "Priya S.",
    role: "Verified User",
    rating: 5,
  },
  {
    text: "Quick, reliable, and transparent pricing. The doctor arrived exactly on time for the routine checkup.",
    author: "Rahul M.",
    role: "Working Professional",
    rating: 5,
  }
];

export function Testimonials({ reviews }: { reviews?: Review[] }) {
  const activeReviews = reviews && reviews.length > 0 ? reviews : DEFAULT_REVIEWS;

  return (
    <section className="w-full bg-white py-4 px-4 flex flex-col items-center">
       <div className="max-w-5xl w-full">
         
         <div className="text-center mb-16">
           <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">Loved by Families</h2>
           <p className="text-lg text-gray-500 max-w-2xl mx-auto">Don&apos;t just take our word for it. Here&apos;s what our community says about their experience with Ayuxa.</p>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
            {activeReviews.map((review, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-[#f8f9fc] rounded-3xl p-8 border border-transparent hover:border-[var(--color-primary)]/20 hover:shadow-xl transition-all"
              >
                 <div className="flex gap-1 mb-6">
                    {Array.from({ length: review.rating || 5 }).map((_, s) => (
                      <Star key={s} className="w-5 h-5 text-amber-400 fill-amber-400" />
                    ))}
                 </div>
                 
                 <p className="text-gray-700 text-lg font-medium leading-relaxed italic mb-8">
                   &quot;{review.text}&quot;
                 </p>
                 
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500 uppercase">
                      {review.author ? review.author.charAt(0) : 'C'}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-base">{review.author}</h4>
                      <p className="text-sm text-gray-400">{review.role}</p>
                    </div>
                 </div>
              </motion.div>
            ))}
         </div>
         
       </div>
    </section>
  );
}

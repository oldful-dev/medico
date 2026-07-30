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

  // Duplicate activeReviews to ensure smooth continuous marquee loops
  const marqueeItems = [...activeReviews, ...activeReviews, ...activeReviews];

  return (
    <section className="w-full bg-white py-16 flex flex-col items-center overflow-hidden">
       <div className="w-full">
         
         <div className="text-center mb-12 px-4">
           <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">Loved by Families</h2>
           <p className="text-lg text-gray-500 max-w-2xl mx-auto">Don&apos;t just take our word for it. Here&apos;s what our community says about their experience with Ayuxa.</p>
         </div>

         <div className="w-full overflow-hidden py-4 select-none pointer-events-none">
           <div className="relative flex max-w-[100vw]">
             <motion.div
               animate={{ x: [0, -1440] }}
               transition={{
                 x: {
                   repeat: Infinity,
                   repeatType: "loop",
                   duration: 50,
                   ease: "linear",
                 },
               }}
               className="flex flex-none gap-8 items-stretch whitespace-nowrap pr-8"
             >
                {marqueeItems.map((review, i) => (
                  <div 
                    key={i}
                    className="inline-block bg-[#f8f9fc] rounded-3xl p-8 border border-transparent w-[350px] sm:w-[400px] shrink-0"
                    style={{ whiteSpace: 'normal' }}
                  >
                     <div className="flex gap-1 mb-4">
                        {Array.from({ length: review.rating || 5 }).map((_, s) => (
                          <Star key={s} className="w-5 h-5 text-amber-400 fill-amber-400" />
                        ))}
                     </div>
                     
                     <p className="text-gray-700 text-base font-medium leading-relaxed italic mb-6 min-h-[72px]">
                       &quot;{review.text}&quot;
                     </p>
                     
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500 uppercase text-sm">
                          {review.author ? review.author.charAt(0) : 'C'}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 text-sm">{review.author}</h4>
                          <p className="text-xs text-gray-400">{review.role}</p>
                        </div>
                     </div>
                  </div>
                ))}
             </motion.div>
           </div>
         </div>
         
       </div>
    </section>
  );
}

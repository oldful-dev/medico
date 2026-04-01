import { Navbar } from '@/components/layout/Navbar';

export default function WellnessPage() {
  return (
    <div className="min-h-screen bg-[#FFFCF6] font-[var(--font-poppins)] pt-32 pb-20 relative overflow-hidden">
      <Navbar />

      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-1/4 left-10 w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] rounded-full bg-gradient-radial from-[#34C759]/20 to-transparent blur-3xl opacity-50 pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-[30vw] h-[30vw] max-w-[400px] max-h-[400px] rounded-full bg-gradient-radial from-orange-400/10 to-transparent blur-3xl opacity-60 pointer-events-none"></div>

      <main className="container mx-auto px-6 relative z-10 flex flex-col md:flex-row items-center gap-12 max-w-6xl">
        
        {/* Text Content & Waitlist */}
        <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left mt-8 md:mt-0">
           <span className="inline-block px-4 py-1.5 rounded-full bg-[rgba(4,131,87,0.1)] text-[var(--color-primary)] text-xs font-bold uppercase tracking-wider mb-6">Coming Soon</span>
           <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-[1.1] mb-6 tracking-tight">
             Elevate your <br className="hidden md:block"/> daily <span className="text-[var(--color-primary)]">wellness.</span>
           </h1>
           <p className="text-gray-500 text-lg md:text-xl font-medium max-w-md mb-10">
             Personalized diet plans, fitness tracking, and mindfulness exercises tailored specifically for elderly & rehabilitation care.
           </p>

           {/* Early Access Input */}
           <div className="w-full max-w-sm flex flex-col sm:flex-row gap-3">
             <input 
               type="email" 
               placeholder="Enter your email" 
               className="flex-1 px-5 py-4 rounded-xl border border-gray-200 outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 transition-all font-medium text-gray-800 shadow-sm"
             />
             <button className="bg-[var(--color-primary)] text-white font-bold py-4 px-8 rounded-xl hover:bg-[var(--color-primary-dark)] transition-colors shadow-lg hover:shadow-xl shrink-0 whitespace-nowrap">
                Join Waitlist
             </button>
           </div>
           <p className="text-sm text-gray-400 mt-4">Be the first to access our new features.</p>

        </div>

        {/* Sneak Peek Mockups */}
        <div className="flex-1 w-full flex justify-center scale-90 md:scale-100">
           {/* Glassy overlapping cards resembling upcoming features */}
           <div className="relative w-full max-w-[400px] aspect-square">
             
              {/* Feature 1 (Diet) */}
              <div className="absolute top-10 right-0 w-[240px] bg-white/70 backdrop-blur-md border border-white p-5 rounded-2xl shadow-xl flex gap-4 opacity-80 rotate-3 z-10 filter grayscale-[40%]">
                 <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-xl">🥗</div>
                 <div className="flex flex-col gap-2 flex-1">
                    <div className="w-20 h-4 bg-gray-200 rounded"></div>
                    <div className="w-32 h-3 bg-gray-100 rounded"></div>
                 </div>
              </div>

              {/* Feature 2 (Yoga) */}
              <div className="absolute top-[45%] left-0 w-[260px] bg-white/70 backdrop-blur-md border border-white p-5 rounded-3xl shadow-2xl flex gap-4 opacity-70 -rotate-6 z-20 filter grayscale-[40%]">
                 <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-xl">🧘‍♀️</div>
                 <div className="flex flex-col gap-2 flex-1">
                    <div className="w-24 h-4 bg-gray-200 rounded"></div>
                    <div className="w-full h-8 flex gap-1 items-end mt-1">
                       <div className="w-6 h-full bg-gray-200 rounded-sm"></div>
                       <div className="w-6 h-[60%] bg-gray-200 rounded-sm"></div>
                       <div className="w-6 h-[80%] bg-gray-200 rounded-sm"></div>
                    </div>
                 </div>
              </div>

              {/* Status Lock Icon */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-900/80 backdrop-blur text-white p-4 rounded-full z-30 shadow-2xl">
                 <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
              </div>

           </div>
        </div>

      </main>
    </div>
  );
}

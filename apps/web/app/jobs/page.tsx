import React from 'react';
import { Search, MapPin, Briefcase } from 'lucide-react';

export default function JobsPage() {
  return (
    <div className="flex-1 flex flex-col bg-[#F7F7F5] min-h-screen">
      <header className="bg-white border-b border-[#111111]/10 pt-16 pb-12">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl">
            <h1 className="font-serif text-5xl font-bold text-[#111111] mb-6">Careers at Zayron-X</h1>
            <p className="text-lg text-[#2D2D2D] font-sans leading-relaxed">
              Join the elite team building the world&apos;s most advanced cyber-intelligence and vulnerability radar platform.
            </p>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12 flex-1">
        <div className="flex flex-col lg:flex-row gap-12">
          
          <aside className="w-full lg:w-64 shrink-0 space-y-8">
            <div>
              <h3 className="font-bold text-xs uppercase tracking-widest text-[#111111] border-b border-[#111111]/10 pb-2 mb-4">Department</h3>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm text-[#2D2D2D]"><input type="checkbox" className="rounded-none focus:ring-[#FF6B00]" /> Intelligence & Research</label>
                <label className="flex items-center gap-2 text-sm text-[#2D2D2D]"><input type="checkbox" className="rounded-none focus:ring-[#FF6B00]" /> Engineering & AI</label>
                <label className="flex items-center gap-2 text-sm text-[#2D2D2D]"><input type="checkbox" className="rounded-none focus:ring-[#FF6B00]" /> Product & Design</label>
              </div>
            </div>
          </aside>

          <main className="flex-1 space-y-6">
            <div className="bg-white border border-[#111111]/10 p-6 hover:border-[#111111] transition-colors cursor-pointer group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-serif text-2xl font-bold text-[#111111] group-hover:text-[#FF6B00] transition-colors mb-2">Senior CTI Analyst (EMEA)</h3>
                  <div className="flex items-center gap-4 text-sm text-[#2D2D2D]">
                    <span className="flex items-center gap-1"><Briefcase className="w-4 h-4" /> Intelligence & Research</span>
                    <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> Remote (EMEA)</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest bg-[#111111] text-white px-3 py-1">Apply</span>
              </div>
              <p className="text-sm text-[#2D2D2D]">
                Lead investigations into state-sponsored cyber operations targeting European critical infrastructure. Produce high-fidelity intelligence reports utilizing Zayron-X telemetry.
              </p>
            </div>

            <div className="bg-white border border-[#111111]/10 p-6 hover:border-[#111111] transition-colors cursor-pointer group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-serif text-2xl font-bold text-[#111111] group-hover:text-[#FF6B00] transition-colors mb-2">Staff Machine Learning Engineer</h3>
                  <div className="flex items-center gap-4 text-sm text-[#2D2D2D]">
                    <span className="flex items-center gap-1"><Briefcase className="w-4 h-4" /> Engineering & AI</span>
                    <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> San Francisco, CA / Remote</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest bg-[#111111] text-white px-3 py-1">Apply</span>
              </div>
              <p className="text-sm text-[#2D2D2D]">
                Design and optimize the Zayron-X behavioral inference engine. Work directly with massive, high-velocity network datasets to detect novel attack patterns.
              </p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

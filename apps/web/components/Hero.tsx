"use client";

import Link from "next/link";
import { ThreatAssessmentCard } from "./ThreatAssessmentCard";
import { motion } from "framer-motion";

export function Hero() {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: { type: "tween", ease: "easeOut", duration: 0.25 }
    }
  };

  return (
    <section className="relative w-full border-b border-[#E1DFD7] bg-[#F5F4F0] pt-20 pb-16 md:pt-28 md:pb-20 overflow-hidden flex flex-col items-center justify-center text-center">
      {/* Subtle Architectural Surface Background */}
      <div className="absolute inset-0 bg-white/20 pointer-events-none" />

      <div className="relative max-w-[1024px] mx-auto px-6 w-full flex flex-col items-center">
        <motion.div 
          className="flex flex-col items-center space-y-8 z-10 w-full"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {/* Micro Label */}
          <motion.div 
            variants={itemVariants}
            className="text-[10px] font-bold tracking-[0.1em] text-[#8C8F98] uppercase"
          >
            CYBER THREAT INTELLIGENCE & RESEARCH
          </motion.div>

          {/* Primary Headline */}
          <motion.h1 
            variants={itemVariants}
            className="font-editorial text-4xl sm:text-5xl lg:text-[64px] font-semibold text-[#111214] leading-[1.05] tracking-tight uppercase"
          >
            SEE THE THREAT.<br/>
            UNDERSTAND THE EVIDENCE.<br/>
            ACT WITH CONFIDENCE.
          </motion.h1>

          {/* Supporting Copy */}
          <motion.p 
            variants={itemVariants}
            className="text-sm md:text-base text-[#5A5D65] leading-relaxed max-w-2xl mx-auto"
          >
            Evidence-driven cyber threat intelligence connecting vulnerabilities, adversaries, malware, infrastructure, and emerging campaigns into actionable context.
          </motion.p>

          {/* Action Controls */}
          <motion.div 
            variants={itemVariants}
            className="flex flex-wrap justify-center items-center gap-4 pt-4 pb-12"
          >
            <Link
              href="/threats"
              className="text-xs font-bold uppercase tracking-[0.06em] bg-[#111214] text-[#FFFFFF] px-7 py-3.5 rounded-[3px] hover:bg-[#D9531E] transition-colors shadow-none"
            >
              Explore Intelligence
            </Link>
            <Link
              href="/knowledge"
              className="text-xs font-bold uppercase tracking-[0.06em] bg-transparent text-[#111214] border border-[#E1DFD7] px-7 py-3.5 rounded-[3px] hover:border-[#111214] hover:bg-[#FFFFFF] transition-colors"
            >
              View Platform
            </Link>
          </motion.div>

          {/* Threat Assessment Signal */}
          <motion.div 
            variants={itemVariants}
            className="relative w-full max-w-[420px] mx-auto mt-8"
          >
            <div className="absolute -inset-2 bg-gradient-to-t from-[#E1DFD7]/40 to-transparent rounded-[8px] -z-10 blur-[1px]" />
            <ThreatAssessmentCard />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

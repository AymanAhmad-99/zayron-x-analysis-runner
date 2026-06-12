'use client';

import { useEffect, useRef, useState } from 'react';

interface StatsCounterProps {
  articles: number;
  cves: number;
  tools: number;
  analysts: number;
}

function Counter({ target, label }: { target: number; label: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const counted = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !counted.current) {
          counted.current = true;
          const duration = 2000;
          const steps = 40;
          const increment = target / steps;
          let current = 0;
          const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
              setCount(target);
              clearInterval(timer);
            } else {
              setCount(Math.floor(current));
            }
          }, duration / steps);
        }
      },
      { threshold: 0.1 },
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return (
    <div ref={ref} className="text-center">
      <span className="block font-display text-4xl lg:text-5xl font-black text-black tabular-nums">
        {count.toLocaleString()}+
      </span>
      <span className="text-[10px] text-[#666666] uppercase tracking-[0.15em] font-bold font-mono mt-1 block">
        {label}
      </span>
    </div>
  );
}

export function StatsCounter({ articles, cves, tools, analysts }: StatsCounterProps) {
  return (
    <section className="bg-white border-y border-[#222222] py-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          <Counter target={articles} label="Intelligence Reports" />
          <Counter target={cves} label="CVEs Tracked" />
          <Counter target={tools} label="Security Tools" />
          <Counter target={analysts} label="Analysts" />
        </div>
      </div>
    </section>
  );
}

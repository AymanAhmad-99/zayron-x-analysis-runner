'use client';

import React, { useState, useEffect } from 'react';

const STREAM_ITEMS = [
  '[HASH: 8b4c52f | IP: 185.220.101.44 | VECTOR: PORT_SCAN | STATUS: INTERCEPTED]',
  '[HASH: f2c4b58 | IP: 91.240.118.15 | VECTOR: SSH_BRUTE | STATUS: REDACTED]',
  '[HASH: c5e4b7a | IP: 185.112.144.9 | VECTOR: WAF_ATTACK | STATUS: QUARANTINED]',
  '[HASH: 5d4b58c | IP: 45.227.254.12 | VECTOR: RDP_EXPLOIT | STATUS: BLOCKING]',
  '[HASH: 9a8b7c6 | IP: 109.230.199.4 | VECTOR: TLS_INTERCEPT | STATUS: MASQUERADING]',
  '[HASH: a8b7c6d | IP: 192.3.166.42 | VECTOR: CNC_HEARTBEAT | STATUS: CLASSIFIED]',
];

export function LiveIntelTicker() {
  const [tickerOffset, setTickerOffset] = useState(0);
  const [flickerVal, setFlickerVal] = useState(1382);

  // Animate scrolling offset and trigger random numeric flickers
  useEffect(() => {
    const scrollInterval = setInterval(() => {
      setTickerOffset((prev) => (prev + 1) % STREAM_ITEMS.length);
    }, 4000);

    const flickerInterval = setInterval(() => {
      setFlickerVal((prev) => {
        const delta = Math.floor(Math.random() * 21) - 10;
        return Math.max(1000, Math.min(2000, prev + delta));
      });
    }, 1500);

    return () => {
      clearInterval(scrollInterval);
      clearInterval(flickerInterval);
    };
  }, []);

  return (
    <div className="bg-[#FAFAFA] border-y border-neutral-200 py-3.5 px-6 font-mono text-[10px] uppercase select-none flex items-center justify-between gap-6 overflow-hidden">
      {/* Live Indicator */}
      <div className="flex items-center gap-2 shrink-0 border-r border-neutral-200 pr-6">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-600"></span>
        </span>
        <span className="font-black text-[#050505] tracking-wider">LIVE INTEL FEED</span>
      </div>

      {/* Stream Message Scrolling */}
      <div className="w-full relative flex items-center overflow-hidden h-4 text-neutral-500 font-bold">
        <div
          className="absolute flex whitespace-nowrap transition-all duration-700 ease-in-out gap-8"
          style={{ transform: `translateY(${-tickerOffset * 16}px)` }}
        >
          {STREAM_ITEMS.map((item, idx) => (
            <div key={idx} className="h-4 flex items-center gap-1.5">
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Live Metric Flicker Counter */}
      <div className="shrink-0 flex items-center gap-3 border-l border-neutral-200 pl-6 text-right font-black">
        <span className="text-neutral-400">PACKETS/SEC:</span>
        <span className="text-[#050505] min-w-[32px] inline-block tabular-nums animate-pulse">
          {flickerVal}
        </span>
      </div>
    </div>
  );
}

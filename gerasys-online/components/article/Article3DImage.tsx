"use client";

import { useState } from "react";
import Image from "next/image";
import type { Article } from "@/lib/types";

interface Article3DImageProps {
  article: Article;
}

export function Article3DImage({ article }: Article3DImageProps) {
  const [imgError, setImgError] = useState(false);

  const imageTag = article.imageTag || article.category || "cybersecurity";
  const imageUrl = `https://images.unsplash.com/featured/1600x900/?${encodeURIComponent(imageTag.toLowerCase())}`;

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-neutral-200/60 bg-neutral-950 aspect-[21/9]">
      {imgError ? (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-indigo-950 flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(115,61,217,0.15)_0,transparent_100%)] pointer-events-none" />
          <div className="relative z-10 space-y-2">
            <span className="text-[10px] font-mono tracking-[0.2em] text-[#733DD9] font-bold uppercase">
              SECURE TELEMETRY CAPTURE
            </span>
            <h3 className="text-sm font-black uppercase text-white font-mono tracking-tight max-w-lg leading-normal">
              {article.title}
            </h3>
            <p className="text-[9px] text-neutral-400 font-mono uppercase tracking-wider">
              STATUS: ENCRYPTED // TLP:AMBER
            </p>
          </div>
        </div>
      ) : (
        <>
          <Image
            src={imageUrl}
            alt={article.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
            onError={() => setImgError(true)}
            className="object-cover transition-transform duration-700 hover:scale-105"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
          <div className="absolute bottom-4 left-4 z-10 flex items-center gap-3 select-none">
            <span className="text-[9px] uppercase tracking-[0.14em] text-white font-bold font-mono border border-white/20 rounded-full px-3 py-1 bg-black/60 backdrop-blur-md">
              {article.category}
            </span>
            <span className="text-[9px] text-neutral-300 font-mono uppercase tracking-widest hidden sm:inline-block">
              ZAYRON-X INTEL
            </span>
          </div>
        </>
      )}
    </div>
  );
}

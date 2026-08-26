'use client';

import { Facebook, LinkIcon, Share2, Twitter } from '@/lib/icons';
import { useState } from 'react';

interface ShareButtonsProps {
  url: string;
  title: string;
}

export function ShareButtons({ url, title }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const encoded = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  function copyLink() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex items-center gap-2 py-4 border-y border-[#1E293B] my-6">
      <span className="text-xs text-[#94A3B8] font-semibold uppercase tracking-wider flex items-center gap-1.5 font-ui mr-2">
        <Share2 size={14} /> Share
      </span>
      <a
        href={`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encoded}`}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 rounded-md hover:bg-[#111827] text-[#94A3B8] hover:text-[#D2B48C] transition-colors"
        aria-label="Share on Twitter"
      >
        <Twitter size={16} />
      </a>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encoded}`}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 rounded-md hover:bg-[#111827] text-[#94A3B8] hover:text-[#D2B48C] transition-colors"
        aria-label="Share on Facebook"
      >
        <Facebook size={16} />
      </a>
      <button
        onClick={copyLink}
        className="p-2 rounded-md hover:bg-[#111827] text-[#94A3B8] hover:text-[#D2B48C] transition-colors"
        aria-label="Copy link"
      >
        <LinkIcon size={16} />
      </button>
      {copied && (
        <span className="text-[10px] text-[#22C55E] font-semibold font-ui animate-fade-in">
          Copied!
        </span>
      )}
    </div>
  );
}

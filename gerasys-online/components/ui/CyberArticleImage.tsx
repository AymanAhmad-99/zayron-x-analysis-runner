'use client';

import { useEffect, useState } from 'react';

// Keyword map rules linking critical cyber-vectors and tech entities to public abstract imagery:
const KEYWORD_IMAGES: Record<string, string> = {
  telegram:
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&h=450&q=80', // Matrix style encrypted phone grid
  github:
    'https://images.unsplash.com/photo-1607799279861-4dd421887fb3?auto=format&fit=crop&w=800&h=450&q=80', // Secure source code tree/git branching layout
  repository:
    'https://images.unsplash.com/photo-1607799279861-4dd421887fb3?auto=format&fit=crop&w=800&h=450&q=80',
  miasma:
    'https://images.unsplash.com/photo-1607799279861-4dd421887fb3?auto=format&fit=crop&w=800&h=450&q=80',
  lockbit:
    'https://images.unsplash.com/photo-1614064647598-0fe6ae3ea118?auto=format&fit=crop&w=800&h=450&q=80', // Dark malware cypher padlock pattern
  ransomware:
    'https://images.unsplash.com/photo-1614064647598-0fe6ae3ea118?auto=format&fit=crop&w=800&h=450&q=80',
  extortion:
    'https://images.unsplash.com/photo-1614064647598-0fe6ae3ea118?auto=format&fit=crop&w=800&h=450&q=80',
  microsoft:
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&h=450&q=80', // Corporate infrastructure cloud network defense
  defender:
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&h=450&q=80',
  rogueplanet:
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&h=450&q=80',
  email:
    'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&h=450&q=80', // Phishing simulation / secure mail gateway vector
  openclaw:
    'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&h=450&q=80',
  servicenow:
    'https://images.unsplash.com/photo-1562813733-b31f71025d54?auto=format&fit=crop&w=800&h=450&q=80', // Cloud API mesh routing/connectivity string layout
  api: 'https://images.unsplash.com/photo-1562813733-b31f71025d54?auto=format&fit=crop&w=800&h=450&q=80',
  vulnerability:
    'https://images.unsplash.com/photo-1562813733-b31f71025d54?auto=format&fit=crop&w=800&h=450&q=80',
  anthropic:
    'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&h=450&q=80', // Neural networks / artificial intelligence node cluster
  fable:
    'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&h=450&q=80',
  mythos:
    'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&h=450&q=80',
  metadata:
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&h=450&q=80', // Encrypted server rack/data vault visualization
  privacy:
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&h=450&q=80',
  policy:
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&h=450&q=80',
};

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&h=450&q=80', // neon network nodes/matrix
  'https://images.unsplash.com/photo-1509023467864-1ecb6c43d2be?auto=format&fit=crop&w=800&h=450&q=80', // digital forensics flows
  'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&h=450&q=80', // abstract fiber optics / tech circuit
  'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&h=450&q=80', // cyber dashboard
  'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&h=450&q=80', // circuit board
  'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&h=450&q=80', // servers
  'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=800&h=450&q=80', // abstract digital
  'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&h=450&q=80', // quantum nodes mesh
  'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?auto=format&fit=crop&w=800&h=450&q=80', // binary tech
  'https://images.unsplash.com/photo-1544256718-3bcf237f3974?auto=format&fit=crop&w=800&h=450&q=80', // programming lines
  'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?auto=format&fit=crop&w=800&h=450&q=80', // cybersecurity shield
  'https://images.unsplash.com/photo-1510511459019-5dda7724fd87?auto=format&fit=crop&w=800&h=450&q=80', // glowing screen matrix
];

interface CyberArticleImageProps {
  title: string;
  category: string;
  articleId: string;
  featuredImage?: string | null;
  className?: string;
  priority?: boolean;
  neighborOffset?: number;
}

export default function CyberArticleImage({
  title,
  category,
  articleId,
  featuredImage,
  className = '',
  priority = false,
  neighborOffset = 0,
}: CyberArticleImageProps) {
  const [mounted, setMounted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={`relative overflow-hidden bg-black border border-slate-800 ${className}`}
      >
        <div className="absolute inset-0 z-10 flex flex-col justify-between p-4 bg-gradient-to-br from-neutral-950 to-black animate-pulse">
          <div className="flex justify-between items-center opacity-20">
            <span className="font-mono text-[8px] tracking-widest text-neutral-400">
              SYS_RECON_LOADING...
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping" />
          </div>
          <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-slate-800 to-transparent opacity-20" />
          <span className="font-mono text-[7px] tracking-widest text-neutral-500 text-right uppercase">
            {category}
          </span>
        </div>
      </div>
    );
  }

  // Case-insensitive substring scanner for keywords
  let displaySrc = '';
  const lowercaseTitle = title ? title.toLowerCase() : '';

  for (const [key, value] of Object.entries(KEYWORD_IMAGES)) {
    if (lowercaseTitle.includes(key)) {
      displaySrc = value;
      break;
    }
  }

  // Hash-based fallback modulo 12 if no keyword matches
  if (!displaySrc) {
    const hashSource = articleId || title || '';
    let hash = 0;
    for (let i = 0; i < hashSource.length; i++) {
      hash = hashSource.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % FALLBACK_IMAGES.length;
    displaySrc = (FALLBACK_IMAGES[index] ?? FALLBACK_IMAGES[0]) as string;
  }

  // Override display source with featured image if it exists, is not a data URI fallback, and hasn't errored
  if (featuredImage && !featuredImage.startsWith('data:') && !imgError) {
    displaySrc = featuredImage;
  }

  return (
    <div
      className={`relative overflow-hidden bg-black border border-slate-800 ${className}`}
    >
      {/* Loader Shimmer */}
      {!loaded && (
        <div className="absolute inset-0 z-10 flex flex-col justify-between p-4 bg-gradient-to-br from-neutral-950 to-black animate-pulse">
          <div className="flex justify-between items-center opacity-20">
            <span className="font-mono text-[8px] tracking-widest text-neutral-400">
              SYS_RECON_LOADING...
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping" />
          </div>
          <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-slate-800 to-transparent opacity-20" />
          <span className="font-mono text-[7px] tracking-widest text-neutral-500 text-right uppercase">
            {category}
          </span>
        </div>
      )}

      {/* CRT Scanline styling effect */}
      <div
        className="absolute inset-0 pointer-events-none z-10 opacity-30"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.1) 0px, rgba(0, 0, 0, 0.1) 1px, transparent 1px, transparent 3px)',
        }}
      />

      <img
        src={displaySrc}
        alt={title}
        className={`w-full h-full object-cover object-center transition-all duration-700 ease-out ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
        onError={() => setImgError(true)}
        loading={priority ? 'eager' : 'lazy'}
      />
    </div>
  );
}

import { ExternalLink, GitFork, Star } from '@/lib/icons';
import type { Tool } from '@/lib/types';
import Link from 'next/link';

interface ToolSpotlightProps {
  tools: Tool[];
}

export function ToolSpotlight({ tools }: ToolSpotlightProps) {
  if (!tools.length) return null;

  return (
    <section className="max-w-7xl mx-auto px-6 py-12">
      <div className="mb-10">
        <p className="section-label">Tool Spotlight</p>
        <h2 className="section-heading mt-2">Community Favorites</h2>
        <p className="section-subheading mt-3">
          Curated security tools and frameworks trusted by the global infosec community.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {tools.slice(0, 4).map((tool) => (
          <div key={tool.id} className="card-bento p-5 group">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[10px] uppercase font-bold text-[#D2B48C] tracking-wider font-ui">
                {tool.category}
              </span>
              {tool.rating && (
                <span className="flex items-center gap-1 text-xs text-[#C6A664] font-medium">
                  <Star size={12} fill="currentColor" />
                  {tool.rating}
                </span>
              )}
            </div>
            <h3 className="font-display font-bold text-base text-[#0F172A] mb-1">{tool.name}</h3>
            <p className="text-xs text-[#475569] line-clamp-2 font-body mb-4 leading-relaxed">
              {tool.description}
            </p>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-xs text-[#94A3B8] font-mono">
                <GitFork size={12} />
                {tool.stars ?? 0}
              </span>
              {tool.githubUrl && (
                <Link
                  href={tool.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#D2B48C] hover:underline flex items-center gap-1 font-ui font-medium"
                >
                  GitHub <ExternalLink size={10} />
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

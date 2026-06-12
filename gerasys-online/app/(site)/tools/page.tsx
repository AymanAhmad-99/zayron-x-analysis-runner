export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { ExternalLink, GitFork, Star } from '@/lib/icons';
import { getTools } from '@/lib/supabase/queries/tools';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Security Tools Directory',
  description: 'Curated directory of cybersecurity tools, frameworks, and utilities.',
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL}/tools`,
  },
};

export default async function ToolsPage() {
  let tools: Awaited<ReturnType<typeof getTools>> = [];
  try {
    tools = await getTools();
  } catch (error) {
    console.error('ToolsPage data fetch failed:', error);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="section-subheading">Tools Directory</h1>
        <h2 className="font-display text-3xl font-bold text-[var(--color-obsidian)] mt-1">
          Security Tools &amp; Resources
        </h2>
      </div>

      {tools.length === 0 ? (
        <div className="text-center py-16 text-[#475569] font-ui">No tools listed yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => (
            <div
              key={tool.id}
              className="bg-white border border-[#E2E8F0] rounded-xl p-5 hover:shadow-lg transition-shadow"
            >
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
              <h3 className="font-display font-bold text-lg text-[#0F172A] mb-1">{tool.name}</h3>
              <p className="text-sm text-[#475569] line-clamp-2 font-ui mb-4">{tool.description}</p>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-sm text-[#475569] font-mono">
                  <GitFork size={14} />
                  {tool.stars?.toLocaleString() ?? 0}
                </span>
                {tool.githubUrl && (
                  <Link
                    href={tool.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#D2B48C] hover:underline flex items-center gap-1 font-ui"
                  >
                    GitHub <ExternalLink size={12} />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

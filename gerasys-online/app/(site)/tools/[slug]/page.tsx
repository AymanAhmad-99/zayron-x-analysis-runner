import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getToolBySlug } from "@/lib/supabase/queries/tools";
import { Star, ExternalLink, GitFork } from "@/lib/icons";

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  let tool: Awaited<ReturnType<typeof getToolBySlug>> = null;
  try {
    tool = await getToolBySlug(slug);
  } catch (error) {
    console.error(`generateMetadata failed for tool "${slug}":`, error);
  }
  if (!tool) return { title: "Tool Not Found" };

  return {
    title: `${tool.name} — Tool Review`,
    description: tool.description ?? `${tool.name} security tool details and analysis.`,
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_SITE_URL}/tools/${tool.slug}`,
    },
  };
}

export default async function ToolDetailPage({ params }: Props) {
  const { slug } = await params;
  let tool: Awaited<ReturnType<typeof getToolBySlug>> = null;
  try {
    tool = await getToolBySlug(slug);
  } catch (error) {
    console.error(`ToolDetailPage data fetch failed for "${slug}":`, error);
  }
  if (!tool) notFound();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <nav className="flex items-center gap-2 text-xs text-[#475569] mb-6 font-ui">
        <a href="/" className="hover:text-[#D2B48C]">Home</a>
        <span>/</span>
        <a href="/tools" className="hover:text-[#D2B48C]">Tools</a>
        <span>/</span>
        <span className="text-[#0F172A]">{tool.name}</span>
      </nav>

      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 lg:p-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#D2B48C] tracking-wider font-ui">
              {tool.category}
            </span>
            <h1 className="font-display text-3xl font-bold text-[#0F172A] mt-1">
              {tool.name}
            </h1>
          </div>
          {tool.rating && (
            <span className="flex items-center gap-1.5 text-sm bg-[#C6A664]/10 text-[#C6A664] font-bold px-3 py-1.5 rounded-lg">
              <Star size={14} fill="currentColor" />
              {tool.rating}
            </span>
          )}
        </div>

        <p className="text-[#475569] font-body leading-relaxed mb-6">
          {tool.description}
        </p>

        <div className="flex flex-wrap gap-4 items-center pt-4 border-t border-[#E2E8F0]">
          {tool.stars !== null && (
            <span className="flex items-center gap-1.5 text-sm text-[#475569] font-mono">
              <GitFork size={14} />
              {tool.stars?.toLocaleString()} stars
            </span>
          )}
          {tool.githubUrl && (
            <a
              href={tool.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-[#D2B48C] hover:underline font-ui"
            >
              View on GitHub <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

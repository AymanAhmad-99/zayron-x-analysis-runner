import { Bug, Cpu, Globe, Lock, Shield, Zap } from '@/lib/icons';
import Link from 'next/link';

interface CategoryItem {
  category: string;
  count: number;
}

interface CategoryShowcaseProps {
  categories: CategoryItem[];
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  vulnerability: Shield,
  exploit: Bug,
  ransomware: Lock,
  malware: Bug,
  'nation-state': Globe,
  nationstate: Globe,
  apt: Globe,
  intelligence: Cpu,
  'threat intelligence': Cpu,
  osint: Globe,
  tools: Zap,
  'ai-security': Cpu,
  default: Shield,
};

function getIcon(category: string): React.ReactNode {
  const key = category.toLowerCase().replace(/\s+/g, '');
  const match = Object.entries(CATEGORY_ICONS).find(([k]) => key.includes(k));
  const IconComponent = (match?.[1] ?? CATEGORY_ICONS.default) as React.ComponentType<{
    size?: number;
    className?: string;
  }>;
  return <IconComponent size={20} className="text-black" />;
}

export function CategoryShowcase({ categories }: CategoryShowcaseProps) {
  if (!categories.length) return null;

  return (
    <section className="max-w-7xl mx-auto px-6 py-12">
      <div className="mb-10">
        <p className="section-label">Browse by Domain</p>
        <h2 className="section-heading mt-2">Intelligence Domains</h2>
        <p className="section-subheading mt-3">
          Explore threat reports by category. Each domain is curated by specialized analysts.
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-0">
        {categories.map((cat) => (
          <Link
            key={cat.category}
            href={`/intelligence/${cat.category.toLowerCase().replace(/\s+/g, '-')}`}
            className="card-article p-5 flex flex-col items-center text-center group"
          >
            <div className="w-10 h-10 bg-[#F5F5F5] flex items-center justify-center mb-3 group-hover:bg-black transition-colors">
              {getIcon(cat.category)}
            </div>
            <h3 className="font-ui font-bold text-sm text-black group-hover:underline transition-all">
              {cat.category}
            </h3>
            <span className="text-xs text-[#666666] font-mono mt-1">
              {cat.count} {cat.count === 1 ? 'report' : 'reports'}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

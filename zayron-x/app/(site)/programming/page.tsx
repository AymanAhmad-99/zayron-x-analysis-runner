export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { ArrowRight, Braces, Code2, Cpu, Shield } from '@/lib/icons';
import { getProgrammingLanguages } from '@/lib/db/queries/programming';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Programming Hub — Secure Code Intelligence',
  description:
    'Production-grade security engineering resources. Rust, Python, Go, and more — code snippets, security patterns, and tooling.',
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL}/programming`,
  },
};

export default async function ProgrammingHubPage() {
  let languages: Awaited<ReturnType<typeof getProgrammingLanguages>> = [];
  try {
    languages = await getProgrammingLanguages();
  } catch {}

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-[#E2E8F0] bg-[#F9FAFB]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#D2B48C]/10 border border-[#D2B48C]/20">
              <Braces size={18} className="text-[#D2B48C]" />
            </span>
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-[#D2B48C] font-bold font-ui">
                Programming Hub
              </p>
              <h1 className="font-display text-3xl lg:text-4xl font-extrabold text-[#111827] mt-0.5">
                Secure Code Intelligence
              </h1>
            </div>
          </div>
          <p className="text-[#4B5563] text-base max-w-2xl leading-relaxed">
            Production-grade security engineering patterns, code snippets, and language-specific
            tooling. Curated by ZAYRON-X analysts.
          </p>
        </div>
      </section>

      {/* Language cards */}
      <section className="max-w-7xl mx-auto px-6 lg:px-12 py-16">
        {languages.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-[#F9FAFB] border border-[#E2E8F0] flex items-center justify-center mx-auto mb-6">
              <Code2 size={28} className="text-[#D2B48C]" />
            </div>
            <h2 className="font-display text-xl font-bold text-[#111827] mb-2">
              No Languages Indexed Yet
            </h2>
            <p className="text-sm text-[#4B5563] max-w-md mx-auto leading-relaxed">
              Our analysts are compiling secure coding patterns. Language profiles will appear here
              once indexed.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {languages.map((lang) => (
              <div key={lang.id} className="card-bento p-8 flex flex-col group">
                {/* Language name */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#D2B48C]/8 border border-[#D2B48C]/15 flex items-center justify-center">
                    <Cpu size={18} className="text-[#D2B48C]" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-[#111827] group-hover:text-[#D2B48C] transition-colors">
                      {lang.name}
                    </h3>
                    {lang.paradigm && (
                      <span className="text-[10px] text-[#9CA3AF] font-mono uppercase">
                        {lang.paradigm}
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                {lang.description && (
                  <p className="text-sm text-[#4B5563] leading-relaxed mb-4 flex-1">
                    {lang.description}
                  </p>
                )}

                {/* Code snippet preview */}
                {lang.codeSnippet && (
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-4 mb-4 overflow-x-auto">
                    <pre className="text-xs font-mono text-[#4B5563] leading-relaxed whitespace-pre-wrap">
                      {lang.codeSnippet.substring(0, 200)}
                      {(lang.codeSnippet?.length ?? 0) > 200 ? '...' : ''}
                    </pre>
                  </div>
                )}

                {/* Security features */}
                {lang.securityFeatures && lang.securityFeatures.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Shield size={11} className="text-[#D2B48C]" />
                      <span className="text-[10px] text-[#D2B48C] font-bold font-ui uppercase tracking-wider">
                        Security Features
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {lang.securityFeatures.map((feature) => (
                        <span
                          key={feature}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-[#D2B48C]/6 text-[#8B7355] border border-[#D2B48C]/15 font-ui"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stats footer */}
                <div className="flex items-center justify-between pt-4 border-t border-[#E2E8F0]">
                  <span className="text-[10px] text-[#9CA3AF] font-mono">
                    {lang.articleCount} article
                    {lang.articleCount !== 1 ? 's' : ''}
                  </span>
                  <Link
                    href={`/search?q=${encodeURIComponent(lang.name)}+security`}
                    className="text-[10px] text-[#D2B48C] hover:underline font-ui font-semibold flex items-center gap-1"
                  >
                    View Resources <ArrowRight size={10} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

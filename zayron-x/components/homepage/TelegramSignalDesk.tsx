import type { Post } from '@/lib/d1/posts';
import Link from 'next/link';

export function TelegramSignalDesk({ posts }: { posts: Post[] }) {
  return (
    <section className="bg-[#0b0b0b] px-6 py-16 text-white lg:px-10 lg:py-20">
      <div className="mx-auto max-w-[1480px]">
        <div className="mb-10 flex flex-col justify-between gap-5 border-b border-white/15 pb-6 md:flex-row md:items-end">
          <div>
            <p className="mb-3 text-[10px] font-mono font-bold uppercase tracking-[0.24em] text-[#f36b21]">
              Telegram signal desk
            </p>
            <h2 className="font-serif text-4xl font-normal leading-none sm:text-5xl">
              Fresh signals, edited for action.
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-white/55">
            A focused stream of malware alerts, threat-actor notes, and analyst summaries from the
            connected Telegram feed.
          </p>
        </div>
        {posts.length ? (
          <div className="grid gap-px overflow-hidden border border-white/15 bg-white/15 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <article key={post.id} className="bg-[#0b0b0b] p-6 transition-colors hover:bg-[#151515]">
                <div className="mb-8 flex items-center justify-between gap-4 text-[10px] font-mono uppercase tracking-[0.16em] text-white/45">
                  <span className="text-[#f36b21]">{post.category}</span>
                  <time dateTime={post.published_at}>
                    {new Date(post.published_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </time>
                </div>
                <h3 className="text-xl font-semibold leading-tight">{post.title}</h3>
                <p className="mt-4 line-clamp-3 text-sm leading-6 text-white/60">{post.summary}</p>
                <p className="mt-8 text-[10px] font-mono uppercase tracking-[0.14em] text-white/35">
                  Source: {post.source}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-white/20 px-6 py-12 text-sm text-white/50">
            Telegram signals are ready to appear once the first posts are ingested.
          </div>
        )}
        <Link
          href="/news"
          className="mt-7 inline-flex text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-[#f36b21]"
        >
          View intelligence desk
        </Link>
      </div>
    </section>
  );
}

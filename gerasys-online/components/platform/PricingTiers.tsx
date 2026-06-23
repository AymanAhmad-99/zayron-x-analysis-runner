'use client';

import { ShieldCheck, Zap } from '@/lib/icons';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

export function PricingTiers() {
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processingTier, setProcessingTier] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUserData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setUser(user);
          const { data, error } = await supabase
            .from('profiles')
            .select('tier_id, stripe_subscription_status')
            .eq('id', user.id)
            .single();
          if (!error && data) {
            setProfile(data);
          }
        }
      } catch (err) {
        console.error('Error fetching user data for pricing:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchUserData();
  }, []);

  const handleCheckout = async (tierId: string) => {
    if (!user) {
      window.location.href = `/login?redirectTo=${encodeURIComponent(window.location.pathname)}`;
      return;
    }

    setProcessingTier(tierId);
    setError(null);

    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tierId }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to initiate checkout session.');
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Checkout session URL was not returned.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
      setProcessingTier(null);
    }
  };

  const isCurrentTier = (tierId: string) => {
    if (!profile) return false;
    return profile.tier_id === tierId && profile.stripe_subscription_status === 'active';
  };

  return (
    <section className="bg-[var(--color-section-royal)] text-white py-24 px-6 lg:px-10 font-sans">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-accent-intelligence)]/10 text-[var(--color-accent-intelligence)] font-mono text-[10px] font-bold tracking-widest uppercase mb-4 border border-[var(--color-accent-intelligence)]/20">
            <Zap className="w-3.5 h-3.5" />
            Executive CTI Plans
          </div>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-[-0.03em] mb-4 text-white">
            Pricing for teams using ZAYRON-X
          </h2>
          <p className="text-sm text-white/65 leading-relaxed max-w-lg mx-auto">
            Choose a plan for intelligence briefings, CVE tracking, analyst visibility, and calm
            executive workflows built around the product features available today.
          </p>
        </div>

        {error && (
          <div className="max-w-md mx-auto mb-8 p-4 bg-[#B42318]/10 border border-[#B42318]/20 rounded text-center text-xs font-mono text-[#FCA5A5]">
            ERROR: {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
          <div className="bg-[var(--color-section-royal-2)] border border-white/10 rounded-[1.25rem] p-8 flex flex-col justify-between transition-colors duration-300 hover:border-[var(--color-accent-intelligence)]/35 relative">
            {isCurrentTier('TACTICAL_OBSERVER') && (
              <span className="absolute top-4 right-4 bg-[var(--color-accent-intelligence)]/10 text-[var(--color-accent-intelligence)] border border-[var(--color-accent-intelligence)]/25 text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                Current Plan
              </span>
            )}
            <div>
              <span className="text-xs uppercase font-mono tracking-widest text-[var(--color-accent-intelligence)] font-extrabold block mb-2">
                Essential
              </span>
              <h3 className="text-xl font-semibold text-white mb-4">Essential</h3>
              <div className="mb-6 flex items-baseline font-mono">
                <span className="text-4xl font-extrabold text-white">$15</span>
                <span className="text-white/50 text-xs ml-2 uppercase">/ month</span>
              </div>
              <p className="text-xs text-white/65 leading-relaxed mb-8">
                A focused starting plan for teams following published intelligence and
                vulnerabilities inside the current ZAYRON-X platform.
              </p>

              <ul className="space-y-3.5 mb-8 text-xs">
                <li className="flex items-center gap-2.5 text-white/80">
                  <ShieldCheck className="w-4 h-4 text-[var(--color-accent-intelligence)] shrink-0" />
                  <span>Access to latest intelligence briefings</span>
                </li>
                <li className="flex items-center gap-2.5 text-white/80">
                  <ShieldCheck className="w-4 h-4 text-[var(--color-accent-intelligence)] shrink-0" />
                  <span>CVE tracker access</span>
                </li>
                <li className="flex items-center gap-2.5 text-white/80">
                  <ShieldCheck className="w-4 h-4 text-[var(--color-accent-intelligence)] shrink-0" />
                  <span>Category-based threat browsing</span>
                </li>
                <li className="flex items-center gap-2.5 text-white/80">
                  <ShieldCheck className="w-4 h-4 text-[var(--color-accent-intelligence)] shrink-0" />
                  <span>Basic search access</span>
                </li>
                <li className="flex items-center gap-2.5 text-white/80">
                  <ShieldCheck className="w-4 h-4 text-[var(--color-accent-intelligence)] shrink-0" />
                  <span>Briefing export preview</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleCheckout('TACTICAL_OBSERVER')}
              disabled={loading || processingTier !== null}
              className={`w-full py-3.5 font-mono font-bold text-xs uppercase tracking-wider transition-all rounded ${
                isCurrentTier('TACTICAL_OBSERVER')
                  ? 'bg-white/5 border border-white/10 text-white/45 cursor-not-allowed'
                  : 'bg-transparent text-[var(--color-accent-intelligence)] border border-[var(--color-accent-intelligence)] hover:bg-[var(--color-accent-intelligence)] hover:text-white cursor-pointer'
              }`}
            >
              {processingTier === 'TACTICAL_OBSERVER'
                ? 'Processing...'
                : isCurrentTier('TACTICAL_OBSERVER')
                  ? 'Current Plan'
                  : 'Choose Essential'}
            </button>
          </div>

          <div className="bg-white text-[var(--color-text)] border border-[var(--color-border)] rounded-[1.25rem] p-8 flex flex-col justify-between transition-colors duration-300 hover:border-[var(--color-accent-intelligence)]/50 relative shadow-[0_20px_60px_rgba(10,10,10,0.08)]">
            <span className="absolute top-4 right-4 bg-[var(--color-accent-intelligence)] text-white text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded">
              {isCurrentTier('SOVEREIGN_COMMAND') ? 'Current Plan' : 'Recommended'}
            </span>
            <div>
              <span className="text-xs uppercase font-mono tracking-widest text-[var(--color-accent-intelligence)] font-extrabold block mb-2">
                Professional
              </span>
              <h3 className="text-xl font-semibold text-[var(--color-text)] mb-4">Professional</h3>
              <div className="mb-6 flex items-baseline font-mono">
                <span className="text-4xl font-extrabold text-[var(--color-text)]">$25</span>
                <span className="text-[var(--color-text-muted)] text-xs ml-2 uppercase">
                  / month
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed mb-8">
                A broader workflow for teams that want deeper visibility across briefings,
                vulnerabilities, analysts, and platform endpoints.
              </p>

              <ul className="space-y-3.5 mb-8 text-xs">
                <li className="flex items-center gap-2.5 text-[var(--color-text)]">
                  <ShieldCheck className="w-4 h-4 text-[var(--color-accent-intelligence)] shrink-0" />
                  <span>Everything in Essential</span>
                </li>
                <li className="flex items-center gap-2.5 text-[var(--color-text)]">
                  <ShieldCheck className="w-4 h-4 text-[var(--color-accent-intelligence)] shrink-0" />
                  <span>Expanded briefing access</span>
                </li>
                <li className="flex items-center gap-2.5 text-[var(--color-text)]">
                  <ShieldCheck className="w-4 h-4 text-[var(--color-accent-intelligence)] shrink-0" />
                  <span>CVE-focused intelligence workflow</span>
                </li>
                <li className="flex items-center gap-2.5 text-[var(--color-text)]">
                  <ShieldCheck className="w-4 h-4 text-[var(--color-accent-intelligence)] shrink-0" />
                  <span>Analyst coverage views</span>
                </li>
                <li className="flex items-center gap-2.5 text-[var(--color-text)]">
                  <ShieldCheck className="w-4 h-4 text-[var(--color-accent-intelligence)] shrink-0" />
                  <span>API-ready article and CVE endpoints</span>
                </li>
                <li className="flex items-center gap-2.5 text-[var(--color-text)]">
                  <ShieldCheck className="w-4 h-4 text-[var(--color-accent-intelligence)] shrink-0" />
                  <span>Briefing export workflow</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleCheckout('SOVEREIGN_COMMAND')}
              disabled={loading || processingTier !== null}
              className={`w-full py-3.5 font-mono font-bold text-xs uppercase tracking-wider transition-all rounded ${
                isCurrentTier('SOVEREIGN_COMMAND')
                  ? 'bg-[var(--color-bg-soft)] border border-[var(--color-border)] text-[var(--color-text-muted)] cursor-not-allowed'
                  : 'bg-[var(--color-accent-intelligence)] text-white border border-[var(--color-accent-intelligence)] hover:bg-[var(--color-accent-intelligence-hover)] hover:border-[var(--color-accent-intelligence-hover)] cursor-pointer'
              }`}
            >
              {processingTier === 'SOVEREIGN_COMMAND'
                ? 'Processing...'
                : isCurrentTier('SOVEREIGN_COMMAND')
                  ? 'Current Plan'
                  : 'Choose Professional'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

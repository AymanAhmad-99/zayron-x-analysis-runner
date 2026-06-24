'use client';

import { ShieldCheck } from '@/lib/icons';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

export function PricingTiers() {
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processingTier, setProcessingTier] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'six_months'>('monthly');

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
  }, [supabase]);

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

  // Pricing values with 15% discount for 6-months toggled
  const getPrice = (base: number) => {
    if (billingPeriod === 'six_months') {
      return Math.round(base * 0.85 * 6);
    }
    return base;
  };

  return (
    <section
      id="pricing-tiers"
      className="bg-white text-[var(--color-text)] py-24 px-6 lg:px-10 font-sans border-b border-[var(--color-border)]"
    >
      <div className="max-w-[1200px] mx-auto">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-[var(--color-accent-intelligence)] block mb-3">
              Simple. Transparent. Powerful.
            </span>
            <h2 className="text-3xl md:text-5xl font-serif tracking-tight text-[var(--color-text)] font-normal">
              PRICING
            </h2>
          </div>

          {/* Toggle switcher */}
          <div className="flex items-center gap-4 bg-[var(--color-bg-soft)] p-1 rounded-full border border-[var(--color-border)] self-start md:self-auto">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-full transition-all cursor-pointer ${
                billingPeriod === 'monthly'
                  ? 'bg-[#050505] text-white'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              Monthly
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBillingPeriod('six_months')}
                className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-full transition-all cursor-pointer ${
                  billingPeriod === 'six_months'
                    ? 'bg-[#050505] text-white'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                6 Months
              </button>
              <span className="bg-[var(--color-accent-intelligence)] text-white text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0">
                Save 15%
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="max-w-md mx-auto mb-8 p-4 bg-[#B42318]/5 border border-[#B42318]/15 rounded text-center text-xs font-mono text-[#B42318]">
            ERROR: {error}
          </div>
        )}

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-5xl mx-auto">
          {/* Free Tier */}
          <div className="bg-white border border-[var(--color-border)] rounded-[1.25rem] p-8 flex flex-col justify-between hover:border-[var(--color-border-strong)] transition-all duration-300">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-widest text-[var(--color-text-muted)] font-bold block mb-2">
                FREE
              </span>
              <h3 className="text-xl font-serif text-[var(--color-text)] font-semibold mb-4">
                Tactical Feed
              </h3>
              <div className="mb-6 flex items-baseline">
                <span className="text-4xl font-bold font-serif text-[var(--color-text)]">$0</span>
                <span className="text-[var(--color-text-muted)] text-[10px] uppercase tracking-wider ml-2">
                  Forever
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed mb-8">
                Explore the public features of ZAYRON-X including general vulnerability logs and
                community briefs.
              </p>

              <ul className="space-y-4 mb-8 text-[11px]">
                <li className="flex items-center gap-2.5 text-[var(--color-text-muted)]">
                  <ShieldCheck className="w-4 h-4 text-[var(--color-accent-intelligence)] shrink-0" />
                  <span>Basic Threat Feed access</span>
                </li>
                <li className="flex items-center gap-2.5 text-[var(--color-text-muted)]">
                  <ShieldCheck className="w-4 h-4 text-[var(--color-accent-intelligence)] shrink-0" />
                  <span>Limited CVE Tracker index</span>
                </li>
                <li className="flex items-center gap-2.5 text-[var(--color-text-muted)]">
                  <ShieldCheck className="w-4 h-4 text-[var(--color-accent-intelligence)] shrink-0" />
                  <span>Public Threat Reports view</span>
                </li>
              </ul>
            </div>

            <a
              href="/register"
              className="w-full text-center py-3.5 font-bold text-[10px] uppercase tracking-widest border border-[var(--color-border-strong)] hover:border-[var(--color-text)] text-[var(--color-text)] rounded transition-all cursor-pointer bg-white"
            >
              Get Started
            </a>
          </div>

          {/* Pro Tier - Highlighted center card */}
          <div className="bg-[#050505] text-white border border-[#141414] rounded-[1.25rem] p-8 flex flex-col justify-between relative shadow-xl transform md:-translate-y-2 hover:border-[var(--color-accent-intelligence)]/40 transition-all duration-300">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--color-accent-intelligence)] text-white text-[8px] font-mono font-black uppercase tracking-[0.2em] px-4.5 py-1 rounded-full shadow-md">
              MOST POPULAR
            </span>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-mono tracking-widest text-[var(--color-accent-intelligence)] font-bold">
                  PRO
                </span>
                {isCurrentTier('SOVEREIGN_COMMAND') && (
                  <span className="text-[8px] font-mono bg-white/10 text-white border border-white/20 px-2 py-0.5 rounded">
                    Active
                  </span>
                )}
              </div>
              <h3 className="text-xl font-serif font-semibold text-white mb-4">Pro</h3>
              <div className="mb-6 flex items-baseline">
                <span className="text-4xl font-bold font-serif text-white">${getPrice(25)}</span>
                <span className="text-white/60 text-[10px] uppercase tracking-wider ml-2">
                  {billingPeriod === 'six_months' ? '/ 6 months' : '/ month'}
                </span>
              </div>
              <p className="text-xs text-white/70 leading-relaxed mb-8">
                Comprehensive operations workflow for professional response squads requiring deep
                tactical signals.
              </p>

              <ul className="space-y-4 mb-8 text-[11px]">
                <li className="flex items-center gap-2.5 text-white/90">
                  <ShieldCheck className="w-4 h-4 text-[var(--color-accent-intelligence)] shrink-0" />
                  <span>Published intelligence briefings</span>
                </li>
                <li className="flex items-center gap-2.5 text-white/90">
                  <ShieldCheck className="w-4 h-4 text-[var(--color-accent-intelligence)] shrink-0" />
                  <span>Advanced CVE monitoring & search</span>
                </li>
                <li className="flex items-center gap-2.5 text-white/90">
                  <ShieldCheck className="w-4 h-4 text-[var(--color-accent-intelligence)] shrink-0" />
                  <span>Executive reports & export tools</span>
                </li>
                <li className="flex items-center gap-2.5 text-white/90">
                  <ShieldCheck className="w-4 h-4 text-[var(--color-accent-intelligence)] shrink-0" />
                  <span>Category coverage and search</span>
                </li>
                <li className="flex items-center gap-2.5 text-white/90">
                  <ShieldCheck className="w-4 h-4 text-[var(--color-accent-intelligence)] shrink-0" />
                  <span>Latest loaded briefings and CVEs</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleCheckout('SOVEREIGN_COMMAND')}
              disabled={loading || processingTier !== null}
              className={`w-full py-3.5 font-bold text-[10px] uppercase tracking-widest transition-all rounded cursor-pointer ${
                isCurrentTier('SOVEREIGN_COMMAND')
                  ? 'bg-white/10 text-white/40 cursor-not-allowed border border-white/20'
                  : 'bg-[var(--color-accent-intelligence)] hover:bg-[var(--color-accent-intelligence-hover)] text-white border border-[var(--color-accent-intelligence)]'
              }`}
            >
              {processingTier === 'SOVEREIGN_COMMAND'
                ? 'Processing...'
                : isCurrentTier('SOVEREIGN_COMMAND')
                  ? 'Current Plan'
                  : 'Choose Pro'}
            </button>
          </div>

          {/* Tactical Tier (Tactical Observer) */}
          <div className="bg-white border border-[var(--color-border)] rounded-[1.25rem] p-8 flex flex-col justify-between hover:border-[var(--color-border-strong)] transition-all duration-300">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-mono tracking-widest text-[var(--color-accent-intelligence)] font-bold">
                  FOUNDER
                </span>
                {isCurrentTier('TACTICAL_OBSERVER') && (
                  <span className="text-[8px] font-mono bg-neutral-100 text-neutral-800 border border-neutral-200 px-2 py-0.5 rounded">
                    Active
                  </span>
                )}
              </div>
              <h3 className="text-xl font-serif text-[var(--color-text)] font-semibold mb-4">
                Founder
              </h3>
              <div className="mb-6 flex items-baseline">
                <span className="text-4xl font-bold font-serif text-[var(--color-text)]">
                  ${getPrice(15)}
                </span>
                <span className="text-[var(--color-text-muted)] text-[10px] uppercase tracking-wider ml-2">
                  {billingPeriod === 'six_months' ? '/ 6 months' : '/ month'}
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed mb-8">
                Essential visibility and vulnerability alerts for analysts monitoring threat
                vectors.
              </p>

              <ul className="space-y-4 mb-8 text-[11px]">
                <li className="flex items-center gap-2.5 text-[var(--color-text-muted)]">
                  <ShieldCheck className="w-4 h-4 text-[var(--color-accent-intelligence)] shrink-0" />
                  <span>Access to latest strategic briefings</span>
                </li>
                <li className="flex items-center gap-2.5 text-[var(--color-text-muted)]">
                  <ShieldCheck className="w-4 h-4 text-[var(--color-accent-intelligence)] shrink-0" />
                  <span>General CVE tracking suite</span>
                </li>
                <li className="flex items-center gap-2.5 text-[var(--color-text-muted)]">
                  <ShieldCheck className="w-4 h-4 text-[var(--color-accent-intelligence)] shrink-0" />
                  <span>Category-based threat search</span>
                </li>
                <li className="flex items-center gap-2.5 text-[var(--color-text-muted)]">
                  <ShieldCheck className="w-4 h-4 text-[var(--color-accent-intelligence)] shrink-0" />
                  <span>Threat briefing export previews</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleCheckout('TACTICAL_OBSERVER')}
              disabled={loading || processingTier !== null}
              className={`w-full py-3.5 font-bold text-[10px] uppercase tracking-widest transition-all rounded cursor-pointer ${
                isCurrentTier('TACTICAL_OBSERVER')
                  ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed border border-neutral-200'
                  : 'bg-white text-[var(--color-text)] border border-[var(--color-border-strong)] hover:border-[var(--color-text)]'
              }`}
            >
              {processingTier === 'TACTICAL_OBSERVER'
                ? 'Processing...'
                : isCurrentTier('TACTICAL_OBSERVER')
                  ? 'Current Plan'
                  : 'Choose Tactical'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

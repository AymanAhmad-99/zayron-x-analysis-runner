'use client';

import { Shield, ShieldCheck, Zap } from '@/lib/icons';
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
    <section className="bg-slate-950/60 backdrop-blur-xl border-t border-white/5 text-slate-100 py-24 px-6 lg:px-10 relative overflow-hidden font-sans">
      <div className="max-w-[1200px] mx-auto relative z-10">
        {/* Header Block */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#733DD9]/10 text-[#733DD9] font-mono text-[10px] font-bold tracking-widest uppercase mb-4 border border-[#733DD9]/20">
            <Zap className="w-3.5 h-3.5" />
            COMMERCIAL COMMAND INTELLIGENCE
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 uppercase font-mono">
            SaaS Commercial Tier Deployment
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed font-sans max-w-lg mx-auto">
            Upgrade your security node clearance levels. Unlock advanced AI remediation payloads,
            SIEM telemetry integration, and official Executive SITREPs.
          </p>
        </div>

        {error && (
          <div className="max-w-md mx-auto mb-8 p-4 bg-red-950/40 border border-red-500/20 rounded text-center text-xs font-mono text-red-400">
            🚨 ERROR: {error}
          </div>
        )}

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
          {/* Tactical Observer Tier */}
          <div className="bg-slate-950/60 backdrop-blur-xl border border-white/5 rounded-lg p-8 flex flex-col justify-between hover:border-[#733DD9]/40 transition-all duration-300 relative">
            {isCurrentTier('TACTICAL_OBSERVER') && (
              <span className="absolute top-4 right-4 bg-[#733DD9]/20 text-[#733DD9] border border-[#733DD9]/30 text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                Active Tier
              </span>
            )}
            <div>
              <span className="text-xs uppercase font-mono tracking-widest text-[#733DD9] font-extrabold block mb-2">
                Clearance Level I
              </span>
              <h3 className="text-xl font-bold text-slate-100 uppercase font-mono mb-4">
                Tactical Observer
              </h3>
              <div className="mb-6 flex items-baseline font-mono">
                <span className="text-4xl font-extrabold text-slate-100">$15</span>
                <span className="text-slate-400 text-xs ml-2 uppercase">/ month</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-8">
                Basic threat perimeter monitoring, low-latency intelligence alerts, and essential
                scanning.
              </p>

              {/* Features List */}
              <ul className="space-y-3.5 mb-8 text-xs">
                <li className="flex items-center gap-2.5 text-slate-300">
                  <ShieldCheck className="w-4 h-4 text-[#733DD9] shrink-0" />
                  <span>Real-time Threat Alerts & Notifications</span>
                </li>
                <li className="flex items-center gap-2.5 text-slate-300">
                  <ShieldCheck className="w-4 h-4 text-[#733DD9] shrink-0" />
                  <span>Limited API Queries (100 per day)</span>
                </li>
                <li className="flex items-center gap-2.5 text-slate-300">
                  <ShieldCheck className="w-4 h-4 text-[#733DD9] shrink-0" />
                  <span>Basic Executive SITREP Overview</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleCheckout('TACTICAL_OBSERVER')}
              disabled={loading || processingTier !== null}
              className={`w-full py-3.5 font-mono font-bold text-xs uppercase tracking-wider transition-all rounded ${
                isCurrentTier('TACTICAL_OBSERVER')
                  ? 'bg-slate-900 border border-white/10 text-slate-400 cursor-not-allowed'
                  : 'bg-transparent text-[#733DD9] border border-[#733DD9] hover:bg-[#733DD9] hover:text-white cursor-pointer'
              }`}
            >
              {processingTier === 'TACTICAL_OBSERVER'
                ? 'Deploying...'
                : isCurrentTier('TACTICAL_OBSERVER')
                  ? 'Active Node'
                  : 'Initialize Observer'}
            </button>
          </div>

          {/* Sovereign Command Tier */}
          <div className="bg-slate-950/60 backdrop-blur-xl border border-[#733DD9]/30 rounded-lg p-8 flex flex-col justify-between hover:border-[#733DD9]/60 transition-all duration-300 relative shadow-[0_0_30px_rgba(115,61,217,0.1)]">
            <span className="absolute top-4 right-4 bg-[#733DD9] text-white text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded">
              {isCurrentTier('SOVEREIGN_COMMAND') ? 'Active Tier' : 'Recommended'}
            </span>
            <div>
              <span className="text-xs uppercase font-mono tracking-widest text-[#733DD9] font-extrabold block mb-2">
                Clearance Level II
              </span>
              <h3 className="text-xl font-bold text-slate-100 uppercase font-mono mb-4">
                Sovereign Command
              </h3>
              <div className="mb-6 flex items-baseline font-mono">
                <span className="text-4xl font-extrabold text-slate-100">$25</span>
                <span className="text-slate-400 text-xs ml-2 uppercase">/ month</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-8">
                Comprehensive security orchestration. Full-scale automation, dark web sweeps, and
                SIEM pipeline integrations.
              </p>

              {/* Features List */}
              <ul className="space-y-3.5 mb-8 text-xs">
                <li className="flex items-center gap-2.5 text-slate-300">
                  <ShieldCheck className="w-4 h-4 text-[#733DD9] shrink-0" />
                  <span>Everything in Tactical Observer</span>
                </li>
                <li className="flex items-center gap-2.5 text-slate-300">
                  <ShieldCheck className="w-4 h-4 text-[#733DD9] shrink-0" />
                  <span>Full SITREP Generation (PDF/HTML)</span>
                </li>
                <li className="flex items-center gap-2.5 text-slate-300">
                  <ShieldCheck className="w-4 h-4 text-[#733DD9] shrink-0" />
                  <span>Sovereign Dark Web Monitoring</span>
                </li>
                <li className="flex items-center gap-2.5 text-slate-300">
                  <ShieldCheck className="w-4 h-4 text-[#733DD9] shrink-0" />
                  <span>SIEM / Splunk / Sentinel Integration</span>
                </li>
                <li className="flex items-center gap-2.5 text-slate-300">
                  <ShieldCheck className="w-4 h-4 text-[#733DD9] shrink-0" />
                  <span>Interactive Threat Timeline mapping</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleCheckout('SOVEREIGN_COMMAND')}
              disabled={loading || processingTier !== null}
              className={`w-full py-3.5 font-mono font-bold text-xs uppercase tracking-wider transition-all rounded ${
                isCurrentTier('SOVEREIGN_COMMAND')
                  ? 'bg-slate-900 border border-white/10 text-slate-400 cursor-not-allowed'
                  : 'bg-[#733DD9] text-white border border-[#733DD9] hover:bg-[#5b21b6] hover:border-[#5b21b6] cursor-pointer'
              }`}
            >
              {processingTier === 'SOVEREIGN_COMMAND'
                ? 'Deploying...'
                : isCurrentTier('SOVEREIGN_COMMAND')
                  ? 'Active Node'
                  : 'Initialize Command'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

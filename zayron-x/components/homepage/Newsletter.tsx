'use client';

import { Button } from '@/components/ui/Button';
import { type FormEvent, useState } from 'react';

export function Newsletter() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus('loading');
    try {
      const csrfToken =
        typeof document !== 'undefined'
          ? document.cookie.match(/(?:^|; )csrf-token=([^;]*)/)?.[1]
          : null;

      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('success');
        setMessage('Subscribed successfully. Intelligence briefings incoming.');
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.error ?? 'Subscription failed.');
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  }

  return (
    <section className="bg-white border-y border-[#E2E8F0] py-20" id="newsletter">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="section-label">Stay Ahead</p>
            <h2 className="font-display text-3xl font-bold text-[#0F172A] mt-2 leading-tight">
              Intelligence Briefings,
              <br />
              <span className="text-[#D2B48C]">Direct to Inbox</span>
            </h2>
            <p className="text-[#475569] mt-3 font-body max-w-md leading-relaxed">
              Get the latest threat intelligence, CVE alerts, and APT analysis delivered every
              morning. No noise. Just actionable intelligence.
            </p>
          </div>
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-8">
            {status === 'success' ? (
              <p className="text-[#D2B48C] font-semibold text-center font-ui">{message}</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  className="w-full px-4 py-3 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D2B48C] focus:border-transparent transition-all font-ui text-[#0F172A] placeholder:text-[#94A3B8]"
                />
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  disabled={status === 'loading'}
                >
                  {status === 'loading' ? 'Subscribing...' : 'Subscribe Free'}
                </Button>
                {status === 'error' && (
                  <p className="text-red-500 text-xs text-center font-ui">{message}</p>
                )}
                <p className="text-[11px] text-[#94A3B8] text-center font-ui">
                  No spam. Unsubscribe anytime. TLP:WHITE distribution.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

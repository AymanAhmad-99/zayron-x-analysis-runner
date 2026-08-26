'use client';

import { ArrowRight, Lock, Mail, Shield } from '@/lib/icons';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { z } from 'zod';

// Zod Schema for Login Validation
const loginSchema = z.object({
  email: z.string().email('Invalid clearance email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginInput = z.infer<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams?.get('redirect') ?? '/admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    // Schema Validation
    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      setError(validation.error.issues[0]?.message || 'Validation failed');
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push(redirect);
    router.refresh();
  };

  const handleResendConfirmation = async () => {
    if (!email) return;
    setError(null);
    setMessage(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resend({ type: 'signup', email });

    if (error) {
      setError(error.message);
    } else {
      setMessage('Confirmation email resent. Check your inbox.');
    }
    setLoading(false);
  };

  return (
    <div className="w-full max-w-md">
      {/* Intel classification header */}
      <div className="mb-10 text-center">
        <p className="text-[10px] uppercase tracking-[0.25em] text-neutral-400 font-mono mb-4">
          CLASSIFIED · TLP:AMBER
        </p>
        <h1 className="font-sans text-3xl font-black select-none leading-none">
          <span
            className="inline-flex items-center tracking-tighter"
            style={{ letterSpacing: '-0.08em' }}
          >
            <span className="text-[#050505]">ZAYRON</span>
            <span className="text-[#733DD9]">-X</span>
          </span>
        </h1>
        <p className="text-neutral-500 text-sm mt-2 font-medium">Analyst Authentication Portal</p>
      </div>

      {/* Card */}
      <div className="bg-white border border-neutral-200 rounded-lg p-10 text-neutral-800">
        <form onSubmit={handleLogin} className="space-y-8">
          <div>
            <label className="block text-xs font-bold text-neutral-900 uppercase tracking-[0.12em] mb-3 font-sans">
              Clearance Email
            </label>
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="analyst@agency.gov"
                className="w-full pl-10 pr-4 py-3.5 bg-white border border-neutral-200 rounded text-neutral-900 placeholder:text-neutral-400 font-sans text-sm focus:outline-none focus:ring-2 focus:ring-[#733DD9] focus:ring-offset-2 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-900 uppercase tracking-[0.12em] mb-3 font-sans">
              Password
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-3.5 bg-white border border-neutral-200 rounded text-neutral-900 placeholder:text-neutral-400 font-sans text-sm focus:outline-none focus:ring-2 focus:ring-[#733DD9] focus:ring-offset-2 transition-all"
              />
            </div>
          </div>

          {error && (
            <div className="text-[#DC2626] text-xs font-sans bg-[#DC2626]/[0.03] border border-[#DC2626]/10 rounded p-3">
              <p>{error}</p>
              {error.includes('not confirmed') && (
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  className="block mt-1 text-[#733DD9] hover:underline font-bold"
                >
                  Resend confirmation email
                </button>
              )}
            </div>
          )}

          {message && (
            <div className="text-[#16A34A] text-xs font-sans bg-[#16A34A]/[0.03] border border-[#16A34A]/10 rounded p-3">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#050505] text-white font-bold text-xs uppercase tracking-wider rounded hover:bg-[#733DD9] transition-all disabled:opacity-50 font-sans flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              'Authenticating...'
            ) : (
              <>
                <Shield size={16} />
                Authenticate
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-neutral-100">
          <p className="text-center text-xs text-neutral-500 font-sans">
            Need platform access?{' '}
            <Link
              href="/register"
              className="text-[#733DD9] hover:underline font-bold inline-flex items-center gap-1"
            >
              Request Credentials <ArrowRight size={11} />
            </Link>
          </p>
        </div>
      </div>

      <p className="text-center text-[10px] text-neutral-400 mt-8 font-mono">
        Palo Alto, CA · Nation-State Grade Intelligence Platform
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="text-[#94A3B8] text-sm font-ui text-center">Loading secure terminal...</div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

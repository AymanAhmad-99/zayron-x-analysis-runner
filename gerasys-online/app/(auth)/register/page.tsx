"use client";

import { useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Mail, Lock, User, ArrowRight, Shield } from "@/lib/icons";

// Zod Schema Enforcing Password Complexity & Non-Empty Full Name
const registerSchema = z.object({
  fullName: z.string().min(1, "Full Name is required"),
  email: z.string().email("Invalid clearance email address"),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/,
      "Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (@$!%*?&)"
    ),
});

type RegisterInput = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Schema Validation
    const validation = registerSchema.safeParse({
      fullName,
      email,
      password,
    });

    if (!validation.success) {
      setError(validation.error.issues[0]?.message || "Validation failed");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <h1 className="font-sans text-3xl font-black select-none leading-none">
            <span className="inline-flex items-center tracking-tighter" style={{ letterSpacing: "-0.08em" }}>
              <span className="text-[#050505]">ZAYRON</span>
              <span className="text-[#733DD9]">-X</span>
            </span>
          </h1>
        </div>

        <div className="bg-white border border-neutral-200 rounded-lg p-10 text-center text-neutral-800">
          <div className="w-12 h-12 rounded-full bg-[#733DD9]/10 border border-[#733DD9]/20 flex items-center justify-center mx-auto mb-6">
            <Shield size={20} className="text-[#733DD9]" />
          </div>
          <h2 className="font-sans text-xl font-bold text-[#050505] mb-3">
            Credentials Requested
          </h2>
          <p className="text-neutral-500 text-sm font-sans mb-8 leading-relaxed">
            A verification link has been dispatched to{" "}
            <span className="text-[#733DD9] font-bold">{email}</span>. Access
            is granted upon confirmation.
          </p>
          <Link
            href="/login"
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#050505] text-white font-bold text-xs uppercase tracking-wider rounded hover:bg-[#733DD9] transition-all font-sans shadow-sm"
          >
            Proceed to Authentication <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      {/* Header */}
      <div className="mb-10 text-center">
        <p className="text-[10px] uppercase tracking-[0.25em] text-neutral-400 font-mono mb-4">
          RESTRICTED · CREDENTIAL REQUEST
        </p>
        <h1 className="font-sans text-3xl font-black select-none leading-none">
          <span className="inline-flex items-center tracking-tighter" style={{ letterSpacing: "-0.08em" }}>
            <span className="text-[#050505]">ZAYRON</span>
            <span className="text-[#733DD9]">-X</span>
          </span>
        </h1>
        <p className="text-neutral-500 text-sm mt-2 font-medium">
          Request Platform Credentials
        </p>
      </div>

      {/* Card */}
      <div className="bg-white border border-neutral-200 rounded-lg p-10 text-neutral-800">
        <form onSubmit={handleRegister} className="space-y-8">
          <div>
            <label className="block text-xs font-bold text-neutral-900 uppercase tracking-[0.12em] mb-3 font-sans">
              Full Name
            </label>
            <div className="relative">
              <User
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
              />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="e.g. John Doe"
                className="w-full pl-10 pr-4 py-3.5 bg-white border border-neutral-200 rounded text-neutral-900 placeholder:text-neutral-400 font-sans text-sm focus:outline-none focus:ring-2 focus:ring-[#733DD9] focus:ring-offset-2 transition-all"
              />
            </div>
          </div>

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
            <p className="text-[10px] text-neutral-400 mt-2 font-mono leading-normal">
              Must be at least 12 characters, including 1 uppercase, 1 lowercase, 1 number, and 1 symbol.
            </p>
          </div>

          {error && (
            <div className="text-[#DC2626] text-xs font-sans bg-[#DC2626]/[0.03] border border-[#DC2626]/10 rounded p-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#050505] text-white font-bold text-xs uppercase tracking-wider rounded hover:bg-[#733DD9] transition-all disabled:opacity-50 font-sans flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              "Processing..."
            ) : (
              <>
                <Shield size={16} />
                Request Access
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-neutral-100">
          <p className="text-center text-xs text-neutral-500 font-sans">
            Already hold credentials?{" "}
            <Link
              href="/login"
              className="text-[#733DD9] hover:underline font-bold inline-flex items-center gap-1"
            >
              Authenticate <ArrowRight size={11} />
            </Link>
          </p>
        </div>
      </div>

      <p className="text-center text-[10px] text-neutral-400 mt-8 font-mono">
        Palo Alto, CA · All access requests are vetted
      </p>
    </div>
  );
}

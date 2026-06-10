"use client";

import React, { useState } from "react";
import { useSecurityGating } from "@/components/platform/SecurityGatingContext";
import { Shield, Lock, X } from "@/lib/icons";
import { motion, AnimatePresence } from "framer-motion";

interface SovereignGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SovereignGateModal({ isOpen, onClose, onSuccess }: SovereignGateModalProps) {
  const { gateAction } = useSecurityGating();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate inputs
    const newErrors: Record<string, string> = {};
    if (fullName.length < 2) {
      newErrors.fullName = "Operator identity parameter missing (Full Name required).";
    }
    if (!email.includes("@") || !email.includes(".")) {
      newErrors.email = "Invalid corporate routing destination endpoint.";
    }
    if (password.length < 12) {
      newErrors.password = "Cryptographic integrity compromised. Minimum 12 characters required.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsAuthenticating(true);

    // Simulate elite subscription authorization synchronization
    setTimeout(() => {
      setIsAuthenticating(false);
      localStorage.setItem("zx_auth_clearance", "true");
      onSuccess?.();
      onClose();
      window.location.reload(); // Refresh the page to synchronize SSR contents securely
    }, 1500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="bg-white max-w-md w-full p-8 border border-neutral-200 shadow-2xl rounded-none relative font-sans text-[#050505]"
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 font-mono text-sm uppercase tracking-wide cursor-pointer flex items-center gap-1"
            >
              <X size={14} /> [esc]
            </button>

            {/* Header */}
            <div className="mb-6">
              <span className="text-[10px] font-mono tracking-widest text-[#733DD9] font-bold uppercase block mb-1">
                [ ACCESS INTERCEPTED · TLP:RED ]
              </span>
              <h3 className="text-lg font-black tracking-tight uppercase flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#733DD9]" />
                SOVEREIGN CLEARANCE GATING
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed mt-2">
                Automated patch execution, advanced cryptographical blueprints, and official incident SITREPs require an authorized operator synchronization. Synchronize credentials below.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Lead Incident Operator"
                  className="w-full bg-[#FAFAFA] border border-neutral-200 px-3.5 py-2.5 text-xs text-[#050505] rounded-none focus:outline-none focus:border-[#733DD9] transition-colors"
                />
                {errors.fullName && (
                  <p className="text-[10px] font-mono text-red-600 mt-1">{errors.fullName}</p>
                )}
              </div>

              {/* Clearance Email */}
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                  Clearance Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@corporation.com"
                  className="w-full bg-[#FAFAFA] border border-neutral-200 px-3.5 py-2.5 text-xs text-[#050505] rounded-none focus:outline-none focus:border-[#733DD9] transition-colors"
                />
                {errors.email && (
                  <p className="text-[10px] font-mono text-red-600 mt-1">{errors.email}</p>
                )}
              </div>

              {/* Clearance Password */}
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                  Clearance Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#FAFAFA] border border-neutral-200 px-3.5 py-2.5 text-xs text-[#050505] rounded-none focus:outline-none focus:border-[#733DD9] transition-colors"
                />
                {errors.password && (
                  <p className="text-[10px] font-mono text-red-600 mt-1">{errors.password}</p>
                )}
              </div>

              {/* CTA Button */}
              <button
                type="submit"
                disabled={isAuthenticating}
                className="bg-[#050505] text-white w-full py-3.5 mt-2 font-mono font-bold text-xs uppercase tracking-wider hover:bg-[#733DD9] transition-colors rounded-none cursor-pointer flex items-center justify-center gap-2"
              >
                {isAuthenticating ? (
                  "SYNCHRONIZING..."
                ) : (
                  <>
                    <Lock size={12} />
                    AUTHENTICATE & SECURE ACCESS ($25/MO)
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

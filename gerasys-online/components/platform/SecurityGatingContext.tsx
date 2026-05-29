"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { z } from "zod";

// Exact Zod gating schema from Block 4.3
const authGatingSchema = z.object({
  fullName: z.string().min(2, "Institutional parameter identity missing (Full Name required)."),
  clearanceEmail: z.string().email("Invalid corporate endpoint routing destination."),
  password: z
    .string()
    .min(12, "Security threshold violated. Minimum 12 cryptographic characters required.")
    .regex(/[A-Z]/, "Missing uppercase character validation vector.")
    .regex(/[a-z]/, "Missing lowercase character validation vector.")
    .regex(/[0-9]/, "Missing numerical sequence validation vector.")
    .regex(/[@$!%*?&]/, "Missing non-alphanumeric special identity token.")
});

type AuthFields = z.infer<typeof authGatingSchema>;

interface SecurityGatingContextType {
  isAuthenticated: boolean;
  gateAction: (onSuccess: () => void) => void;
}

const SecurityGatingContext = createContext<SecurityGatingContextType | undefined>(undefined);

export function SecurityGatingProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Form states
  const [fullName, setFullName] = useState("");
  const [clearanceEmail, setClearanceEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Partial<Record<keyof AuthFields, string>>>({});

  // Sync state with localStorage if in browser
  useEffect(() => {
    const cached = localStorage.getItem("zx_auth_clearance");
    if (cached === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const gateAction = (onSuccess: () => void) => {
    if (isAuthenticated) {
      onSuccess();
    } else {
      setPendingAction(() => onSuccess);
      setIsOpen(true);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setErrors({});
    setPendingAction(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = authGatingSchema.safeParse({
      fullName,
      clearanceEmail,
      password,
    });

    if (!result.success) {
      const fieldErrors: Partial<Record<keyof AuthFields, string>> = {};
      result.error.issues.forEach((err) => {
        const path = err.path[0] as keyof AuthFields;
        if (path && !fieldErrors[path]) {
          fieldErrors[path] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    // Success
    setIsAuthenticated(true);
    localStorage.setItem("zx_auth_clearance", "true");
    setIsOpen(false);
    
    // Clear form
    setFullName("");
    setClearanceEmail("");
    setPassword("");
    setErrors({});

    // Trigger restricted action
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  return (
    <SecurityGatingContext.Provider value={{ isAuthenticated, gateAction }}>
      {children}

      {/* Elegant Centered Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-none p-4">
          <div className="bg-white max-w-md w-full p-8 border border-neutral-200 shadow-2xl rounded-none relative font-sans text-[#050505]">
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 font-mono text-sm uppercase tracking-wide cursor-pointer"
            >
              [esc]
            </button>

            {/* Header */}
            <div className="mb-6">
              <span className="text-[10px] font-mono tracking-widest text-[#733DD9] font-bold uppercase block mb-1">
                [ SECURITY ACCESS INTERCEPTED ]
              </span>
              <h3 className="text-lg font-black tracking-tight uppercase">
                SECURITY ACCESS RESTRICTED
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed mt-2">
                Advanced remediation payload compilation, automated script mitigation, and official Executive SITREPs require an accredited corporate operator profile clearance. Enforce tier synchronization via institutional access.
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
                  placeholder="e.g. CISO Operational Node"
                  className="w-full bg-neutral-50/50 border border-neutral-200 px-3.5 py-2.5 text-xs text-[#050505] rounded-none focus:outline-none focus:border-[#733DD9] transition-colors"
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
                  type="text"
                  value={clearanceEmail}
                  onChange={(e) => setClearanceEmail(e.target.value)}
                  placeholder="name@corporation.com"
                  className="w-full bg-neutral-50/50 border border-neutral-200 px-3.5 py-2.5 text-xs text-[#050505] rounded-none focus:outline-none focus:border-[#733DD9] transition-colors"
                />
                {errors.clearanceEmail && (
                  <p className="text-[10px] font-mono text-red-600 mt-1">{errors.clearanceEmail}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                  Clearance Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-neutral-50/50 border border-neutral-200 px-3.5 py-2.5 text-xs text-[#050505] rounded-none focus:outline-none focus:border-[#733DD9] transition-colors"
                />
                {errors.password && (
                  <p className="text-[10px] font-mono text-red-600 mt-1">{errors.password}</p>
                )}
              </div>

              {/* CTA Button */}
              <button
                type="submit"
                className="bg-[#050505] text-white w-full py-3.5 mt-2 font-mono font-bold text-xs uppercase tracking-wider hover:bg-[#733DD9] transition-colors rounded-none cursor-pointer"
              >
                AUTHENTICATE & SECURE ACCESS ($15/MO)
              </button>
            </form>
          </div>
        </div>
      )}
    </SecurityGatingContext.Provider>
  );
}

export function useSecurityGating() {
  const context = useContext(SecurityGatingContext);
  if (context === undefined) {
    throw new Error("useSecurityGating must be used within a SecurityGatingProvider");
  }
  return context;
}

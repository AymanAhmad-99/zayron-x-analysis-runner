"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { z } from "zod";

const authGatingSchema = z.object({
  fullName: z.string().min(2, "Full Name required."),
  clearanceEmail: z.string().email("Invalid email address."),
  password: z
    .string()
    .min(12, "Minimum 12 characters required.")
    .regex(/[A-Z]/, "Missing uppercase letter.")
    .regex(/[a-z]/, "Missing lowercase letter.")
    .regex(/[0-9]/, "Missing number.")
    .regex(/[@$!%*?&]/, "Missing special character."),
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

  const [fullName, setFullName] = useState("");
  const [clearanceEmail, setClearanceEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Partial<Record<keyof AuthFields, string>>>({});

  const modalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const previousActiveElement = useRef<Element | null>(null);

  useEffect(() => {
    const cached = localStorage.getItem("zx_auth_clearance");
    if (cached === "true") setIsAuthenticated(true);
  }, []);

  const gateAction = (onSuccess: () => void) => {
    if (isAuthenticated) {
      onSuccess();
    } else {
      setPendingAction(() => onSuccess);
      setIsOpen(true);
    }
  };

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setErrors({});
    setPendingAction(null);
    // Return focus to trigger element
    if (previousActiveElement.current && previousActiveElement.current instanceof HTMLElement) {
      previousActiveElement.current.focus();
    }
  }, []);

  // Focus trap inside modal
  useEffect(() => {
    if (!isOpen) return;

    // Save current focus
    previousActiveElement.current = document.activeElement;

    // Focus first input in modal
    const timer = setTimeout(() => {
      const firstInput = modalRef.current?.querySelector("input");
      firstInput?.focus();
    }, 100);

    function handleTab(e: KeyboardEvent) {
      if (!modalRef.current) return;
      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'input, button, [tabindex]:not([tabindex="-1"])'
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.key === "Escape") {
        handleClose();
        return;
      }

      if (e.key !== "Tab") return;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }

    // Lock body scroll
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleTab);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleTab);
    };
  }, [isOpen, handleClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = authGatingSchema.safeParse({ fullName, clearanceEmail, password });
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof AuthFields, string>> = {};
      result.error.issues.forEach((err) => {
        const path = err.path[0] as keyof AuthFields;
        if (path && !fieldErrors[path]) fieldErrors[path] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsAuthenticated(true);
    localStorage.setItem("zx_auth_clearance", "true");
    setIsOpen(false);
    setFullName("");
    setClearanceEmail("");
    setPassword("");
    setErrors({});

    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  return (
    <SecurityGatingContext.Provider value={{ isAuthenticated, gateAction }}>
      {children}

      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-none p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="security-modal-title"
          aria-describedby="security-modal-desc"
        >
          <div
            ref={modalRef}
            className="bg-white dark:bg-slate-950 max-w-md w-full p-8 border border-neutral-200 dark:border-slate-800 shadow-2xl rounded-none relative font-sans text-[#050505] dark:text-slate-100"
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-neutral-400 dark:text-slate-500 hover:text-neutral-600 dark:hover:text-slate-300 font-mono text-sm uppercase tracking-wide cursor-pointer"
              aria-label="Close dialog"
            >
              [esc]
            </button>

            {/* Header */}
            <div className="mb-6">
              <span className="text-[10px] font-mono tracking-widest text-[#733DD9] font-bold uppercase block mb-1">
                [ SECURITY ACCESS INTERCEPTED ]
              </span>
              <h3 id="security-modal-title" className="text-lg font-black tracking-tight uppercase">
                SECURITY ACCESS RESTRICTED
              </h3>
              <p id="security-modal-desc" className="text-xs text-neutral-500 dark:text-slate-400 leading-relaxed mt-2">
                Advanced remediation payload compilation, automated script mitigation, and official Executive SITREPs require an accredited corporate operator profile clearance.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500 dark:text-slate-400 mb-1.5" htmlFor="modal-fullname">
                  Full Name
                </label>
                <input
                  id="modal-fullname"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. CISO Operational Node"
                  className="w-full bg-neutral-50/50 dark:bg-slate-900 border border-neutral-200 dark:border-slate-700 px-3.5 py-2.5 text-xs rounded-none focus:outline-none focus:border-[#733DD9] dark:focus:border-[#733DD9] transition-colors dark:text-slate-100"
                />
                {errors.fullName && <p className="text-[10px] font-mono text-red-600 dark:text-red-400 mt-1" role="alert">{errors.fullName}</p>}
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500 dark:text-slate-400 mb-1.5" htmlFor="modal-email">
                  Clearance Email
                </label>
                <input
                  id="modal-email"
                  type="email"
                  value={clearanceEmail}
                  onChange={(e) => setClearanceEmail(e.target.value)}
                  placeholder="name@corporation.com"
                  className="w-full bg-neutral-50/50 dark:bg-slate-900 border border-neutral-200 dark:border-slate-700 px-3.5 py-2.5 text-xs rounded-none focus:outline-none focus:border-[#733DD9] dark:focus:border-[#733DD9] transition-colors dark:text-slate-100"
                />
                {errors.clearanceEmail && <p className="text-[10px] font-mono text-red-600 dark:text-red-400 mt-1" role="alert">{errors.clearanceEmail}</p>}
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500 dark:text-slate-400 mb-1.5" htmlFor="modal-password">
                  Clearance Password
                </label>
                <input
                  id="modal-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-neutral-50/50 dark:bg-slate-900 border border-neutral-200 dark:border-slate-700 px-3.5 py-2.5 text-xs rounded-none focus:outline-none focus:border-[#733DD9] dark:focus:border-[#733DD9] transition-colors dark:text-slate-100"
                />
                {errors.password && <p className="text-[10px] font-mono text-red-600 dark:text-red-400 mt-1" role="alert">{errors.password}</p>}
              </div>

              <button
                type="submit"
                className="bg-[#050505] dark:bg-white dark:text-[#050505] text-white w-full py-3.5 mt-2 font-mono font-bold text-xs uppercase tracking-wider hover:bg-[#733DD9] dark:hover:bg-[#733DD9] dark:hover:text-white transition-colors rounded-none cursor-pointer"
              >
                AUTHENTICATE & SECURE ACCESS
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

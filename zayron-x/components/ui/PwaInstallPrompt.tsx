'use client';

import { useEffect, useState } from 'react';

interface PwaInstallPromptProps {
  className?: string;
}

export function PwaInstallPrompt({ className = '' }: PwaInstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Don't show if already installed or dismissed
      const dismissed = localStorage.getItem('zx_pwa_dismissed');
      if (!dismissed || Date.now() - Number.parseInt(dismissed) > 7 * 24 * 60 * 60 * 1000) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowPrompt(false);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!showPrompt) return null;

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  }

  function handleDismiss() {
    setShowPrompt(false);
    localStorage.setItem('zx_pwa_dismissed', Date.now().toString());
  }

  return (
    <div
      className={`fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-40
                  bg-white dark:bg-black border border-slate-200 dark:border-slate-800
                  rounded-xl shadow-xl p-4 animate-fade-up ${className}`}
      role="dialog"
      aria-label="Install app"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#733DD9] flex items-center justify-center shrink-0">
          <span className="text-white font-black text-sm">ZX</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Install ZAYRON-X</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Add to home screen for offline access
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={handleInstall}
              className="px-3 py-1.5 text-xs font-semibold bg-[#733DD9] text-white rounded-md
                         hover:bg-[#5B2FB0] transition-colors"
            >
              Install
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400
                         hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

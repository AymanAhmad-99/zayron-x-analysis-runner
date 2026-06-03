"use client";

import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center">
      <main id="main-content" className="text-center px-6 py-16 max-w-md">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-[#733DD9]/10 dark:bg-[#733DD9]/20 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-[#733DD9]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18.364 5.636a9 9 0 0 1 0 12.728m-2.829-2.829a5 5 0 0 0 0-7.07m-7.07 7.07a5 5 0 0 1 0-7.07m-2.829 2.829a9 9 0 0 0 0 12.728"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-black text-[#050505] dark:text-white mb-3">
          You&apos;re Offline
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6">
          ZAYRON-X requires an internet connection for real-time threat intelligence.
          Previously visited pages may still be available from your browser&apos;s cache.
        </p>
        <div className="space-y-3">
          <Link
            href="/"
            className="block px-6 py-3 bg-[#733DD9] text-white text-sm font-semibold rounded-lg
                       hover:bg-[#5B2FB0] transition-colors"
          >
            Try Homepage
          </Link>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="block w-full px-6 py-3 border border-slate-200 dark:border-slate-700
                       text-sm font-medium text-slate-700 dark:text-slate-300 rounded-lg
                       hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </main>
    </div>
  );
}

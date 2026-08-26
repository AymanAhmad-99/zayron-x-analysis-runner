import {
  ChevronRight,
  ExternalLink,
  FileText,
  LayoutDashboard,
  Radio,
  Settings,
  ShieldAlert,
} from '@/lib/icons';
import { createClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: {
    default: 'Admin — ZAYRON-X',
    template: '%s — Admin | ZAYRON-X',
  },
  robots: { index: false, follow: false },
};

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Intelligence', href: '/admin/articles', icon: FileText },
  { label: 'CVE Monitor', href: '/admin/cves', icon: ShieldAlert },
  { label: 'Raw Feeds', href: '/admin/feeds', icon: Radio },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
];

function Sidebar() {
  return (
    <aside className="w-64 shrink-0 bg-white border-r border-neutral-200 min-h-screen flex flex-col font-sans">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-neutral-200">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-neutral-50 border border-neutral-200 text-neutral-600 flex items-center justify-center font-bold text-xs shrink-0 font-mono">
            Zx
          </div>
          <span
            className="font-sans text-sm font-black uppercase select-none flex items-center"
            style={{ letterSpacing: '-0.08em' }}
          >
            <span className="text-[#050505]">ZAYRON</span>
            <span className="text-[#050505]">-</span>
            <span className="text-[#733DD9]">X</span>
          </span>
          <span className="text-[#64748B] text-[10px] font-mono font-bold uppercase tracking-wider ml-1">
            Admin
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-neutral-500 hover:text-[#733DD9] hover:bg-neutral-50 transition-all duration-200"
            >
              <Icon className="w-4 h-4 shrink-0 text-neutral-400 group-hover:text-[#733DD9] transition-colors duration-200" />
              <span className="font-medium">{item.label}</span>
              <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-40 transition-all duration-200" />
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-neutral-200">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs text-neutral-500 hover:text-[#733DD9] transition-colors duration-200"
        >
          <ExternalLink className="w-3 h-3" />
          View Public Site
        </Link>
      </div>
    </aside>
  );
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  /* ── Defense-in-depth: server-side auth verification ──
     The middleware already redirects unauthenticated users,
     but this second layer enforces an ADMIN_EMAILS allowlist
     and catches any middleware misconfiguration. */
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Optional: restrict admin to specific email addresses
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map((e) => e.trim().toLowerCase()) ?? [];
  if (adminEmails.length > 0 && !adminEmails.includes(user.email?.toLowerCase() ?? '')) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      <Sidebar />
      <main className="flex-1 bg-[#F8FAFC] min-h-screen overflow-auto">{children}</main>
    </div>
  );
}

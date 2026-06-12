/**
 * Centralized icon re-exports using direct file imports.
 *
 * lucide-react's barrel file (dist/esm/lucide-react.js) re-exports ~1 500 icons.
 * Turbopack in Next.js 16 cannot reliably chunk-split that many module factories,
 * causing "module factory is not available" runtime errors.
 *
 * Importing each icon directly from its own file bypasses the barrel entirely.
 */

// ── A ──
export { default as Activity } from 'lucide-react/dist/esm/icons/activity.js';
export { default as AlertTriangle } from 'lucide-react/dist/esm/icons/alert-triangle.js';
export { default as ArrowLeft } from 'lucide-react/dist/esm/icons/arrow-left.js';
export { default as ArrowRight } from 'lucide-react/dist/esm/icons/arrow-right.js';
export { default as ArrowUpRight } from 'lucide-react/dist/esm/icons/arrow-up-right.js';

// ── B ──
export { default as BarChart3 } from 'lucide-react/dist/esm/icons/bar-chart-3.js';
export { default as Bell } from 'lucide-react/dist/esm/icons/bell.js';
export { default as Bot } from 'lucide-react/dist/esm/icons/bot.js';
export { default as Braces } from 'lucide-react/dist/esm/icons/braces.js';
export { default as Bug } from 'lucide-react/dist/esm/icons/bug.js';

// ── C ──
export { default as CheckCircle } from 'lucide-react/dist/esm/icons/check-circle.js';
export { default as Check } from 'lucide-react/dist/esm/icons/check.js';
export { default as Copy } from 'lucide-react/dist/esm/icons/copy.js';
export { default as ChevronDown } from 'lucide-react/dist/esm/icons/chevron-down.js';
export { default as ChevronRight } from 'lucide-react/dist/esm/icons/chevron-right.js';
export { default as Circle } from 'lucide-react/dist/esm/icons/circle.js';
export { default as Clock } from 'lucide-react/dist/esm/icons/clock.js';
export { default as Code } from 'lucide-react/dist/esm/icons/code.js';
export { default as Code2 } from 'lucide-react/dist/esm/icons/code-2.js';
export { default as Cpu } from 'lucide-react/dist/esm/icons/cpu.js';

// ── D ──
export { default as Database } from 'lucide-react/dist/esm/icons/database.js';

// ── E ──
export { default as ExternalLink } from 'lucide-react/dist/esm/icons/external-link.js';

// ── F ──
export { default as Facebook } from 'lucide-react/dist/esm/icons/facebook.js';
export { default as FileText } from 'lucide-react/dist/esm/icons/file-text.js';
export { default as Fingerprint } from 'lucide-react/dist/esm/icons/fingerprint.js';
export { default as Flag } from 'lucide-react/dist/esm/icons/flag.js';

// ── G ──
export { default as GitFork } from 'lucide-react/dist/esm/icons/git-fork.js';
export { default as Globe } from 'lucide-react/dist/esm/icons/globe.js';

// ── K ──
export { default as Key } from 'lucide-react/dist/esm/icons/key.js';

// ── L ──
export { default as LayoutDashboard } from 'lucide-react/dist/esm/icons/layout-dashboard.js';
export { default as Lock } from 'lucide-react/dist/esm/icons/lock.js';
export { default as LogIn } from 'lucide-react/dist/esm/icons/log-in.js';

// ── M ──
export { default as Mail } from 'lucide-react/dist/esm/icons/mail.js';
export { default as Menu } from 'lucide-react/dist/esm/icons/menu.js';
export { default as MessageSquare } from 'lucide-react/dist/esm/icons/message-square.js';

// ── N ──
export { default as Network } from 'lucide-react/dist/esm/icons/network.js';

// ── R ──
export { default as Radar } from 'lucide-react/dist/esm/icons/radar.js';
export { default as Radio } from 'lucide-react/dist/esm/icons/radio.js';
export { default as RefreshCw } from 'lucide-react/dist/esm/icons/refresh-cw.js';

// ── S ──
export { default as Satellite } from 'lucide-react/dist/esm/icons/satellite.js';
export { default as ScanLine } from 'lucide-react/dist/esm/icons/scan-line.js';
export { default as Search } from 'lucide-react/dist/esm/icons/search.js';
export { default as Settings } from 'lucide-react/dist/esm/icons/settings.js';
export { default as Share2 } from 'lucide-react/dist/esm/icons/share-2.js';
export { default as Shield } from 'lucide-react/dist/esm/icons/shield.js';
export { default as ShieldAlert } from 'lucide-react/dist/esm/icons/shield-alert.js';
export { default as ShieldCheck } from 'lucide-react/dist/esm/icons/shield-check.js';
export { default as Star } from 'lucide-react/dist/esm/icons/star.js';

// ── T ──
export { default as Tag } from 'lucide-react/dist/esm/icons/tag.js';
export { default as Trash2 } from 'lucide-react/dist/esm/icons/trash-2.js';
export { default as TrendingUp } from 'lucide-react/dist/esm/icons/trending-up.js';
export { default as Twitter } from 'lucide-react/dist/esm/icons/twitter.js';

// ── U ──
export { default as User } from 'lucide-react/dist/esm/icons/user.js';
export { default as Users } from 'lucide-react/dist/esm/icons/users.js';

// ── W ──
export { default as Wrench } from 'lucide-react/dist/esm/icons/wrench.js';

// ── X ──
export { default as X } from 'lucide-react/dist/esm/icons/x.js';
export { default as XCircle } from 'lucide-react/dist/esm/icons/x-circle.js';

// ── Z ──
export { default as Zap } from 'lucide-react/dist/esm/icons/zap.js';

// ── Aliased re-exports ──
export { default as LinkIcon } from 'lucide-react/dist/esm/icons/link.js';

// ── Platform UI ──
export { default as Building2 } from 'lucide-react/dist/esm/icons/building-2.js';
export { default as Calendar } from 'lucide-react/dist/esm/icons/calendar.js';
export { default as Eye } from 'lucide-react/dist/esm/icons/eye.js';
export { default as Instagram } from 'lucide-react/dist/esm/icons/instagram.js';
export { default as Layers } from 'lucide-react/dist/esm/icons/layers.js';
export { default as Linkedin } from 'lucide-react/dist/esm/icons/linkedin.js';
export { default as MapPin } from 'lucide-react/dist/esm/icons/map-pin.js';

// Missing re-exports for Phase 2 components
export { default as Server } from 'lucide-react/dist/esm/icons/server.js';
export { default as Play } from 'lucide-react/dist/esm/icons/play.js';
export { default as Download } from 'lucide-react/dist/esm/icons/download.js';
export { default as CheckCircle2 } from 'lucide-react/dist/esm/icons/check-circle-2.js';
export { default as Terminal } from 'lucide-react/dist/esm/icons/terminal.js';

// Phase 3 — Dark mode + UX
export { default as Moon } from 'lucide-react/dist/esm/icons/moon.js';
export { default as Sun } from 'lucide-react/dist/esm/icons/sun.js';
export { default as Monitor } from 'lucide-react/dist/esm/icons/monitor.js';
export { default as ArrowUp } from 'lucide-react/dist/esm/icons/arrow-up.js';
export { default as HelpCircle } from 'lucide-react/dist/esm/icons/help-circle.js';
export { default as Brain } from 'lucide-react/dist/esm/icons/brain.js';
export { default as Cloud } from 'lucide-react/dist/esm/icons/cloud.js';
export { default as LogOut } from 'lucide-react/dist/esm/icons/log-out.js';

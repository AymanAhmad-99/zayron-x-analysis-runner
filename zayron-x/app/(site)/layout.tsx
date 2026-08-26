export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col min-h-0">{children}</div>;
}

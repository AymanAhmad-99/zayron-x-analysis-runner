import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Identity Access",
  robots: { index: false, follow: false },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white bg-data-stream flex items-center justify-center px-4 relative font-sans">
      <div className="w-full relative z-10 flex items-center justify-center py-12">
        {children}
      </div>
    </div>
  );
}

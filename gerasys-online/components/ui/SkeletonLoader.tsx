interface SkeletonLoaderProps {
  className?: string;
  variant?: "card" | "text" | "hero" | "list";
  style?: React.CSSProperties;
}

export function SkeletonLoader({ className = "", variant = "text", style }: SkeletonLoaderProps) {
  const base = "animate-pulse bg-neutral-200/60 rounded";

  if (variant === "card") {
    return (
      <div className={`bg-white border border-neutral-200 rounded-xl p-5 space-y-3 shadow-sm ${className}`} style={style}>
        <div className={`${base} aspect-[16/9] w-full`} />
        <div className={`${base} h-3 w-20`} />
        <div className={`${base} h-5 w-full`} />
        <div className={`${base} h-5 w-3/4`} />
        <div className={`${base} h-3 w-40`} />
      </div>
    );
  }

  if (variant === "hero") {
    return (
      <div className={`space-y-4 ${className}`} style={style}>
        <div className={`${base} h-4 w-24`} />
        <div className={`${base} h-10 w-full`} />
        <div className={`${base} h-10 w-3/4`} />
        <div className={`${base} h-4 w-64`} />
        <div className={`${base} aspect-[2/1] w-full`} />
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className={`flex gap-3 items-start ${className}`} style={style}>
        <div className={`${base} w-16 h-16 shrink-0`} />
        <div className="flex-1 space-y-2">
          <div className={`${base} h-3 w-16`} />
          <div className={`${base} h-4 w-full`} />
          <div className={`${base} h-4 w-3/4`} />
          <div className={`${base} h-3 w-24`} />
        </div>
      </div>
    );
  }

  return <div className={`${base} h-4 w-full ${className}`} />;
}

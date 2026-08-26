interface SeverityBadgeProps {
  severity: string;
}

const severityStyles: Record<string, string> = {
  critical: 'text-[#DC2626] border-[#DC2626]',
  high: 'text-[#EA580C] border-[#EA580C]',
  medium: 'text-[#D97706] border-[#D97706]',
  low: 'text-[#16A34A] border-[#16A34A]',
  none: 'text-neutral-500 border-neutral-300',
};

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const key = severity?.toLowerCase() ?? 'none';
  const style = severityStyles[key] ?? severityStyles.none;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-[9px] font-mono font-bold tracking-wider uppercase bg-transparent ${style}`}
    >
      {severity ?? 'UNKNOWN'}
    </span>
  );
}

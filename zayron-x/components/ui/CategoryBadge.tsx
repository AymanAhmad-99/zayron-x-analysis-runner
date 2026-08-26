interface CategoryBadgeProps {
  category: string;
  className?: string;
}

export function CategoryBadge({ category, className = '' }: CategoryBadgeProps) {
  return <span className={`eyebrow text-[0.62rem] ${className}`}>{category}</span>;
}

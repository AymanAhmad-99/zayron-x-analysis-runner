interface ChapterHeaderProps {
  chapter: string;
  title: string;
  subtitle?: string;
  dark?: boolean;
}

export function ChapterHeader({ chapter, title, subtitle, dark = false }: ChapterHeaderProps) {
  return (
    <div className="mb-8">
      <div className={`text-[10px] font-bold tracking-[0.1em] uppercase mb-2 ${dark ? 'text-[#8C8F98]' : 'text-[#8C8F98]'}`}>
        {chapter}
      </div>
      <h2 className={`font-editorial text-2xl md:text-3xl font-semibold tracking-tight uppercase ${dark ? 'text-[#FFFFFF]' : 'text-[#111214]'}`}>
        {title}
      </h2>
      {subtitle && (
        <p className={`text-xs md:text-sm mt-1.5 ${dark ? 'text-[#8C8F98]' : 'text-[#5A5D65]'}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

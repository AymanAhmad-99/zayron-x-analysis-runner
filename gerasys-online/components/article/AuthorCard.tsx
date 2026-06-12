interface AuthorCardProps {
  authorName: string;
  title?: string;
  bio?: string;
  specializations?: string[];
  articleCount?: number;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

export function AuthorCard({
  authorName,
  title,
  bio,
  specializations,
  articleCount,
}: AuthorCardProps) {
  return (
    <div className="flex items-start gap-5 bg-[#FAFAFA] border border-[#222222] p-8 my-8">
      <div className="w-14 h-14 bg-black text-white flex items-center justify-center font-display font-bold text-lg shrink-0">
        {getInitials(authorName)}
      </div>
      <div className="min-w-0">
        <h3 className="font-display font-black text-lg text-black">{authorName}</h3>
        {title && <p className="text-sm text-[#444444] font-mono font-medium mt-0.5">{title}</p>}
        {bio && (
          <p className="text-sm text-[#444444] mt-2 font-body leading-loose max-w-xl">{bio}</p>
        )}
        {specializations && specializations.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {specializations.map((spec) => (
              <span
                key={spec}
                className="text-[10px] px-2.5 py-1 bg-white text-[#444444] border border-[#222222] font-mono uppercase tracking-wider"
              >
                {spec}
              </span>
            ))}
          </div>
        )}
        {articleCount !== undefined && articleCount > 0 && (
          <p className="text-xs text-[#666666] mt-2 font-mono uppercase tracking-wider">
            {articleCount} intelligence report{articleCount !== 1 ? 's' : ''} published
          </p>
        )}
      </div>
    </div>
  );
}

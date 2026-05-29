import { type Analyst } from "@/lib/db/schema";

interface AnalystTeamProps {
  analysts: Analyst[];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

export function AnalystTeam({ analysts }: AnalystTeamProps) {
  if (!analysts.length) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {analysts.map((analyst) => (
        <div
          key={analyst.id}
          className="card-bento p-6 text-center group"
        >
          <div className="w-16 h-16 rounded-full bg-[#D2B48C] text-white flex items-center justify-center mx-auto mb-3 font-display font-bold text-lg shadow-sm">
            {getInitials(analyst.name)}
          </div>
          <h3 className="font-display font-bold text-base text-[#0F172A]">
            {analyst.name}
          </h3>
          {analyst.nationality && (
            <p className="text-[10px] uppercase tracking-widest font-bold text-[#D2B48C] mt-0.5 font-ui">
              {analyst.nationality}
            </p>
          )}
          <p className="text-xs text-[#475569] font-ui mt-0.5">
            {analyst.title}
          </p>
          {(analyst.articleCount ?? 0) > 0 && (
            <p className="text-[0.6rem] text-[#94A3B8] font-mono tracking-wide mt-0.5">
              {(analyst.articleCount ?? 0).toLocaleString()} report{(analyst.articleCount ?? 0) !== 1 ? "s" : ""} authored
            </p>
          )}
          <p className="text-xs text-[#475569] mt-2 line-clamp-2 font-ui leading-relaxed">
            {analyst.bio}
          </p>
          {analyst.specializations && analyst.specializations.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5 mt-3">
              {analyst.specializations.map((spec) => (
                <span
                  key={spec}
                  className="text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-[#EFF6FF] text-[#D2B48C] font-ui"
                >
                  {spec}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

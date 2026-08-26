import React from "react";
import { EntityPill } from "./EntityPill";

export function DossierHeader({ title, type, entities = [], summary }: { title: string, type: string, entities?: string[], summary: string }) {
  return (
    <div className="bg-[#FFFFFF] border-b border-[#D9DDE2] py-16">
      <div className="max-w-7xl mx-auto px-6">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A838D] mb-4 block">
          {type} DOSSIER
        </span>
        <h1 className="text-4xl md:text-5xl font-bold text-[#111111] tracking-tight leading-tight mb-6">
          {title}
        </h1>
        <p className="text-lg text-[#56606B] leading-relaxed max-w-3xl mb-8">
          {summary}
        </p>
        {entities.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {entities.map(e => (
              <EntityPill key={e} entity={e} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

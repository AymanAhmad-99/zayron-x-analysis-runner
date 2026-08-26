import React from "react";
import { Info } from "lucide-react";

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 bg-[#F7F7F5] border border-[#D9DDE2] text-center min-h-[300px]">
      <Info className="w-8 h-8 text-[#7A838D] mb-4" />
      <p className="text-sm font-medium text-[#56606B] max-w-md leading-relaxed">
        {message}
      </p>
    </div>
  );
}

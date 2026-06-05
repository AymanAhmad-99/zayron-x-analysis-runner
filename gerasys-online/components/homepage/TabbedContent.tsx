"use client";

import { useState } from "react";
import { type Article } from "@/lib/types";
import { ArticleCard } from "@/components/ui/ArticleCard";

interface TabbedContentProps {
  articles: Article[];
}

type TabKey = "all" | "vulns" | "tools" | "nationstate" | "ai";

const tabs: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "vulns", label: "Vulnerabilities" },
  { key: "tools", label: "Tools" },
  { key: "nationstate", label: "Nation State" },
  { key: "ai", label: "AI Security" },
];

export function TabbedContent({ articles }: TabbedContentProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("all");

  function filterArticles(key: TabKey): Article[] {
    if (key === "all") return articles.slice(0, 4);
    return articles
      .filter((a) => {
        const cat = a.category.toLowerCase();
        switch (key) {
          case "vulns":
            return cat.includes("vuln") || cat.includes("cve") || cat.includes("exploit");
          case "tools":
            return cat.includes("tool");
          case "nationstate":
            return cat.includes("nation") || cat.includes("state") || cat.includes("apt");
          case "ai":
            return cat.includes("ai");
          default:
            return false;
        }
      })
      .slice(0, 4);
  }

  return (
    <section className="max-w-7xl mx-auto px-6 py-12">
      <div className="mb-10">
        <p className="section-label">Browse Intelligence</p>
        <h2 className="section-heading mt-2">By Category</h2>
        <p className="section-subheading mt-3">
          Filter intelligence reports by domain.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all font-ui ${
              activeTab === tab.key
                ? "bg-[#D2B48C] text-white shadow-sm"
                : "bg-white border border-[#E2E8F0] text-[#475569] hover:border-[#D2B48C] hover:text-[#D2B48C]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {filterArticles(activeTab).map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
    </section>
  );
}

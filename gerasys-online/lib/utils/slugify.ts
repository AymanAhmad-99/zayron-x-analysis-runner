export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-")
    .trim()
    .replace(/^-+|-+$/g, "");
}

const CATEGORY_LABELS: Record<string, string> = {
  vulnerabilities: "Vulnerabilities",
  threat_intel: "Threat Intelligence",
  osint: "OSINT",
  cyber_news: "Cyber News",
};

export function formatCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

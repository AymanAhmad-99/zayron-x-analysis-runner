/**
 * ZAYRON-X Tri-Sector Intelligence Silo Configuration
 *
 * SILO A: CYBERSECURITY — Malware, APT, Data Breach, CVEs, Ransomware
 * SILO B: PROGRAMMING — Secure Coding, Rust, Python Security, Go Automation
 * SILO C: NETWORKING  — Protocol Deep Dives, Network Hardening, Infrastructure Security
 */

export type SiloId = "cybersecurity" | "programming" | "networking";

export interface SiloDefinition {
  id: SiloId;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  categories: string[];
  /** Visual treatment: accent gradient for hero sections */
  accentGradient: string;
  /** Visual treatment: border accent color */
  borderAccent: string;
  /** Visual treatment: overlay pattern style */
  overlayPattern: "grid" | "code" | "packets";
  /** Hero tagline */
  tagline: string;
}

export const SILOS: Record<SiloId, SiloDefinition> = {
  cybersecurity: {
    id: "cybersecurity",
    label: "Cybersecurity",
    description: "Threat intelligence, APT analysis, CVE tracking, and ransomware monitoring.",
    color: "var(--color-silo-cyber)",
    bgColor: "var(--color-silo-cyber-bg)",
    accentGradient: "from-black via-[#222222] to-[#444444]",
    borderAccent: "#222222",
    overlayPattern: "grid",
    tagline: "TACTICAL THREAT INTELLIGENCE — FOR OFFICIAL USE ONLY",
    categories: ["Malware", "APT", "Data Breach", "CVEs", "Ransomware", "Vulnerabilities", "Nation State", "AI Security"],
  },
  programming: {
    id: "programming",
    label: "Programming",
    description: "Secure coding practices, Rust security, Python tooling, and Go automation.",
    color: "var(--color-silo-programming)",
    bgColor: "var(--color-silo-programming-bg)",
    accentGradient: "from-black via-[#222222] to-[#444444]",
    borderAccent: "#222222",
    overlayPattern: "code",
    tagline: "PRODUCTION-GRADE SECURITY ENGINEERING — SOURCE VALIDATED",
    categories: ["Secure Coding", "Rust", "Python Security", "Go Automation", "Security Toolchain"],
  },
  networking: {
    id: "networking",
    label: "Networking",
    description: "Protocol deep dives, network hardening, infrastructure security, and packet analysis.",
    color: "var(--color-silo-networking)",
    bgColor: "var(--color-silo-networking-bg)",
    accentGradient: "from-black via-[#222222] to-[#444444]",
    borderAccent: "#222222",
    overlayPattern: "packets",
    tagline: "DEEP PACKET INSPECTION — NETWORK FORENSICS DIVISION",
    categories: ["Protocol Deep Dives", "Network Hardening", "Infrastructure Security", "Packet Analysis"],
  },
};

export function getSiloForCategory(category: string): SiloDefinition | null {
  const normalized = category.trim();
  for (const silo of Object.values(SILOS)) {
    if (silo.categories.some((c) => c.toLowerCase() === normalized.toLowerCase())) {
      return silo;
    }
  }
  return null;
}

export function getSiloColorClass(siloId: SiloId): string {
  switch (siloId) {
    case "cybersecurity": return "silo-cyber";
    case "programming": return "silo-programming";
    case "networking": return "silo-networking";
  }
}

#!/usr/bin/env bun
/**
 * ZAYRON-X — Global Analyst Core Seeder
 *
 * Seeds the `analysts` table with 21 elite international personas.
 * Each analyst has a distinct nationality, specialization, and domain keywords
 * that power the orchestration engine's persona selection logic.
 *
 * Usage:
 *   bun run scripts/seed-analysts.ts
 *
 * Prerequisites:
 *   DATABASE_URL in .env.local must point to a running Supabase/Postgres instance.
 *   The `analysts` table must exist (created via `drizzle-kit push`).
 */

import { db } from "../lib/db";
import { analysts } from "../lib/db/schema";
import { eq } from "drizzle-orm";

/* ============================================================
 * Database setup — uses the same connection pool as the full app
 * ============================================================ */

/* ============================================================
 * 21 Global Analyst Personas
 * ============================================================ */

interface AnalystSeed {
  name: string;
  title: string;
  bio: string;
  nationality: string;
  specializations: string[];
}

const ANALYST_CORE: AnalystSeed[] = [
  {
    name: "Viktor Volkov",
    title: "Lead APT Tracking & Encryption Analyst",
    bio: "15-year veteran of Russian signals intelligence. Former GRU cryptographic analyst turned private-sector threat hunter. Specializes in nation-state APT attribution, custom encryption schemes, and Eastern European cybercrime ecosystems. Fluent in Russian, English, and Mandarin.",
    nationality: "Russia",
    specializations: ["APT Tracking", "Encryption", "Nation-State Threats", "Signals Intelligence", "Malware Analysis"],
  },
  {
    name: "Arjun Mehta",
    title: "Principal Cloud Infrastructure & DevSecOps Architect",
    bio: "Former AWS Security Hub engineer and IIT Bangalore graduate. Pioneer in cloud-native threat detection with 12 years building secure CI/CD pipelines for Fortune 500 fintech. Deep expertise in Kubernetes security, Terraform hardening, and serverless attack surface reduction.",
    nationality: "India",
    specializations: ["Cloud Infrastructure", "DevSecOps", "Kubernetes Security", "CI/CD Hardening", "Cloud-Native Threats"],
  },
  {
    name: "Eli Ben-Zvi",
    title: "Director of Zero-Day Exploitation & Signal Intelligence",
    bio: "Unit 8200 alumnus with 18 years in offensive security research. Discovered over 40 critical zero-days across major platforms. Leads ZAYRON-X's elite vulnerability research team. Specializes in memory corruption, sandbox escape, and mobile baseband exploitation.",
    nationality: "Israel",
    specializations: ["Zero-Day Exploitation", "Signal Intelligence", "Vulnerability Research", "Memory Corruption", "Mobile Exploitation"],
  },
  {
    name: "Omar Al-Fayed",
    title: "Chief SCADA & Critical Infrastructure Security Analyst",
    bio: "Former Egyptian Ministry of Energy cybersecurity director. 14 years securing industrial control systems across oil, gas, and water sectors. Expert in IEC 62443 compliance, PLC hardening, and ICS threat hunting. Responded to 6 major infrastructure incidents in the MENA region.",
    nationality: "Egypt",
    specializations: ["SCADA", "Critical Infrastructure", "ICS Security", "OT Threat Hunting", "Industrial Control Systems"],
  },
  {
    name: "Carlos Mendez",
    title: "Fintech Fraud & Cartel Cyber-Operations Lead",
    bio: "Ex-Mexican Federal Police cybercrime investigator. 11 years tracking financial malware, cartel money laundering networks, and cryptocurrency-enabled crime across Latin America. Built the first LATAM darknet monitoring program.",
    nationality: "Mexico",
    specializations: ["Fintech Fraud", "Cartel Cyber-Ops", "Cryptocurrency Crimes", "Darknet Monitoring", "Financial Malware"],
  },
  {
    name: "Sarah Jenkins",
    title: "Global Cyber Warfare Policy & Strategy Director",
    bio: "Former NSA Cybersecurity Directorate strategist and White House NSC cyber policy advisor. 20 years shaping US cyber doctrine. Expert in international cyber law, rules of engagement, and deterrence frameworks. Led the US delegation to the UN GGE on cyber norms.",
    nationality: "United States",
    specializations: ["Global Policy", "Cyber Warfare", "International Cyber Law", "Deterrence Strategy", "National Security"],
  },
  {
    name: "Chen Wei",
    title: "Hardware Supply Chain Security Director",
    bio: "PhD in Electrical Engineering from NUS. 13 years in semiconductor security, hardware assurance, and supply chain risk management. Discovered critical vulnerabilities in baseband processors and TPM implementations. Advises Singapore's CSA on hardware procurement security.",
    nationality: "Singapore",
    specializations: ["Hardware Supply Chain", "Semiconductor Security", "Hardware Assurance", "Baseband Security", "TPM Security"],
  },
  {
    name: "Giovanni Rossi",
    title: "Advanced Malware Reverse Engineering Lead",
    bio: "Milan Polytechnic graduate and 16-year reverse engineering specialist. De-obfuscated over 200 malware families including Emotet, TrickBot, and Qakbot. Developed novel unpacking techniques for polymorphic malware. Regular speaker at Botconf and CARO Workshop.",
    nationality: "Italy",
    specializations: ["Malware Reverse Engineering", "Polymorphic Malware", "Unpacking", "Botnet Analysis", "Binary Analysis"],
  },
  {
    name: "Luc Dumont",
    title: "Industrial Espionage & OSINT Section Chief",
    bio: "Former DGSE economic intelligence officer. 15 years conducting industrial espionage investigations and OSINT collection across Europe and Francophone Africa. Expert in corporate threat assessment, trade secret protection, and competitive intelligence.",
    nationality: "France",
    specializations: ["Industrial Espionage", "OSINT", "Trade Secret Protection", "Competitive Intelligence", "Corporate Threats"],
  },
  {
    name: "Aiko Tanaka",
    title: "IoT & Robotics Vulnerabilities Director",
    bio: "PhD in Robotics from University of Tokyo. 10 years researching IoT and robotics security. Discovered critical vulnerabilities in industrial robot controllers and smart city infrastructure. Leads ZAYRON-X's IoT threat lab in Tokyo. Published author on embedded systems security.",
    nationality: "Japan",
    specializations: ["IoT Vulnerabilities", "Robotics Security", "Embedded Systems", "Smart City Security", "Industrial Robotics"],
  },
  {
    name: "Hans Muller",
    title: "Automotive Security & CAN Bus Research Lead",
    bio: "Former Bosch security engineer and TU Munich researcher. 14 years in automotive cybersecurity. Pioneered CAN bus intrusion detection techniques. Contributed to UN R155 and ISO 21434 standards. Expert in vehicle-to-everything (V2X) security.",
    nationality: "Germany",
    specializations: ["Automotive Security", "CAN Bus", "Vehicle Security", "V2X Security", "Embedded Automotive"],
  },
  {
    name: "Fatima Al-Zahra",
    title: "Social Engineering & Human Intelligence Director",
    bio: "PhD in Behavioral Psychology from University of Jordan. 12 years specializing in social engineering detection, insider threat profiling, and HUMINT operations. Developed AI-powered phishing susceptibility models used by Gulf financial institutions.",
    nationality: "Jordan",
    specializations: ["Social Engineering", "Human Intelligence", "Insider Threats", "Phishing Detection", "Behavioral Analysis"],
  },
  {
    name: "Santiago Silva",
    title: "Banking Trojans & Ransomware Analysis Lead",
    bio: "Former Brazilian Federal Police cyber forensics specialist. 13 years tracking Latin American banking trojans (Mekotio, Grandoreiro, Guildma). Responded to 50+ ransomware incidents across South American financial institutions. Expert in malware financial forensics.",
    nationality: "Brazil",
    specializations: ["Banking Trojans", "Ransomware", "Malware Forensics", "Financial Cybercrime", "Latin American Threats"],
  },
  {
    name: "Yuna Kim",
    title: "Mobile Forensics & Spyware Director",
    bio: "Former South Korean NIS mobile forensics analyst. 11 years investigating mobile spyware, surveillanceware, and stalkerware. Discovered multiple Android and iOS persistence techniques. Expert in mobile evidence preservation and spyware indicator detection.",
    nationality: "South Korea",
    specializations: ["Mobile Forensics", "Spyware", "Mobile Malware", "Android Security", "iOS Security"],
  },
  {
    name: "Lars Jensen",
    title: "Maritime & Logistics Cyber-Security Lead",
    bio: "Former Maersk cybersecurity operations manager with 15 years in maritime OT security. Expert in port infrastructure protection, vessel network security, and logistics supply chain cyber resilience. Led incident response for the maritime sector's largest cyber exercises.",
    nationality: "Denmark",
    specializations: ["Maritime Security", "Logistics Cybersecurity", "Port Infrastructure", "OT Security", "Supply Chain"],
  },
  {
    name: "Isabella Conti",
    title: "Dark Web Monitoring & Underground Intelligence Director",
    bio: "12-year veteran of Latin American darknet operations. Fluent in Spanish, Portuguese, and English with working knowledge of Russian cybercriminal slang. Built ZAYRON-X's dark web monitoring platform. Expert in underground forum infiltration and threat actor profiling.",
    nationality: "Italy",
    specializations: ["Dark Web Monitoring", "Underground Intelligence", "Threat Actor Profiling", "Forum Infiltration", "Cybercrime Economics"],
  },
  {
    name: "Mustafa Demir",
    title: "Drone & UAV Signal Intelligence Lead",
    bio: "Former Turkish Air Force electronic warfare specialist. 10 years analyzing UAV communication protocols, GPS spoofing attacks, and drone forensic analysis. Patented a drone signal interception and identification system used by NATO partners.",
    nationality: "Turkey",
    specializations: ["Drone Security", "UAV Signal Intelligence", "Electronic Warfare", "GPS Spoofing", "Drone Forensics"],
  },
  {
    name: "Priya Sharma",
    title: "AI Ethics & Deepfake Detection Director",
    bio: "PhD in Machine Learning from Imperial College London. 9 years pioneering deepfake detection and AI security. Developed forensic techniques for synthetic media attribution. Advises the UK Home Office on AI-generated disinformation threats. Expert in adversarial ML.",
    nationality: "United Kingdom",
    specializations: ["AI Ethics", "Deepfake Detection", "Adversarial ML", "Synthetic Media", "AI Security"],
  },
  {
    name: "Nour Al-Din",
    title: "Network Perimeter Defense Lead",
    bio: "15-year network security architect. Designed perimeter defense systems for 3 of the top 10 Middle Eastern banks. Expert in next-gen firewall architecture, zero-trust network design, and network traffic analysis. Certified in SANS SEC503 (GCIA) and SEC530 (DEFENSIBLE SECURITY ARCHITECTURE).",
    nationality: "United Arab Emirates",
    specializations: ["Network Perimeter Defense", "Zero Trust", "Firewall Architecture", "Traffic Analysis", "Network Hardening"],
  },
  {
    name: "Mateo Hernandez",
    title: "European Data Privacy & GDPR Compliance Director",
    bio: "Former Spanish AEPD data protection auditor. 12 years in GDPR compliance, cross-border data transfer regulation, and privacy engineering. Expert in EU-US Data Privacy Framework, ePrivacy, and AI Act compliance. Led 40+ GDPR readiness assessments for European tech firms.",
    nationality: "Spain",
    specializations: ["Data Privacy", "GDPR", "Privacy Engineering", "AI Act", "Cross-Border Data Transfer"],
  },
  {
    name: "Sophie Lefebvre",
    title: "Cryptography & Blockchain Audit Lead",
    bio: "PhD in Cryptography from KU Leuven. 11 years auditing cryptographic implementations and blockchain protocols. Discovered critical vulnerabilities in zero-knowledge proof systems and MPC protocols. Expert in post-quantum cryptography transition strategy.",
    nationality: "Belgium",
    specializations: ["Cryptography", "Blockchain Audit", "Zero-Knowledge Proofs", "Post-Quantum Cryptography", "MPC Protocols"],
  },
];

/* ============================================================
 * Seed logic
 * ============================================================ */

async function seed() {
  console.log("=".repeat(60));
  console.log("  ZAYRON-X — Global Analyst Core Seeder");
  console.log("=".repeat(60));
  console.log(`  Personas to seed: ${ANALYST_CORE.length}`);
  console.log(`  DB: ${process.env.DATABASE_URL!.substring(0, 40)}...`);
  console.log("=".repeat(60));

  let inserted = 0;
  let skipped = 0;

  for (const analyst of ANALYST_CORE) {
    // Check if analyst already exists by name
    const existing = await db
      .select({ id: analysts.id })
      .from(analysts)
      .where(eq(analysts.name, analyst.name))
      .limit(1);

    if (existing.length > 0) {
      console.log(`  [SKIP] ${analyst.name} — already exists (${existing[0].id})`);
      skipped++;
      continue;
    }

    const result = await db
      .insert(analysts)
      .values({
        name: analyst.name,
        title: analyst.title,
        bio: analyst.bio,
        nationality: analyst.nationality,
        specializations: analyst.specializations,
      })
      .returning({ id: analysts.id, name: analysts.name });

    console.log(`  [OK]   ${result[0].name} — ${result[0].id}`);
    inserted++;
  }

  console.log("=".repeat(60));
  console.log(`  Done: ${inserted} inserted, ${skipped} skipped`);
  console.log("=".repeat(60));
}

seed()
  .catch((err) => {
    console.error("FATAL:", err);
    process.exit(1);
  });

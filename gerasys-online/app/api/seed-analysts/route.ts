import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { analysts } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

const ANALYST_CORE = [
  { name: "Viktor Volkov", title: "Lead APT Tracking & Encryption Analyst", bio: "15-year veteran of Russian signals intelligence. Former GRU cryptographic analyst turned private-sector threat hunter.", nationality: "Russia", specializations: ["APT Tracking", "Encryption", "Nation-State Threats", "Signals Intelligence", "Malware Analysis"] },
  { name: "Arjun Mehta", title: "Principal Cloud Infrastructure & DevSecOps Architect", bio: "Former AWS Security Hub engineer and IIT Bangalore graduate. Pioneer in cloud-native threat detection.", nationality: "India", specializations: ["Cloud Infrastructure", "DevSecOps", "Kubernetes Security", "CI/CD Hardening", "Cloud-Native Threats"] },
  { name: "Eli Ben-Zvi", title: "Director of Zero-Day Exploitation & Signal Intelligence", bio: "Unit 8200 alumnus with 18 years in offensive security research. Discovered over 40 critical zero-days.", nationality: "Israel", specializations: ["Zero-Day Exploitation", "Signal Intelligence", "Vulnerability Research", "Memory Corruption", "Mobile Exploitation"] },
  { name: "Omar Al-Fayed", title: "Chief SCADA & Critical Infrastructure Security Analyst", bio: "Former Egyptian Ministry of Energy cybersecurity director. 14 years securing industrial control systems.", nationality: "Egypt", specializations: ["SCADA", "Critical Infrastructure", "ICS Security", "OT Threat Hunting", "Industrial Control Systems"] },
  { name: "Carlos Mendez", title: "Fintech Fraud & Cartel Cyber-Operations Lead", bio: "Ex-Mexican Federal Police cybercrime investigator. 11 years tracking financial malware.", nationality: "Mexico", specializations: ["Fintech Fraud", "Cartel Cyber-Ops", "Cryptocurrency Crimes", "Darknet Monitoring", "Financial Malware"] },
  { name: "Sarah Jenkins", title: "Global Cyber Warfare Policy & Strategy Director", bio: "Former NSA Cybersecurity Directorate strategist and White House NSC cyber policy advisor.", nationality: "United States", specializations: ["Global Policy", "Cyber Warfare", "International Cyber Law", "Deterrence Strategy", "National Security"] },
  { name: "Chen Wei", title: "Hardware Supply Chain Security Director", bio: "PhD in Electrical Engineering from NUS. 13 years in semiconductor security.", nationality: "Singapore", specializations: ["Hardware Supply Chain", "Semiconductor Security", "Hardware Assurance", "Baseband Security", "TPM Security"] },
  { name: "Giovanni Rossi", title: "Advanced Malware Reverse Engineering Lead", bio: "Milan Polytechnic graduate and 16-year reverse engineering specialist.", nationality: "Italy", specializations: ["Malware Reverse Engineering", "Polymorphic Malware", "Unpacking", "Botnet Analysis", "Binary Analysis"] },
  { name: "Luc Dumont", title: "Industrial Espionage & OSINT Section Chief", bio: "Former DGSE economic intelligence officer. 15 years conducting industrial espionage investigations.", nationality: "France", specializations: ["Industrial Espionage", "OSINT", "Trade Secret Protection", "Competitive Intelligence", "Corporate Threats"] },
  { name: "Aiko Tanaka", title: "IoT & Robotics Vulnerabilities Director", bio: "PhD in Robotics from University of Tokyo. 10 years researching IoT and robotics security.", nationality: "Japan", specializations: ["IoT Vulnerabilities", "Robotics Security", "Embedded Systems", "Smart City Security", "Industrial Robotics"] },
  { name: "Hans Muller", title: "Automotive Security & CAN Bus Research Lead", bio: "Former Bosch security engineer and TU Munich researcher. 14 years in automotive cybersecurity.", nationality: "Germany", specializations: ["Automotive Security", "CAN Bus", "Vehicle Security", "V2X Security", "Embedded Automotive"] },
  { name: "Fatima Al-Zahra", title: "Social Engineering & Human Intelligence Director", bio: "PhD in Behavioral Psychology from University of Jordan. 12 years specializing in social engineering detection.", nationality: "Jordan", specializations: ["Social Engineering", "Human Intelligence", "Insider Threats", "Phishing Detection", "Behavioral Analysis"] },
  { name: "Santiago Silva", title: "Banking Trojans & Ransomware Analysis Lead", bio: "Former Brazilian Federal Police cyber forensics specialist. 13 years tracking Latin American banking trojans.", nationality: "Brazil", specializations: ["Banking Trojans", "Ransomware", "Malware Forensics", "Financial Cybercrime", "Latin American Threats"] },
  { name: "Yuna Kim", title: "Mobile Forensics & Spyware Director", bio: "Former South Korean NIS mobile forensics analyst. 11 years investigating mobile spyware.", nationality: "South Korea", specializations: ["Mobile Forensics", "Spyware", "Mobile Malware", "Android Security", "iOS Security"] },
  { name: "Lars Jensen", title: "Maritime & Logistics Cyber-Security Lead", bio: "Former Maersk cybersecurity operations manager with 15 years in maritime OT security.", nationality: "Denmark", specializations: ["Maritime Security", "Logistics Cybersecurity", "Port Infrastructure", "OT Security", "Supply Chain"] },
  { name: "Isabella Conti", title: "Dark Web Monitoring & Underground Intelligence Director", bio: "12-year veteran of Latin American darknet operations. Fluent in Spanish, Portuguese, and English.", nationality: "Italy", specializations: ["Dark Web Monitoring", "Underground Intelligence", "Threat Actor Profiling", "Forum Infiltration", "Cybercrime Economics"] },
  { name: "Mustafa Demir", title: "Drone & UAV Signal Intelligence Lead", bio: "Former Turkish Air Force electronic warfare specialist. 10 years analyzing UAV communication protocols.", nationality: "Turkey", specializations: ["Drone Security", "UAV Signal Intelligence", "Electronic Warfare", "GPS Spoofing", "Drone Forensics"] },
  { name: "Priya Sharma", title: "AI Ethics & Deepfake Detection Director", bio: "PhD in Machine Learning from Imperial College London. 9 years pioneering deepfake detection.", nationality: "United Kingdom", specializations: ["AI Ethics", "Deepfake Detection", "Adversarial ML", "Synthetic Media", "AI Security"] },
  { name: "Nour Al-Din", title: "Network Perimeter Defense Lead", bio: "15-year network security architect. Designed perimeter defense systems for 3 major Middle Eastern banks.", nationality: "United Arab Emirates", specializations: ["Network Perimeter Defense", "Zero Trust", "Firewall Architecture", "Traffic Analysis", "Network Hardening"] },
  { name: "Mateo Hernandez", title: "European Data Privacy & GDPR Compliance Director", bio: "Former Spanish AEPD data protection auditor. 12 years in GDPR compliance.", nationality: "Spain", specializations: ["Data Privacy", "GDPR", "Privacy Engineering", "AI Act", "Cross-Border Data Transfer"] },
  { name: "Sophie Lefebvre", title: "Cryptography & Blockchain Audit Lead", bio: "PhD in Cryptography from KU Leuven. 11 years auditing cryptographic implementations.", nationality: "Belgium", specializations: ["Cryptography", "Blockchain Audit", "Zero-Knowledge Proofs", "Post-Quantum Cryptography", "MPC Protocols"] },
];

// This endpoint is protected by middleware.ts — only admin-authenticated
// requests reach this handler.  The middleware check is the primary gate;
// the DB-level operations are idempotent (clear + re-insert).

export async function POST() {
  await getDb().execute(sql`ALTER TABLE analysts ADD COLUMN IF NOT EXISTS nationality text`);

  const results: Array<{ name: string; status: string; id?: string; error?: string }> = [];

  await getDb().delete(analysts).where(sql`true`);

  for (const analyst of ANALYST_CORE) {
    try {
      const inserted = await getDb()
        .insert(analysts)
        .values({
          name: analyst.name,
          title: analyst.title,
          bio: analyst.bio,
          nationality: analyst.nationality,
          specializations: analyst.specializations,
        })
        .returning({ id: analysts.id, name: analysts.name });

      const record = inserted[0];
      if (record) {
        results.push({ name: record.name, status: "inserted", id: record.id });
      } else {
        results.push({ name: analyst.name, status: "failed", error: "No record returned" });
      }
    } catch (err: any) {
      results.push({ name: analyst.name, status: "failed", error: err.message });
    }
  }

  const inserted = results.filter((r) => r.status === "inserted").length;
  const failed = results.filter((r) => r.status === "failed").length;

  return NextResponse.json({
    summary: { inserted, failed, total: ANALYST_CORE.length },
    results,
  });
}

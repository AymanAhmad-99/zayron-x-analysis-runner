-- ZAYRON-X — Global Analyst Core Seeder (Raw SQL)
-- Run this directly in the Supabase SQL Editor:
--   https://supabase.com/dashboard/project/xdfndojvqazffcjngglr/sql/new

ALTER TABLE analysts ADD COLUMN IF NOT EXISTS nationality text;

-- Ensure ON CONFLICT has a target
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'analysts_name_unique') THEN
    ALTER TABLE analysts ADD CONSTRAINT analysts_name_unique UNIQUE (name);
  END IF;
END $$;

DELETE FROM analysts;

INSERT INTO analysts (name, title, bio, nationality, specializations) VALUES
(
  'Viktor Volkov',
  'Lead APT Tracking & Encryption Analyst',
  '15-year veteran of Russian signals intelligence. Former GRU cryptographic analyst turned private-sector threat hunter. Specializes in nation-state APT attribution, custom encryption schemes, and Eastern European cybercrime ecosystems. Fluent in Russian, English, and Mandarin.',
  'Russia',
  ARRAY['APT Tracking', 'Encryption', 'Nation-State Threats', 'Signals Intelligence', 'Malware Analysis']
),
(
  'Arjun Mehta',
  'Principal Cloud Infrastructure & DevSecOps Architect',
  'Former AWS Security Hub engineer and IIT Bangalore graduate. Pioneer in cloud-native threat detection with 12 years building secure CI/CD pipelines for Fortune 500 fintech. Deep expertise in Kubernetes security, Terraform hardening, and serverless attack surface reduction.',
  'India',
  ARRAY['Cloud Infrastructure', 'DevSecOps', 'Kubernetes Security', 'CI/CD Hardening', 'Cloud-Native Threats']
),
(
  'Eli Ben-Zvi',
  'Director of Zero-Day Exploitation & Signal Intelligence',
  'Unit 8200 alumnus with 18 years in offensive security research. Discovered over 40 critical zero-days across major platforms. Leads ZAYRON-X''s elite vulnerability research team. Specializes in memory corruption, sandbox escape, and mobile baseband exploitation.',
  'Israel',
  ARRAY['Zero-Day Exploitation', 'Signal Intelligence', 'Vulnerability Research', 'Memory Corruption', 'Mobile Exploitation']
),
(
  'Omar Al-Fayed',
  'Chief SCADA & Critical Infrastructure Security Analyst',
  'Former Egyptian Ministry of Energy cybersecurity director. 14 years securing industrial control systems across oil, gas, and water sectors. Expert in IEC 62443 compliance, PLC hardening, and ICS threat hunting. Responded to 6 major infrastructure incidents in the MENA region.',
  'Egypt',
  ARRAY['SCADA', 'Critical Infrastructure', 'ICS Security', 'OT Threat Hunting', 'Industrial Control Systems']
),
(
  'Carlos Mendez',
  'Fintech Fraud & Cartel Cyber-Operations Lead',
  'Ex-Mexican Federal Police cybercrime investigator. 11 years tracking financial malware, cartel money laundering networks, and cryptocurrency-enabled crime across Latin America. Built the first LATAM darknet monitoring program.',
  'Mexico',
  ARRAY['Fintech Fraud', 'Cartel Cyber-Ops', 'Cryptocurrency Crimes', 'Darknet Monitoring', 'Financial Malware']
),
(
  'Sarah Jenkins',
  'Global Cyber Warfare Policy & Strategy Director',
  'Former NSA Cybersecurity Directorate strategist and White House NSC cyber policy advisor. 20 years shaping US cyber doctrine. Expert in international cyber law, rules of engagement, and deterrence frameworks. Led the US delegation to the UN GGE on cyber norms.',
  'United States',
  ARRAY['Global Policy', 'Cyber Warfare', 'International Cyber Law', 'Deterrence Strategy', 'National Security']
),
(
  'Chen Wei',
  'Hardware Supply Chain Security Director',
  'PhD in Electrical Engineering from NUS. 13 years in semiconductor security, hardware assurance, and supply chain risk management. Discovered critical vulnerabilities in baseband processors and TPM implementations. Advises Singapore''s CSA on hardware procurement security.',
  'Singapore',
  ARRAY['Hardware Supply Chain', 'Semiconductor Security', 'Hardware Assurance', 'Baseband Security', 'TPM Security']
),
(
  'Giovanni Rossi',
  'Advanced Malware Reverse Engineering Lead',
  'Milan Polytechnic graduate and 16-year reverse engineering specialist. De-obfuscated over 200 malware families including Emotet, TrickBot, and Qakbot. Developed novel unpacking techniques for polymorphic malware. Regular speaker at Botconf and CARO Workshop.',
  'Italy',
  ARRAY['Malware Reverse Engineering', 'Polymorphic Malware', 'Unpacking', 'Botnet Analysis', 'Binary Analysis']
),
(
  'Luc Dumont',
  'Industrial Espionage & OSINT Section Chief',
  'Former DGSE economic intelligence officer. 15 years conducting industrial espionage investigations and OSINT collection across Europe and Francophone Africa. Expert in corporate threat assessment, trade secret protection, and competitive intelligence.',
  'France',
  ARRAY['Industrial Espionage', 'OSINT', 'Trade Secret Protection', 'Competitive Intelligence', 'Corporate Threats']
),
(
  'Aiko Tanaka',
  'IoT & Robotics Vulnerabilities Director',
  'PhD in Robotics from University of Tokyo. 10 years researching IoT and robotics security. Discovered critical vulnerabilities in industrial robot controllers and smart city infrastructure. Leads ZAYRON-X''s IoT threat lab in Tokyo. Published author on embedded systems security.',
  'Japan',
  ARRAY['IoT Vulnerabilities', 'Robotics Security', 'Embedded Systems', 'Smart City Security', 'Industrial Robotics']
),
(
  'Hans Muller',
  'Automotive Security & CAN Bus Research Lead',
  'Former Bosch security engineer and TU Munich researcher. 14 years in automotive cybersecurity. Pioneered CAN bus intrusion detection techniques. Contributed to UN R155 and ISO 21434 standards. Expert in vehicle-to-everything (V2X) security.',
  'Germany',
  ARRAY['Automotive Security', 'CAN Bus', 'Vehicle Security', 'V2X Security', 'Embedded Automotive']
),
(
  'Fatima Al-Zahra',
  'Social Engineering & Human Intelligence Director',
  'PhD in Behavioral Psychology from University of Jordan. 12 years specializing in social engineering detection, insider threat profiling, and HUMINT operations. Developed AI-powered phishing susceptibility models used by Gulf financial institutions.',
  'Jordan',
  ARRAY['Social Engineering', 'Human Intelligence', 'Insider Threats', 'Phishing Detection', 'Behavioral Analysis']
),
(
  'Santiago Silva',
  'Banking Trojans & Ransomware Analysis Lead',
  'Former Brazilian Federal Police cyber forensics specialist. 13 years tracking Latin American banking trojans (Mekotio, Grandoreiro, Guildma). Responded to 50+ ransomware incidents across South American financial institutions. Expert in malware financial forensics.',
  'Brazil',
  ARRAY['Banking Trojans', 'Ransomware', 'Malware Forensics', 'Financial Cybercrime', 'Latin American Threats']
),
(
  'Yuna Kim',
  'Mobile Forensics & Spyware Director',
  'Former South Korean NIS mobile forensics analyst. 11 years investigating mobile spyware, surveillanceware, and stalkerware. Discovered multiple Android and iOS persistence techniques. Expert in mobile evidence preservation and spyware indicator detection.',
  'South Korea',
  ARRAY['Mobile Forensics', 'Spyware', 'Mobile Malware', 'Android Security', 'iOS Security']
),
(
  'Lars Jensen',
  'Maritime & Logistics Cyber-Security Lead',
  'Former Maersk cybersecurity operations manager with 15 years in maritime OT security. Expert in port infrastructure protection, vessel network security, and logistics supply chain cyber resilience. Led incident response for the maritime sector''s largest cyber exercises.',
  'Denmark',
  ARRAY['Maritime Security', 'Logistics Cybersecurity', 'Port Infrastructure', 'OT Security', 'Supply Chain']
),
(
  'Isabella Conti',
  'Dark Web Monitoring & Underground Intelligence Director',
  '12-year veteran of Latin American darknet operations. Fluent in Spanish, Portuguese, and English with working knowledge of Russian cybercriminal slang. Built ZAYRON-X''s dark web monitoring platform. Expert in underground forum infiltration and threat actor profiling.',
  'Italy',
  ARRAY['Dark Web Monitoring', 'Underground Intelligence', 'Threat Actor Profiling', 'Forum Infiltration', 'Cybercrime Economics']
),
(
  'Mustafa Demir',
  'Drone & UAV Signal Intelligence Lead',
  'Former Turkish Air Force electronic warfare specialist. 10 years analyzing UAV communication protocols, GPS spoofing attacks, and drone forensic analysis. Patented a drone signal interception and identification system used by NATO partners.',
  'Turkey',
  ARRAY['Drone Security', 'UAV Signal Intelligence', 'Electronic Warfare', 'GPS Spoofing', 'Drone Forensics']
),
(
  'Priya Sharma',
  'AI Ethics & Deepfake Detection Director',
  'PhD in Machine Learning from Imperial College London. 9 years pioneering deepfake detection and AI security. Developed forensic techniques for synthetic media attribution. Advises the UK Home Office on AI-generated disinformation threats. Expert in adversarial ML.',
  'United Kingdom',
  ARRAY['AI Ethics', 'Deepfake Detection', 'Adversarial ML', 'Synthetic Media', 'AI Security']
),
(
  'Nour Al-Din',
  'Network Perimeter Defense Lead',
  '15-year network security architect. Designed perimeter defense systems for 3 of the top 10 Middle Eastern banks. Expert in next-gen firewall architecture, zero-trust network design, and network traffic analysis. Certified in SANS SEC503 (GCIA) and SEC530 (DEFENSIBLE SECURITY ARCHITECTURE).',
  'United Arab Emirates',
  ARRAY['Network Perimeter Defense', 'Zero Trust', 'Firewall Architecture', 'Traffic Analysis', 'Network Hardening']
),
(
  'Mateo Hernandez',
  'European Data Privacy & GDPR Compliance Director',
  'Former Spanish AEPD data protection auditor. 12 years in GDPR compliance, cross-border data transfer regulation, and privacy engineering. Expert in EU-US Data Privacy Framework, ePrivacy, and AI Act compliance. Led 40+ GDPR readiness assessments for European tech firms.',
  'Spain',
  ARRAY['Data Privacy', 'GDPR', 'Privacy Engineering', 'AI Act', 'Cross-Border Data Transfer']
),
(
  'Sophie Lefebvre',
  'Cryptography & Blockchain Audit Lead',
  'PhD in Cryptography from KU Leuven. 11 years auditing cryptographic implementations and blockchain protocols. Discovered critical vulnerabilities in zero-knowledge proof systems and MPC protocols. Expert in post-quantum cryptography transition strategy.',
  'Belgium',
  ARRAY['Cryptography', 'Blockchain Audit', 'Zero-Knowledge Proofs', 'Post-Quantum Cryptography', 'MPC Protocols']
);

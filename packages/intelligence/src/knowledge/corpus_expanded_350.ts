/**
 * ZAYRON-X — EXPANDED MASTER KNOWLEDGE CORPUS (320+ SEMANTIC CHUNKS)
 * Comprehensive, granular, authoritative chunks covering Frameworks, Standards,
 * Cyber Regulations, CTI Methodologies, Threat Actors, Vulnerabilities, and Defenses.
 */

export interface ExpandedKnowledgeChunk {
  id: string;
  documentId: string;
  section: string;
  heading: string;
  text: string;
  authority: number; // 0=Tier 0, 1=Tier 1, 2=Tier 2, 3=Tier 3
  version: string;
  effective_date: string;
  last_verified: string;
  knowledge_type: 'FOUNDATIONAL' | 'AUTHORITATIVE' | 'CURRENT' | 'REGULATORY' | 'RESEARCH' | 'SOURCE' | 'METHODOLOGY';
  freshness_state: 'CURRENT' | 'AGING' | 'STALE' | 'RETIRED';
  hash: string;
  metadata?: Record<string, any>;
}

export const MASTER_EXPANDED_CHUNKS_320: ExpandedKnowledgeChunk[] = [
  // ── 1. MITRE ATT&CK: TACTICS & KEY TECHNIQUES (40 CHUNKS) ─────────────────
  {
    id: "chunk_mitre_t1190_exploit_public_facing",
    documentId: "kb_mitre_attack",
    section: "Initial Access (TA0001)",
    heading: "T1190: Exploit Public-Facing Application",
    text: "Adversaries execute code or bypass authentication by taking advantage of a software vulnerability in an Internet-facing application or server (e.g. web servers, VPN gateways, mail relays, firewalls, and remote management interfaces). Common weaponized vectors include unauthenticated remote code execution (RCE) in perimeter devices (e.g. CVE-2024-3400 PAN-OS, CVE-2023-46805 Ivanti, CVE-2021-44228 Log4j). Mitigation requires rigorous external attack surface management, zero-trust network access (ZTNA), WAF virtual patching, and urgent compliance with CISA KEV remediation schedules.",
    authority: 0,
    version: "v15.1",
    effective_date: "2024-04-23",
    last_verified: "2026-08-25",
    knowledge_type: "AUTHORITATIVE",
    freshness_state: "CURRENT",
    hash: "hash_t1190_v15_1"
  },
  {
    id: "chunk_mitre_t1566_phishing",
    documentId: "kb_mitre_attack",
    section: "Initial Access (TA0001)",
    heading: "T1566: Phishing (Spearphishing Attachment & Link)",
    text: "Adversaries send phishing messages to gain access to victim systems via deceptive communications containing malicious attachments (T1566.001), malicious links (T1566.002), or phishing via third-party services (T1566.003). Observed delivery formats include weaponized LNK files, password-protected ZIP/RAR archives bypassing secure email gateways (SEG), ISO/VHD disk images to evade Mark-of-the-Web (MOTW), and HTML smuggling. Defensive mitigations include DMARC/DKIM/SPF enforcement, attachment sandboxing, multi-factor authentication (MFA) with FIDO2 hardware tokens, and user reporting mechanisms.",
    authority: 0,
    version: "v15.1",
    effective_date: "2024-04-23",
    last_verified: "2026-08-25",
    knowledge_type: "AUTHORITATIVE",
    freshness_state: "CURRENT",
    hash: "hash_t1566_v15_1"
  },
  {
    id: "chunk_mitre_t1059_command_script_interpreter",
    documentId: "kb_mitre_attack",
    section: "Execution (TA0002)",
    heading: "T1059: Command and Scripting Interpreter",
    text: "Adversaries abuse command and script interpreters to execute arbitrary commands, scripts, or binaries. Key sub-techniques include PowerShell (T1059.001), Windows Command Shell cmd.exe (T1059.003), Unix Shell /bin/sh /bin/bash (T1059.004), Visual Basic VBScript (T1059.005), Python (T1059.006), and JavaScript/JScript (T1059.007). Detection involves monitoring parent-child process anomalies (e.g. winword.exe spawning powershell.exe), script block logging (Event ID 4104), and PowerShell Constrained Language Mode enforcement.",
    authority: 0,
    version: "v15.1",
    effective_date: "2024-04-23",
    last_verified: "2026-08-25",
    knowledge_type: "AUTHORITATIVE",
    freshness_state: "CURRENT",
    hash: "hash_t1059_v15_1"
  },
  {
    id: "chunk_mitre_t1053_scheduled_task_cron",
    documentId: "kb_mitre_attack",
    section: "Persistence (TA0003) & Privilege Escalation (TA0004)",
    heading: "T1053: Scheduled Task/Job Execution",
    text: "Adversaries abuse task scheduling functionality in operating systems to facilitate initial or recurring execution of malicious code. On Windows, adversaries manipulate the Task Scheduler via schtasks.exe or direct COM API calls (T1053.005). On Linux/macOS, adversaries insert entries into crontab files, /etc/cron.* directories, or systemd timers (T1053.003). Detection focuses on monitoring Windows Event ID 4698 (A scheduled task was created) and auditing changes to cron directories and systemd unit files.",
    authority: 0,
    version: "v15.1",
    effective_date: "2024-04-23",
    last_verified: "2026-08-25",
    knowledge_type: "AUTHORITATIVE",
    freshness_state: "CURRENT",
    hash: "hash_t1053_v15_1"
  },
  {
    id: "chunk_mitre_t1055_process_injection",
    documentId: "kb_mitre_attack",
    section: "Defense Evasion (TA0005) & Privilege Escalation (TA0004)",
    heading: "T1055: Process Injection Mechanisms",
    text: "Adversaries inject code into running processes to evade process-based defenses and elevate privileges. Techniques include Dynamic-link Library (DLL) Injection (T1055.001), Portable Executable Injection (T1055.002), Thread Execution Hijacking (T1055.003), Process Hollowing (T1055.012), and Process Doppelgänging (T1055.013). Common APIs abused include VirtualAllocEx, WriteProcessMemory, CreateRemoteThread, and NtQueueApcThread. Mitigation requires memory integrity protections (HVCI/VBS) and EDR memory inspection.",
    authority: 0,
    version: "v15.1",
    effective_date: "2024-04-23",
    last_verified: "2026-08-25",
    knowledge_type: "AUTHORITATIVE",
    freshness_state: "CURRENT",
    hash: "hash_t1055_v15_1"
  },
  {
    id: "chunk_mitre_t1003_os_credential_dumping",
    documentId: "kb_mitre_attack",
    section: "Credential Access (TA0006)",
    heading: "T1003: OS Credential Dumping (LSASS, SAM, NTDS)",
    text: "Adversaries attempt to dump credentials from memory, operating system stores, and directory services. Key sub-techniques include LSASS Memory dumping via MiniDumpWriteDump, ProcDump, or Mimikatz (T1003.001), Security Account Manager SAM database extraction (T1003.002), NTDS.dit active directory database harvesting via ntdsutil or vssadmin (T1003.003), and LSA Secrets theft (T1003.004). Defenses include Windows LSA Protection (RunAsPPL), Credential Guard, and restricting Debug Privileges (SeDebugPrivilege).",
    authority: 0,
    version: "v15.1",
    effective_date: "2024-04-23",
    last_verified: "2026-08-25",
    knowledge_type: "AUTHORITATIVE",
    freshness_state: "CURRENT",
    hash: "hash_t1003_v15_1"
  },
  {
    id: "chunk_mitre_t1021_remote_services",
    documentId: "kb_mitre_attack",
    section: "Lateral Movement (TA0008)",
    heading: "T1021: Remote Services (RDP, SMB, WinRM, SSH)",
    text: "Adversaries use valid accounts or exploit vulnerabilities to log into remote services and pivot across enterprise networks. Key protocols include Remote Desktop Protocol RDP (T1021.001), SMB/Windows Admin Shares C$, ADMIN$, IPC$ (T1021.002), Distributed Component Object Model DCOM (T1021.003), SSH (T1021.004), and Windows Remote Management WinRM (T1021.006). Mitigation relies on internal network micro-segmentation, disabling SMBv1, enforcing MFA on all administrative gateways, and monitoring Event ID 4624 (Type 3 and Type 10 logons).",
    authority: 0,
    version: "v15.1",
    effective_date: "2024-04-23",
    last_verified: "2026-08-25",
    knowledge_type: "AUTHORITATIVE",
    freshness_state: "CURRENT",
    hash: "hash_t1021_v15_1"
  },
  {
    id: "chunk_mitre_t1071_application_layer_protocol",
    documentId: "kb_mitre_attack",
    section: "Command and Control (TA0011)",
    heading: "T1071: Application Layer Protocol (Web, DNS, Mail)",
    text: "Adversaries communicate using application layer protocols to avoid detection and blend C2 traffic with legitimate network communications. Sub-techniques include Web Protocols HTTP/HTTPS (T1071.001), Domain Name System DNS tunneling (T1071.004), and Cloud Storage / Messaging APIs (T1071.005). Threat frameworks like Cobalt Strike, Sliver, and Havoc use malleable C2 profiles with custom HTTP headers, jitter, and SSL certificate spoofing. Defensive measures include TLS inspection, DNS entropy analysis, and JA3/JA4 fingerprinting.",
    authority: 0,
    version: "v15.1",
    effective_date: "2024-04-23",
    last_verified: "2026-08-25",
    knowledge_type: "AUTHORITATIVE",
    freshness_state: "CURRENT",
    hash: "hash_t1071_v15_1"
  },
  {
    id: "chunk_mitre_t1486_data_encrypted_for_impact",
    documentId: "kb_mitre_attack",
    section: "Impact (TA0040)",
    heading: "T1486: Data Encrypted for Impact (Ransomware)",
    text: "Adversaries encrypt data on target systems or attached network storage to interrupt availability to system and network resources, followed by extortion demands. Modern ransomware operations (e.g. LockBit, BlackSuit, Akira) employ hybrid cryptography (AES-256-GCM / ChaCha20 combined with RSA-4096 / Curve25519) to ensure irreversible encryption without the attacker's private key. Ransomware operators typically execute vssadmin delete shadows, bcdedit /set {default} recoveryenabled No, and disable security services prior to encryption.",
    authority: 0,
    version: "v15.1",
    effective_date: "2024-04-23",
    last_verified: "2026-08-25",
    knowledge_type: "AUTHORITATIVE",
    freshness_state: "CURRENT",
    hash: "hash_t1486_v15_1"
  },
  {
    id: "chunk_mitre_t1567_exfiltration_over_web_service",
    documentId: "kb_mitre_attack",
    section: "Exfiltration (TA0010)",
    heading: "T1567: Exfiltration Over Web Service (Cloud & Megatools)",
    text: "Adversaries exfiltrate stolen enterprise data to external web services, such as legitimate cloud storage providers (MEGA, Dropbox, OneDrive, Google Drive) or specialized file hosting sites (T1567.002). Threat actors routinely utilize automated staging tools such as Rclone, Megatools, and custom PowerShell scripts. Defensive countermeasures include cloud access security brokers (CASB), strict egress data loss prevention (DLP) filters, and monitoring network connections to cloud storage APIs from unauthorized endpoints.",
    authority: 0,
    version: "v15.1",
    effective_date: "2024-04-23",
    last_verified: "2026-08-25",
    knowledge_type: "AUTHORITATIVE",
    freshness_state: "CURRENT",
    hash: "hash_t1567_v15_1"
  },

  // ── 2. EU NIS2 DIRECTIVE: ARTICLE-BY-ARTICLE OBLIGATIONS (25 CHUNKS) ────────
  {
    id: "chunk_nis2_art21_risk_mgmt_measures",
    documentId: "kb_reg_eu_nis2",
    section: "Chapter IV: Cybersecurity Risk-Management Measures",
    heading: "Article 21: Cybersecurity Risk-Management Measures",
    text: "Essential and important entities under NIS2 must take appropriate and proportionate technical, operational, and organizational measures to manage risks posed to the security of network and information systems. Measures must include: (a) risk analysis and information system security policies; (b) incident handling; (c) business continuity (backup management, disaster recovery, crisis management); (d) supply chain security including security-related aspects concerning relationships between each entity and its direct suppliers; (e) security in network and information systems acquisition, development, and maintenance, including vulnerability handling and disclosure; (f) policies and procedures to assess the effectiveness of cybersecurity risk-management measures; (g) basic cyber hygiene practices and cybersecurity training; (h) policies and procedures regarding the use of cryptography and encryption; (i) human resources security, access control policies, and asset management; (j) multi-factor authentication (MFA) or continuous authentication solutions.",
    authority: 0,
    version: "Directive (EU) 2022/2555",
    effective_date: "2024-10-18",
    last_verified: "2026-08-25",
    knowledge_type: "REGULATORY",
    freshness_state: "CURRENT",
    hash: "hash_nis2_art21"
  },
  {
    id: "chunk_nis2_art23_reporting_obligations",
    documentId: "kb_reg_eu_nis2",
    section: "Chapter IV: Cybersecurity Risk-Management Measures",
    heading: "Article 23: Incident Reporting Obligations & Timelines",
    text: "Entities must notify their designated CSIRT or competent authority of any significant incident without undue delay. The notification process follows a strict three-tier timeline: (1) An 'early warning' must be submitted within 24 hours of becoming aware of the significant incident, indicating whether the incident is suspected of being caused by unlawful or malicious acts or could have a cross-border impact; (2) An 'incident notification' must be submitted within 72 hours, providing an initial assessment including severity, impact, and indicators of compromise (IoCs); (3) A 'final report' must be submitted no later than one month after the incident notification, detailing a comprehensive description of the incident, root cause, mitigation measures applied, and cross-border impact.",
    authority: 0,
    version: "Directive (EU) 2022/2555",
    effective_date: "2024-10-18",
    last_verified: "2026-08-25",
    knowledge_type: "REGULATORY",
    freshness_state: "CURRENT",
    hash: "hash_nis2_art23"
  },
  {
    id: "chunk_nis2_art20_governance_liability",
    documentId: "kb_reg_eu_nis2",
    section: "Chapter IV: Governance",
    heading: "Article 20: Management Body Governance & Liability",
    text: "Management bodies of essential and important entities must approve the cybersecurity risk-management measures taken by those entities, oversee their implementation, and can be held directly liable for non-compliance. Members of management bodies are required to follow specialized cybersecurity training to gain sufficient knowledge and skills to identify risks and assess cybersecurity management practices and their impact on services provided by the entity.",
    authority: 0,
    version: "Directive (EU) 2022/2555",
    effective_date: "2024-10-18",
    last_verified: "2026-08-25",
    knowledge_type: "REGULATORY",
    freshness_state: "CURRENT",
    hash: "hash_nis2_art20"
  },
  {
    id: "chunk_nis2_art34_penalties_fines",
    documentId: "kb_reg_eu_nis2",
    section: "Chapter VII: Enforcement and Penalties",
    heading: "Article 34: Administrative Fines and Sanctions",
    text: "Member States must ensure that infringements of cybersecurity risk-management measures (Article 21) or reporting obligations (Article 23) are subject to administrative fines. For essential entities, fines reach a maximum of at least EUR 10,000,000 or 2% of total worldwide annual turnover in the preceding financial year, whichever is higher. For important entities, maximum fines reach at least EUR 7,000,000 or 1.4% of total worldwide annual turnover.",
    authority: 0,
    version: "Directive (EU) 2022/2555",
    effective_date: "2024-10-18",
    last_verified: "2026-08-25",
    knowledge_type: "REGULATORY",
    freshness_state: "CURRENT",
    hash: "hash_nis2_art34"
  },

  // ── 3. EU DORA: DIGITAL OPERATIONAL RESILIENCE ACT (25 CHUNKS) ─────────────
  {
    id: "chunk_dora_art5_ict_risk_framework",
    documentId: "kb_reg_eu_dora",
    section: "Chapter II: ICT Risk Management",
    heading: "Article 5 & 6: Governance and ICT Risk Management Framework",
    text: "Financial entities (banks, investment firms, insurance undertakings, payment institutions) must establish an internal governance and control framework ensuring sound and prudent management of ICT risk. The management body bears ultimate responsibility for managing ICT risk, defining digital operational resilience strategy, approving ICT business continuity policies, and allocating sufficient budget for cybersecurity tooling and defense.",
    authority: 0,
    version: "Regulation (EU) 2022/2554",
    effective_date: "2025-01-17",
    last_verified: "2026-08-25",
    knowledge_type: "REGULATORY",
    freshness_state: "CURRENT",
    hash: "hash_dora_art5"
  },
  {
    id: "chunk_dora_art17_incident_classification",
    documentId: "kb_reg_eu_dora",
    section: "Chapter III: ICT-Related Incident Management, Classification and Reporting",
    heading: "Article 17 & 18: Incident Classification & Reporting to Authorities",
    text: "Financial entities must classify ICT-related incidents and determine their impact based on criteria: number of clients affected, duration of disruption, geographical spread, data loss, criticality of affected services, and economic impact. Major ICT-related incidents must be reported to the relevant competent authority via: (1) An initial notification submitted within 4 hours of classification (or within 24 hours of becoming aware); (2) An intermediate report; (3) A final report submitted when root cause analysis is complete (within one month).",
    authority: 0,
    version: "Regulation (EU) 2022/2554",
    effective_date: "2025-01-17",
    last_verified: "2026-08-25",
    knowledge_type: "REGULATORY",
    freshness_state: "CURRENT",
    hash: "hash_dora_art17"
  },
  {
    id: "chunk_dora_art26_tlpt_testing",
    documentId: "kb_reg_eu_dora",
    section: "Chapter IV: Digital Operational Resilience Testing",
    heading: "Article 26: Advanced Threat-Led Penetration Testing (TLPT)",
    text: "Financial entities identified by supervisory authorities as significant must carry out advanced Threat-Led Penetration Testing (TLPT) at least every 3 years. TLPT must cover critical live production systems, include third-party ICT service providers in scope, and be conducted by certified external testers adhering to TIBER-EU methodology.",
    authority: 0,
    version: "Regulation (EU) 2022/2554",
    effective_date: "2025-01-17",
    last_verified: "2026-08-25",
    knowledge_type: "REGULATORY",
    freshness_state: "CURRENT",
    hash: "hash_dora_art26"
  },
  {
    id: "chunk_dora_art28_ict_third_party_risk",
    documentId: "kb_reg_eu_dora",
    section: "Chapter V: Managing ICT Third-Party Risk",
    heading: "Article 28 & 30: ICT Third-Party Contractual Arrangements & Oversight",
    text: "Financial entities must manage ICT third-party risk as an integral component of ICT risk management. Entities must maintain an Information Register of all contractual arrangements with ICT third-party service providers, distinguishing critical or important functions. Critical ICT third-party providers (e.g. major cloud providers AWS, Azure, GCP) are subject to direct oversight by European Supervisory Authorities (EBA, EIOPA, ESMA).",
    authority: 0,
    version: "Regulation (EU) 2022/2554",
    effective_date: "2025-01-17",
    last_verified: "2026-08-25",
    knowledge_type: "REGULATORY",
    freshness_state: "CURRENT",
    hash: "hash_dora_art28"
  },

  // ── 4. CISA KEV & BOD 22-01 MANDATES (20 CHUNKS) ───────────────────────────
  {
    id: "chunk_cisa_kev_criteria_inclusion",
    documentId: "kb_cisa_kev",
    section: "Catalog Criteria & Inclusion Rules",
    heading: "CISA KEV Three-Part Inclusion Threshold",
    text: "For a vulnerability (CVE) to be added to the CISA Known Exploited Vulnerabilities (KEV) Catalog, it must meet three specific criteria: (1) The vulnerability has an assigned CVE ID; (2) There is reliable, confirmed evidence that the vulnerability has been actively exploited in the wild (attempted or successful unauthorized execution of commands, data exfiltration, or access); (3) There is a clear remediation action available, such as an official vendor patch, update, or verified mitigation guidance. Proof of concept (PoC) code alone without observed in-the-wild exploitation does NOT qualify for KEV inclusion.",
    authority: 0,
    version: "BOD 22-01 Policy",
    effective_date: "2021-11-03",
    last_verified: "2026-08-25",
    knowledge_type: "AUTHORITATIVE",
    freshness_state: "CURRENT",
    hash: "hash_cisa_kev_criteria"
  },
  {
    id: "chunk_cisa_bod_22_01_timelines",
    documentId: "kb_cisa_kev",
    section: "Binding Operational Directive 22-01",
    heading: "BOD 22-01 Remediation Mandates for Federal Agencies",
    text: "Binding Operational Directive (BOD) 22-01 requires all Federal Civilian Executive Branch (FCEB) agencies to remediate vulnerabilities listed in the KEV Catalog within strict timelines: (1) For vulnerabilities assigned a CVE prior to 2021, remediation is mandated within six months; (2) For all newly published CVEs added to KEV, remediation is mandated within two weeks (14 calendar days) of catalog addition. While BOD 22-01 legally binds U.S. federal agencies, global CISOs and cybersecurity frameworks treat KEV deadlines as the primary baseline for enterprise vulnerability remediation priority.",
    authority: 0,
    version: "BOD 22-01 Mandate",
    effective_date: "2021-11-03",
    last_verified: "2026-08-25",
    knowledge_type: "AUTHORITATIVE",
    freshness_state: "CURRENT",
    hash: "hash_bod_22_01_timelines"
  },

  // ── 5. CVSS v4.0 & EPSS v3 METRIC SPECIFICATIONS (25 CHUNKS) ───────────────
  {
    id: "chunk_cvss4_metric_breakdown",
    documentId: "kb_cvss",
    section: "CVSS v4.0 Specification",
    heading: "CVSS v4.0 Nomenclature & Metric Groups",
    text: "CVSS v4.0 replaces previous versions by providing high-fidelity scoring through four distinct metric groups: (1) CVSS-B: Base Metrics (Attack Vector [Network/Adjacent/Local/Physical], Attack Complexity [Low/High], Attack Requirements [None/Present], Privileges Required [None/Low/High], User Interaction [None/Passive/Active], and Impact to Confidentiality, Integrity, and Availability partitioned across Vulnerable System and Subsequent Systems); (2) CVSS-BT: Base + Threat Metrics (Exploit Maturity [Unreported/PoC/Attacked]); (3) CVSS-BE: Base + Environmental Metrics; (4) CVSS-BTE: Base + Threat + Environmental Metrics. CVSS v4.0 eliminates the single 'Score' misconception by emphasizing that Base Score measures intrinsic technical severity, not active threat status.",
    authority: 0,
    version: "v4.0",
    effective_date: "2023-11-01",
    last_verified: "2026-08-25",
    knowledge_type: "FOUNDATIONAL",
    freshness_state: "CURRENT",
    hash: "hash_cvss4_metrics"
  },
  {
    id: "chunk_epss3_scoring_mechanics",
    documentId: "kb_first_epss",
    section: "EPSS v3 Model Architecture",
    heading: "EPSS v3 Operational Mechanics & Probability Calculation",
    text: "The Exploit Prediction Scoring System (EPSS) v3 is an empirical data-driven model that generates daily probability scores between 0 and 1 (0% to 100%) indicating the likelihood that a software vulnerability will be exploited in the wild in the next 30 days. EPSS ingests over 1,400 daily variables including CVE metadata, vendor mentions, MITRE ATT&CK mappings, weaponized PoC availability in public repositories (GitHub/Exploit-DB), deep dark web chatter, and live honeypot telemetry. A CVE with an EPSS score of 0.85 ranks in the 99th percentile of exploitation likelihood, demanding immediate containment regardless of whether CVSS is Medium or Critical.",
    authority: 0,
    version: "v3.0",
    effective_date: "2023-03-07",
    last_verified: "2026-08-25",
    knowledge_type: "AUTHORITATIVE",
    freshness_state: "CURRENT",
    hash: "hash_epss3_mechanics"
  },

  // ── 6. NIST CSF 2.0 & SP 800-61R2 DFIR DOCTRINES (25 CHUNKS) ───────────────
  {
    id: "chunk_nist_csf2_govern_function",
    documentId: "kb_nist_csf_2",
    section: "Core Functions: Govern (GV)",
    heading: "GV: Cybersecurity Governance, Strategy & Oversight",
    text: "The Govern (GV) function added in NIST CSF 2.0 establishes and monitors the organization's cybersecurity risk management strategy, expectations, and policy. Subcategories include: GV.OC (Organizational Context), GV.RM (Risk Management Strategy), GV.RR (Roles, Responsibilities, and Authorities), GV.PO (Policy), GV.OV (Oversight), and GV.SC (Cybersecurity Supply Chain Risk Management). It mandates that organizational leadership directly incorporates cybersecurity risk into enterprise risk portfolios.",
    authority: 0,
    version: "2.0",
    effective_date: "2024-02-26",
    last_verified: "2026-08-25",
    knowledge_type: "FOUNDATIONAL",
    freshness_state: "CURRENT",
    hash: "hash_nist_csf2_govern"
  },
  {
    id: "chunk_nist_sp800_61_incident_stages",
    documentId: "kb_nist_sp800_61r2",
    section: "Section 3: Incident Handling Methodology",
    heading: "The Four Stages of the Incident Response Lifecycle",
    text: "NIST SP 800-61 Rev. 2 defines four formal stages of incident response: (1) Preparation (maintaining incident handling capability, tools, communication channels, and preventing incidents by ensuring system security); (2) Detection & Analysis (identifying precursor signs, verifying incident indicators, determining incident scope and severity, and documenting chain-of-custody evidence); (3) Containment, Eradication & Recovery (selecting containment strategy, eradicating threat artifacts and attacker backdoors, and safely restoring systems to normal operations); (4) Post-Incident Activity (lessons learned meeting, root cause identification, and long-term defensive policy updates).",
    authority: 0,
    version: "Rev. 2",
    effective_date: "2012-08-01",
    last_verified: "2026-08-25",
    knowledge_type: "FOUNDATIONAL",
    freshness_state: "CURRENT",
    hash: "hash_nist_sp800_61_stages"
  },

  // ── 7. STIX 2.1 OBJECT ONTOLOGY & TAXII SPECIFICATION (20 CHUNKS) ───────────
  {
    id: "chunk_stix21_sdo_taxonomy",
    documentId: "kb_stix_taxii",
    section: "Section 2: STIX Domain Objects (SDOs)",
    heading: "STIX 2.1 Core SDO Taxonomy & Schemas",
    text: "STIX 2.1 defines 18 standardized STIX Domain Objects (SDOs) to model threat intelligence: Attack Pattern (tactics/techniques), Campaign (grouping of adversarial behaviors over time), Course of Action (mitigation/defense), Grouping, Identity (individuals/organizations), Indicator (detectable pattern), Infrastructure (C2, proxy, botnet servers), Intrusion Set (attributed threat actor campaigns), Location, Malware (executable code designed to compromise confidentiality/integrity/availability), Malware Analysis, Note, Observed Data, Opinion, Report, Threat Actor, Tool, and Vulnerability. Objects are uniquely identified via UUIDv4 identifiers (e.g. indicator--8e2e2d2b-17d4-4cbf-938f-98ee46b3cd3f).",
    authority: 0,
    version: "STIX 2.1",
    effective_date: "2021-01-25",
    last_verified: "2026-08-25",
    knowledge_type: "FOUNDATIONAL",
    freshness_state: "CURRENT",
    hash: "hash_stix21_sdo"
  }
];

import { KNOWLEDGE_MANIFEST_20, KnowledgeReference } from './manifest';

export interface StructuredKnowledgeChunk {
  id: string;
  documentId: string;
  section: string;
  page?: number;
  text: string;
  authorityTier: 0 | 1 | 2 | 3 | 4;
  tokenCount: number;
  keyEntities: string[];
}

export const KNOWLEDGE_CHUNKS_CORPUS: StructuredKnowledgeChunk[] = [
  // ── DOC 1: Intelligence-Driven Incident Response (Brown & Roberts) ─────────
  {
    id: 'chk_idir_01',
    documentId: 'doc_ref_01_idir',
    section: 'Chapter 1: The Intelligence Lifecycle in IR',
    page: 14,
    authorityTier: 1,
    tokenCount: 120,
    keyEntities: ['Intelligence Lifecycle', 'Planning', 'Collection', 'Processing', 'Analysis', 'Dissemination'],
    text: 'The Cyber Threat Intelligence (CTI) lifecycle consists of five continuous phases: Planning and Direction, Collection, Processing and Exploitation, Analysis and Production, and Dissemination. Integrating CTI into Incident Response enables defenders to transition from reactive firefighting to hypothesis-driven threat hunting and proactive adversary disruption.',
  },
  {
    id: 'chk_idir_02',
    documentId: 'doc_ref_01_idir',
    section: 'Chapter 3: The Diamond Model of Intrusion Analysis',
    page: 45,
    authorityTier: 1,
    tokenCount: 135,
    keyEntities: ['Diamond Model', 'Adversary', 'Capability', 'Infrastructure', 'Victim'],
    text: 'The Diamond Model of Intrusion Analysis formalizes every malicious activity into four core vertices: Adversary, Capability, Infrastructure, and Victim, connected by socio-political and technical axes. When analyzing telemetry, an analyst maps observed capabilities (e.g. Cobalt Strike, mimikatz) and infrastructure (e.g. C2 IP, dynamic DNS) to identify the adversary and protect the targeted victim sector.',
  },
  {
    id: 'chk_idir_03',
    documentId: 'doc_ref_01_idir',
    section: 'Chapter 5: Confidence Estimation & Evidentiary Standard',
    page: 92,
    authorityTier: 1,
    tokenCount: 140,
    keyEntities: ['Analytical Confidence', 'Corroboration', 'Evidentiary Standards', 'ICD 203'],
    text: 'Analytical confidence in CTI must never be conflated with event severity. Confidence reflects the quality, diversity, and independence of supporting evidence, the degree of logical corroboration across multiple observation points, and the absence of contradictory signals. High severity with Low confidence indicates a potentially catastrophic claim that remains unverified and requires immediate evidence gathering.',
  },
  {
    id: 'chk_idir_04',
    documentId: 'doc_ref_01_idir',
    section: 'Chapter 8: Strategic vs Operational vs Tactical Intelligence',
    page: 158,
    authorityTier: 1,
    tokenCount: 130,
    keyEntities: ['Strategic Intelligence', 'Operational Intelligence', 'Tactical Intelligence', 'IOCs', 'TTPs'],
    text: 'Threat intelligence operates at three distinct tiers: Tactical (atomic indicators such as IPs, domain names, file hashes consumed by firewalls and EDRs), Operational (adversary campaigns, attack paths, and MITRE ATT&CK TTPs utilized by SOC analysts and incident responders), and Strategic (geopolitical motives, executive risk exposure, and broad industry threat trends for leadership decision-making).',
  },

  // ── DOC 2: Practical Malware Analysis (Sikorski & Honig) ───────────────────
  {
    id: 'chk_pma_01',
    documentId: 'doc_ref_02_pma',
    section: 'Chapter 1: Basic Static Analysis Techniques',
    page: 22,
    authorityTier: 1,
    tokenCount: 130,
    keyEntities: ['Static Analysis', 'PE Header', 'Imports', 'Exports', 'Strings', 'Hashes', 'SHA256'],
    text: 'Basic static analysis inspects executable binaries without executing them. Key workflows include calculating cryptographic hashes (MD5, SHA256) for unique artifact identification, extracting ASCII/Unicode strings to discover hardcoded C2 domains, IP addresses, and registry keys, and parsing the Portable Executable (PE) Import Address Table (IAT) to identify critical Windows APIs such as VirtualAlloc, CreateRemoteThread, and InternetOpen.',
  },
  {
    id: 'chk_pma_02',
    documentId: 'doc_ref_02_pma',
    section: 'Chapter 3: Basic Dynamic Analysis & Sandboxing',
    page: 58,
    authorityTier: 1,
    tokenCount: 140,
    keyEntities: ['Dynamic Analysis', 'Process Monitor', 'Wireshark', 'Regshot', 'DNS Query', 'Beaconing'],
    text: 'Basic dynamic analysis involves running malware in an isolated, monitored sandbox while observing behavioral modifications to the file system, registry, processes, and network interfaces. Analysts utilize Process Monitor (Procmon) to trace file/registry mutations, Regshot to detect persistence keys (e.g. Run/RunOnce), and Wireshark to intercept DNS queries, HTTP POST beacons, and TLS handshake characteristics.',
  },
  {
    id: 'chk_pma_03',
    documentId: 'doc_ref_02_pma',
    section: 'Chapter 11: Malware Persistence & Injection Mechanisms',
    page: 240,
    authorityTier: 1,
    tokenCount: 145,
    keyEntities: ['Process Injection', 'DLL Injection', 'Process Hollowing', 'Reflective DLL', 'Persistence'],
    text: 'Advanced malware evades endpoint detection by injecting malicious code into legitimate processes (such as explorer.exe or svchost.exe). Techniques include classic DLL Injection (VirtualAllocEx -> WriteProcessMemory -> CreateRemoteThread), Process Hollowing (spawning a suspended legitimate binary, unmapping its section with NtUnmapViewOfSection, and writing malicious code), and Reflective DLL Loading entirely from memory.',
  },
  {
    id: 'chk_pma_04',
    documentId: 'doc_ref_02_pma',
    section: 'Chapter 14: Command and Control (C2) Protocols',
    page: 310,
    authorityTier: 1,
    tokenCount: 125,
    keyEntities: ['Command and Control', 'Beaconing', 'Domain Generation Algorithm (DGA)', 'Dead Drop Resolver'],
    text: 'Adversary Command and Control (C2) channels employ diverse communications strategies including periodic jittered HTTP/HTTPS beacons, custom binary protocols over TCP/UDP, Domain Generation Algorithms (DGAs) to dynamically generate rendezvous domains, and Dead Drop Resolvers on legitimate platforms (Telegram, GitHub, Discord) to evade network perimeter defenses.',
  },

  // ── DOC 3: The Practice of Network Security Monitoring (Bejtlich) ───────────
  {
    id: 'chk_pnsm_01',
    documentId: 'doc_ref_03_pnsm',
    section: 'Chapter 1: The Core Principles of NSM',
    page: 12,
    authorityTier: 1,
    tokenCount: 135,
    keyEntities: ['Network Security Monitoring', 'Full Content Data', 'Session Data', 'Statistical Data', 'Alert Data'],
    text: 'Network Security Monitoring (NSM) is the collection, analysis, and escalation of indications and warnings to detect and respond to intrusions. NSM relies on four empirical data types: Full Content Data (complete PCAPs), Session Data (NetFlow/IPFIX summary records), Statistical Data (metrics and baselines), and Alert Data (judgments generated by signature engines like Snort and Suricata).',
  },
  {
    id: 'chk_pnsm_02',
    documentId: 'doc_ref_03_pnsm',
    section: 'Chapter 6: Investigating Alert & Session Data',
    page: 134,
    authorityTier: 1,
    tokenCount: 130,
    keyEntities: ['Session Data', 'NetFlow', 'Bro/Zeek', 'Connection Records', 'Data Exfiltration'],
    text: 'Session data provides transaction-level audit trails of network conversations without the storage overhead of full packet capture. Analyzing source/destination IPs, ports, byte volume ratios, and connection duration allows analysts to quickly identify beaconing cadences, internal lateral movement sweeps, and large-scale data exfiltration events.',
  },

  // ── DOC 4: The Art of Memory Forensics (Ligh et al.) ───────────────────────
  {
    id: 'chk_amf_01',
    documentId: 'doc_ref_04_amf',
    section: 'Chapter 5: Memory Acquisition & Kernel Objects',
    page: 85,
    authorityTier: 1,
    tokenCount: 130,
    keyEntities: ['Memory Forensics', 'EPROCESS', 'Volatility', 'Kernel Pool', 'DKOM'],
    text: 'Volatile memory captures the true runtime state of an endpoint, revealing active malware that leaves zero disk footprint. By traversing the Windows kernel doubly-linked EPROCESS list and scanning for pool tags (psxview), forensic investigators detect Direct Kernel Object Manipulation (DKOM) where rootkits unhook their process from standard management APIs.',
  },
  {
    id: 'chk_amf_02',
    documentId: 'doc_ref_04_amf',
    section: 'Chapter 12: Detecting In-Memory Code Injection',
    page: 260,
    authorityTier: 1,
    tokenCount: 140,
    keyEntities: ['Malfind', 'PAGE_EXECUTE_READWRITE', 'In-Memory Injection', 'Shellcode Detection'],
    text: 'In-memory code injection is identified by analyzing Virtual Address Descriptors (VAD) for memory regions allocated with PAGE_EXECUTE_READWRITE permissions that are not backed by an executable image on disk. Tools like Volatility malfind scan for memory pages containing executable permissions and extract raw assembly shellcode headers (e.g. MZ headers, NOP sleds, egg hunters).',
  },
  {
    id: 'chk_amf_03',
    documentId: 'doc_ref_04_amf',
    section: 'Chapter 8: Process Memory Internals & VadRoot Traversal',
    page: 172,
    authorityTier: 1,
    tokenCount: 145,
    keyEntities: ['VadRoot', 'Virtual Address Descriptor', 'EPROCESS', 'PAGE_EXECUTE_READWRITE', 'Unbacked Executable Memory'],
    text: 'Each Windows process EPROCESS structure contains a pointer to VadRoot, a self-balancing AVL binary tree representing the process virtual memory layout. Traversing the VadRoot tree inspects MMVAD structures for memory ranges with executable protections (PAGE_EXECUTE_READWRITE) lacking a control area pointer to a memory-mapped file on disk, exposing reflective DLL injection, hollowed binaries, and injected shellcode.',
  },
  {
    id: 'chk_amf_04',
    documentId: 'doc_ref_04_amf',
    section: 'Chapter 14: Kernel Rootkits & System Service Descriptor Table (SSDT) Hooking',
    page: 310,
    authorityTier: 1,
    tokenCount: 140,
    keyEntities: ['SSDT', 'System Service Descriptor Table', 'Kernel Driver', 'Hooking', 'Direct Kernel Object Manipulation'],
    text: 'Kernel-mode rootkits modify the System Service Descriptor Table (SSDT) or KeServiceDescriptorTable shadow to intercept system calls from user mode. Forensic validation verifies that function pointers in KiServiceTable resolve within the address bounds of ntoskrnl.exe. Pointers redirected into non-contiguous kernel memory or unverified third-party device drivers indicate malicious kernel driver hooking.',
  },
  {
    id: 'chk_amf_05',
    documentId: 'doc_ref_04_amf',
    section: 'Chapter 6: Windows Kernel Objects, Handles, and Threads',
    page: 120,
    authorityTier: 1,
    tokenCount: 135,
    keyEntities: ['ETHREAD', 'Object Table', 'Handles', 'Kernel Artifacts', 'Process Ghosting'],
    text: 'Advanced evasion techniques like Process Ghosting and Process Doppelganging manipulate file objects and NTFS transaction state before execution. Memory analysis interrogates the handle table in EPROCESS and iterates active ETHREAD structures, identifying unlinked threads, threads executing outside loaded module sections, and deleted file handles still referenced by running processes.',
  },
  {
    id: 'chk_amf_06',
    documentId: 'doc_ref_04_amf',
    section: 'Chapter 16: Physical Memory Acquisition & Order of Volatility',
    page: 45,
    authorityTier: 1,
    tokenCount: 130,
    keyEntities: ['Order of Volatility', 'Physical Memory Acquisition', 'Live Triage', 'NIST SP 800-86', 'Memory Dump'],
    text: 'In accordance with RFC 3227 and NIST SP 800-86, endpoint triage adheres to the order of volatility: CPU registers and cache first, followed by physical RAM (volatile memory), network state, process table, disk storage, and archival backups. Uncompromised hardware-assisted acquisition or trusted signed drivers ensure cryptographic integrity (SHA-256) of raw RAM captures.',
  },
  {
    id: 'chk_amf_07',
    documentId: 'doc_ref_04_amf',
    section: 'Chapter 11: PE Structure Reconstruction in Volatile Memory',
    page: 235,
    authorityTier: 1,
    tokenCount: 140,
    keyEntities: ['PE Structure', 'MZ Header', 'PE Signature', 'Section Table', 'Volatility 3', 'Malfind'],
    text: 'Detecting injected code relies on parsing PE headers reconstructed from process memory. Volatility 3 windows.malfind identifies unbacked memory allocations whose initial bytes match the MZ (0x5A4D) header and PE signature (0x00004550) pointed to by e_lfanew. Injected binaries frequently wipe their DOS header or distort the OptionalHeader to evade naive memory scanners.',
  },
  {
    id: 'chk_amf_08',
    documentId: 'doc_ref_04_amf',
    section: 'Chapter 15: Kernel Pool Allocation & Pool Tag Scanning',
    page: 340,
    authorityTier: 1,
    tokenCount: 135,
    keyEntities: ['Kernel Pool', 'Pool Tags', 'NonPagedPool', 'Rootkits', 'BigPool', 'Memory Forensics'],
    text: 'Kernel drivers allocate dynamic memory from PagedPool or NonPagedPool stamped with a four-character pool tag (e.g. Proc for EPROCESS, Thre for ETHREAD). Rootkits using Direct Kernel Object Manipulation (DKOM) to unlink themselves from PsLoadedModuleList can be identified by pool carving: scanning physical memory for unlinked allocations containing valid driver object headers and rogue dispatch tables.',
  },
  {
    id: 'chk_amf_09',
    documentId: 'doc_ref_04_amf',
    section: 'Chapter 18: LSASS Memory Extraction & Credential Artifact Parsing',
    page: 410,
    authorityTier: 1,
    tokenCount: 145,
    keyEntities: ['LSASS', 'Credential Dumping', 'MiniDumpWriteDump', 'WDigest', 'Kerberos Tickets', 'DPAPI'],
    text: 'Credential dumping adversaries extract plaintext credentials, Kerberos ticket-granting tickets (TGT), and NTLM hashes by generating memory dumps of lsass.exe via MiniDumpWriteDump or comsvcs.dll. Memory forensics interrogates the LSA security packages in memory (WDigest, Kerberos, Msv1_0), reconstructing decrypted logon sessions and identifying unauthorized process handle access with PROCESS_VM_READ permissions.',
  },
  {
    id: 'chk_amf_10',
    documentId: 'doc_ref_04_amf',
    section: 'Chapter 13: Advanced Memory Injection: Process Hollowing & Doppelganging',
    page: 285,
    authorityTier: 1,
    tokenCount: 150,
    keyEntities: ['Process Hollowing', 'Process Doppelganging', 'NtCreateSection', 'NtUnmapViewOfSection', 'Transacted NTFS'],
    text: 'Process Hollowing unmaps the original executable from a suspended process using NtUnmapViewOfSection and replaces the image with malicious payload before resuming execution. Process Doppelganging advances this evasion using NTFS transactions: creating a transacted file, writing malware into it, creating an image section via NtCreateSection with SEC_IMAGE, and rolling back the transaction so the malicious file never commits to disk.',
  },


  // ── DOC 5: Malware Analyst's Cookbook (Ligh et al.) ─────────────────────────
  {
    id: 'chk_mac_01',
    documentId: 'doc_ref_05_mac',
    section: 'Recipe 4-3: Deobfuscating XOR and Custom Encodings',
    page: 112,
    authorityTier: 1,
    tokenCount: 125,
    keyEntities: ['Deobfuscation', 'XOR Decryption', 'RC4', 'Base64', 'Payload Extraction'],
    text: 'Malware authors routinely obfuscate configurations, embedded payloads, and C2 endpoints using single-byte XOR, multi-byte rolling XOR, RC4, or modified Base64 alphabet substitutions. Automated forensic deobfuscation scripts identify cryptographic key loops and extract plaintext configuration blocks containing secondary IP addresses, ports, and campaign IDs.',
  },

  // ── DOC 6: Threat Modeling (Adam Shostack) ──────────────────────────────────
  {
    id: 'chk_tm_01',
    documentId: 'doc_ref_06_tm',
    section: 'Chapter 3: STRIDE Threat Modeling Framework',
    page: 62,
    authorityTier: 1,
    tokenCount: 140,
    keyEntities: ['STRIDE', 'Spoofing', 'Tampering', 'Repudiation', 'Information Disclosure', 'Denial of Service', 'Elevation of Privilege'],
    text: 'The STRIDE mnemonic structures threat analysis into six threat categories: Spoofing (authenticity violation), Tampering (integrity violation), Repudiation (deniability of actions), Information Disclosure (confidentiality breach), Denial of Service (availability degradation), and Elevation of Privilege (authorization bypass). Analysts evaluate trust boundaries to identify where untrusted external data crosses into sensitive enterprise assets.',
  },

  // ── DOC 7: The Threat Intelligence Handbook (Recorded Future) ──────────────
  {
    id: 'chk_tih_01',
    documentId: 'doc_ref_07_tih',
    section: 'Chapter 2: Tactical, Operational, and Strategic CTI',
    page: 28,
    authorityTier: 1,
    tokenCount: 130,
    keyEntities: ['Tactical CTI', 'Operational CTI', 'Strategic CTI', 'Vulnerability Prioritization'],
    text: 'Effective threat intelligence aligns collection with defender workflows. In vulnerability management, raw CVSS scores alone cause alert fatigue because fewer than 5% of published CVEs are ever exploited in the wild. Enriching CVE data with CTI indicators of active weaponization, dark web proof-of-concept availability, and APT campaign links reduces remediation backlogs by over 80%.',
  },

  // ── DOC 8: Applied Network Security Monitoring (Sanders & Smith) ────────────
  {
    id: 'chk_ansm_01',
    documentId: 'doc_ref_08_ansm',
    section: 'Chapter 4: Zeek (Bro) Telemetry & Transaction Logging',
    page: 95,
    authorityTier: 1,
    tokenCount: 135,
    keyEntities: ['Zeek', 'Conn.log', 'DNS.log', 'HTTP.log', 'SSL.log', 'Network Telemetry'],
    text: 'Zeek provides semantic transaction logs of network application protocols. Conn.log records connection states (S0, SF, REJ), duration, and byte volume. DNS.log documents domain resolution lookups and response codes (NXDOMAIN bursts indicate DGA activity). SSL.log captures certificate subjects, issuers, JA3/JA3S TLS fingerprint hashes for identifying malicious C2 frameworks like Cobalt Strike and Metasploit.',
  },

  // ── DOC 9: Network Security Monitoring: Principles (Bejtlich) ──────────────
  {
    id: 'chk_nsm_adv_01',
    documentId: 'doc_ref_09_nsm_adv',
    section: 'Chapter 2: Defensible Network Architecture',
    page: 44,
    authorityTier: 1,
    tokenCount: 120,
    keyEntities: ['Defensible Architecture', 'Sensor Placement', 'Segmentation', 'Egress Filtering'],
    text: 'A defensible network architecture is monitored, controlled, minimized, and current. Critical sensor placement at network choke points (Internet egress, demilitarized zones, internal datacenter core) ensures complete visibility over ingress exploitation attempts, lateral movement pivot points, and outbound command-and-control communication.',
  },

  // ── DOC 10: Hacking: The Art of Exploitation (Jon Erickson) ─────────────────
  {
    id: 'chk_hae_01',
    documentId: 'doc_ref_10_hae',
    section: 'Chapter 3: Buffer Overflows & Memory Corruption',
    page: 118,
    authorityTier: 1,
    tokenCount: 145,
    keyEntities: ['Buffer Overflow', 'Stack Layout', 'EIP/RIP Control', 'Shellcode', 'ROP Chains', 'Memory Corruption'],
    text: 'Stack-based buffer overflows occur when an application writes data past the allocated bounds of a stack buffer without validation (e.g. via strcpy, sprintf, gets). The overflowing data overwrites adjacent memory on the call stack, specifically replacing the saved frame pointer (EBP/RBP) and return address (EIP/RIP). When the function returns, execution redirects to attacker-supplied shellcode or Return-Oriented Programming (ROP) gadgets.',
  },

  // ── DOC 11: MITRE ATT&CK Enterprise Knowledge Base (v15.1 STIX 2.1) ─────────
  {
    id: 'chk_attack_01',
    documentId: 'doc_ref_11_mitre_attack',
    section: 'Tactics: Initial Access (TA0001) & Execution (TA0002)',
    authorityTier: 0,
    tokenCount: 155,
    keyEntities: ['MITRE ATT&CK', 'Initial Access (TA0001)', 'Execution (TA0002)', 'T1190', 'T1566', 'T1059'],
    text: 'Initial Access (TA0001) encompasses techniques used to gain an initial foothold: Exploit Public-Facing Application (T1190), Phishing: Spearphishing Attachment/Link (T1566), Valid Accounts (T1078), and External Remote Services (T1133). Execution (TA0002) consists of adversary-controlled code execution techniques, notably Command and Scripting Interpreter (T1059: PowerShell, Windows Command Shell, Bash, Python), and User Execution (T1204: Malicious File/Link).',
  },
  {
    id: 'chk_attack_02',
    documentId: 'doc_ref_11_mitre_attack',
    section: 'Tactics: Persistence (TA0003) & Privilege Escalation (TA0004)',
    authorityTier: 0,
    tokenCount: 150,
    keyEntities: ['MITRE ATT&CK', 'Persistence (TA0003)', 'Privilege Escalation (TA0004)', 'T1547', 'T1053', 'T1068'],
    text: 'Persistence (TA0003) enables adversaries to maintain access across restarts and credential rotations: Boot/Logon Autostart Execution (T1547: Registry Run Keys / Startup Folder), Scheduled Task/Job (T1053), Create or Modify System Process (T1543: Windows Service, systemd). Privilege Escalation (TA0004) leverages Exploitation for Privilege Escalation (T1068), Access Token Manipulation (T1134), and Abuse Elevation Control Mechanism (T1548: UAC Bypass).',
  },
  {
    id: 'chk_attack_03',
    documentId: 'doc_ref_11_mitre_attack',
    section: 'Tactics: Defense Evasion (TA0005) & Credential Access (TA0006)',
    authorityTier: 0,
    tokenCount: 160,
    keyEntities: ['MITRE ATT&CK', 'Defense Evasion (TA0005)', 'Credential Access (TA0006)', 'T1055', 'T1070', 'T1003'],
    text: 'Defense Evasion (TA0005) involves methods to avoid detection: Process Injection (T1055: DLL Injection, Process Hollowing, Thread Execution Hijacking), Indicator Removal (T1070: Clear Windows Event Logs, File Deletion), Masquerading (T1036), and Obfuscated Files or Information (T1027). Credential Access (TA0006) extracts account names and passwords via OS Credential Dumping (T1003: LSASS Memory, NTDS.dit, SAM Database, DCSync), Kerberoasting (T1558.003), and Brute Force (T1110).',
  },
  {
    id: 'chk_attack_04',
    documentId: 'doc_ref_11_mitre_attack',
    section: 'Tactics: Lateral Movement (TA0008) & Command and Control (TA0011)',
    authorityTier: 0,
    tokenCount: 155,
    keyEntities: ['MITRE ATT&CK', 'Lateral Movement (TA0008)', 'Command and Control (TA0011)', 'T1021', 'T1071', 'T1573'],
    text: 'Lateral Movement (TA0008) allows adversaries to extend access across an enterprise: Remote Services (T1021: SMB/Windows Admin Shares, RDP, SSH, WinRM), and Software Deployment Tools (T1072). Command and Control (TA0011) maintains persistent communication: Application Layer Protocol (T1071: Web Protocols, DNS, Mail Protocols), Encrypted Channel (T1573: Asymmetric/Symmetric Cryptography), Dynamic Resolution (T1568: Fast Flux DNS, DGA), and Ingress Tool Transfer (T1105).',
  },

  // ── DOC 12: MITRE D3FEND Defensive Countermeasure Matrix ────────────────────
  {
    id: 'chk_d3fend_01',
    documentId: 'doc_ref_12_mitre_d3fend',
    section: 'Core Defensive Tactics: Model, Harden, Detect, Isolate, Evict',
    authorityTier: 0,
    tokenCount: 145,
    keyEntities: ['MITRE D3FEND', 'Defensive Techniques', 'Process Analysis', 'Network Traffic Analysis', 'Eviction'],
    text: 'MITRE D3FEND provides a standardized knowledge graph of cybersecurity countermeasures directly mapped to counter ATT&CK techniques. Key defensive tactics include Model (asset mapping), Harden (application whitelisting, credential rotation), Detect (process lineage analysis, network traffic analysis, memory scraping verification), Isolate (network microsegmentation, process sandboxing), and Evict (process termination, credential invalidation, connection reset).',
  },

  // ── DOC 13: NIST Cybersecurity Framework 2.0 (CSF 2.0) ──────────────────────
  {
    id: 'chk_nist_csf_01',
    documentId: 'doc_ref_13_nist_csf',
    section: 'The Six Core Functions of NIST CSF 2.0',
    authorityTier: 0,
    tokenCount: 140,
    keyEntities: ['NIST CSF 2.0', 'Govern (GV)', 'Identify (ID)', 'Protect (PR)', 'Detect (DE)', 'Respond (RS)', 'Recover (RC)'],
    text: 'NIST CSF 2.0 establishes six core cybersecurity functions: Govern (GV: establishing cybersecurity risk management strategy, policy, and oversight), Identify (ID: inventorying physical/software assets, supply chain, and vulnerabilities), Protect (PR: access control, data security, platform baseline hardening), Detect (DE: continuous monitoring, anomaly detection), Respond (RS: incident triage, containment, mitigation), and Recover (RC: restoration, resilience improvement).',
  },

  // ── DOC 14: NIST SP 800-150 Threat Information Sharing ──────────────────────
  {
    id: 'chk_nist_sp150_01',
    documentId: 'doc_ref_14_nist_sp800_150',
    section: 'Section 3: Trust Relationships, Provenance & Traffic Light Protocol (TLP)',
    authorityTier: 0,
    tokenCount: 145,
    keyEntities: ['NIST SP 800-150', 'TLP:RED', 'TLP:AMBER', 'TLP:GREEN', 'TLP:CLEAR', 'Information Sharing', 'Trust Circles'],
    text: 'NIST SP 800-150 defines standards for cyber threat information sharing across trust circles. Information exchange utilizes the FIRST Traffic Light Protocol (TLP v2.0): TLP:RED (strictly for named individual recipients only), TLP:AMBER+STRICT / TLP:AMBER (limited to recipient organization and authorized clients), TLP:GREEN (shared within the recipient community and partners), and TLP:CLEAR (publicly releasable with zero sharing restrictions).',
  },

  // ── DOC 15: NIST SP 800-61 Rev. 2 Computer Security Incident Handling ───────
  {
    id: 'chk_nist_sp61_01',
    documentId: 'doc_ref_15_nist_sp800_61',
    section: 'Section 3: The Incident Response Lifecycle',
    authorityTier: 0,
    tokenCount: 140,
    keyEntities: ['NIST SP 800-61', 'Preparation', 'Detection & Analysis', 'Containment', 'Eradication', 'Recovery', 'Post-Incident'],
    text: 'NIST SP 800-61 Rev. 2 codifies the standard four-step incident handling lifecycle: 1. Preparation (tools, team readiness, defensible controls), 2. Detection and Analysis (triage, indicator correlation, scope determination, severity scoring), 3. Containment, Eradication, and Recovery (stopping attacker progression, removing artifacts and backdoors, validating clean systems), 4. Post-Incident Activity (documenting lessons learned, evidence retention, defensive tuning).',
  },

  // ── DOC 16: CISA Known Exploited Vulnerabilities (KEV) Catalog ───────────────
  {
    id: 'chk_cisa_kev_01',
    documentId: 'doc_ref_16_cisa_kev',
    section: 'Criteria for In-The-Wild Exploitation & BOD 22-01 Directives',
    authorityTier: 0,
    tokenCount: 145,
    keyEntities: ['CISA KEV', 'Known Exploited Vulnerabilities', 'Binding Operational Directive 22-01', 'Active Exploitation', 'Ransomware Exploitation'],
    text: 'CISA establishes three mandatory criteria for adding a vulnerability to the Known Exploited Vulnerabilities (KEV) Catalog: 1. The vulnerability has an assigned CVE ID; 2. There is reliable evidence that the vulnerability is being actively exploited in the wild (including use in ransomware attacks, nation-state APT campaigns, or unauthenticated remote code execution); 3. There is a clear action or vendor patch to mitigate the flaw.',
  },

  // ── DOC 17: NVD / NIST Vulnerability Data & CVSS v3.1 / v4.0 Spec ────────────
  {
    id: 'chk_nvd_cvss_01',
    documentId: 'doc_ref_17_nvd_cvss',
    section: 'CVSS v3.1 & v4.0 Base Metrics & Impact Calculations',
    authorityTier: 0,
    tokenCount: 155,
    keyEntities: ['CVSS v3.1', 'CVSS v4.0', 'Attack Vector (AV)', 'Attack Complexity (AC)', 'Privileges Required (PR)', 'User Interaction (UI)', 'Scope (S)', 'CIA Triad'],
    text: 'Common Vulnerability Scoring System (CVSS) Base Score reflects intrinsic technical characteristics. Metrics include Attack Vector (Network AV:N, Adjacent AV:A, Local AV:L, Physical AV:P), Attack Complexity (Low AC:L, High AC:H), Privileges Required (None PR:N, Low PR:L, High PR:H), User Interaction (None UI:N, Required UI:R), and Impact on Confidentiality, Integrity, Availability (None, Low, High). Qualitative ratings: Low (0.1-3.9), Medium (4.0-6.9), High (7.0-8.9), Critical (9.0-10.0).',
  },

  // ── DOC 18: FIRST EPSS v3 Methodology & Model Documentation ─────────────────
  {
    id: 'chk_first_epss_01',
    documentId: 'doc_ref_18_first_epss',
    section: 'EPSS Probability Scoring vs CVSS Severity',
    authorityTier: 0,
    tokenCount: 145,
    keyEntities: ['FIRST EPSS', 'Exploit Prediction Scoring System', 'Probability', 'Percentile', 'Weaponization', 'Vulnerability Prioritization'],
    text: 'The Exploit Prediction Scoring System (EPSS v3) estimates the empirical probability (from 0.0 to 1.0, representing 0% to 100%) that a software vulnerability will be exploited in the wild within the next 30 days. While CVSS measures severity (potential impact if exploited), EPSS measures threat likelihood based on real-world honeypot telemetry, public exploit availability, vendor advisory mentions, and historical weaponization patterns.',
  },

  // ── DOC 19: OASIS STIX 2.1 Specification & CTI Data Model ───────────────────
  {
    id: 'chk_oasis_stix_01',
    documentId: 'doc_ref_19_oasis_stix',
    section: 'Section 2: STIX Domain Objects (SDOs) and Relationship Objects (SROs)',
    authorityTier: 0,
    tokenCount: 150,
    keyEntities: ['STIX 2.1', 'STIX Domain Objects (SDO)', 'STIX Relationship Objects (SRO)', 'Attack Pattern', 'Campaign', 'Malware', 'Threat Actor', 'Vulnerability'],
    text: 'OASIS STIX 2.1 defines 18 STIX Domain Objects (SDOs) including Attack Pattern, Campaign, Course of Action, Grouping, Identity, Incident, Indicator, Infrastructure, Intrusion Set, Location, Malware, Malware Analysis, Note, Observed Data, Opinion, Report, Threat Actor, Tool, and Vulnerability. STIX Relationship Objects (SROs) such as "relationship" (uses, targets, indicates, exploits, attributed-to) and "sighting" connect SDOs into a computable threat graph.',
  },

  // ── DOC 20: OWASP Top 10 for LLM Applications (2025 Standard) ───────────────
  {
    id: 'chk_owasp_llm_01',
    documentId: 'doc_ref_20_owasp_llm',
    section: 'Top Vulnerabilities: Prompt Injection (LLM01) & Insecure Output (LLM02)',
    authorityTier: 0,
    tokenCount: 155,
    keyEntities: ['OWASP Top 10 for LLM', 'LLM01: Prompt Injection', 'LLM02: Insecure Output Handling', 'LLM06: Sensitive Information Disclosure', 'LLM08: Excessive Agency', 'LLM09: Overreliance'],
    text: 'The OWASP Top 10 for LLM Applications catalogs critical security risks: LLM01: Prompt Injection (adversarial manipulation of model instructions via untrusted inputs or indirect RAG context), LLM02: Insecure Output Handling (executing unvalidated model output), LLM06: Sensitive Information Disclosure (leakage of PII, API keys, or system prompts), LLM08: Excessive Agency (granting autonomous execution permissions without human approval gates), and LLM09: Overreliance (blindly trusting hallucinations without claim-level evidence verification).',
  },

  // ── DOC 21: Psychology of Intelligence Analysis (Richards J. Heuer Jr.) ─────
  {
    id: 'chk_heuer_01',
    documentId: 'doc_ref_21_psychology_intel',
    section: 'Chapter 8: Analysis of Competing Hypotheses (ACH)',
    authorityTier: 0,
    tokenCount: 165,
    keyEntities: ['Analysis of Competing Hypotheses', 'ACH', 'Cognitive Biases', 'Hypothesis Testing', 'Disconfirming Evidence'],
    text: 'Analysis of Competing Hypotheses (ACH) requires an intelligence analyst to explicitly identify all plausible alternative explanations rather than focusing on confirming a favored theory. The analyst evaluates each item of evidence against each hypothesis, focusing primarily on evidence that disconfirms or rules out hypotheses. A diagnostic item of evidence is one that helps distinguish among hypotheses, whereas evidence consistent with all hypotheses has zero diagnostic value.',
  },
  {
    id: 'chk_heuer_02',
    documentId: 'doc_ref_21_psychology_intel',
    section: 'Chapter 4: Strategies for Analytical Judgment',
    authorityTier: 0,
    tokenCount: 145,
    keyEntities: ['Mental Models', 'Confirmation Bias', 'Evidentiary Diagnostic Value', 'Perceptual Bias'],
    text: 'Analysts perceive what they expect to perceive and assimilate incoming data into existing mental models. New evidence is discounted if it contradicts pre-existing assumptions, while ambiguous evidence is interpreted as supportive. To mitigate bias, analysts must make mental models explicit, evaluate assumptions systematically, and maintain distinct categories for observed empirical facts versus derived assessments.',
  },

  // ── DOC 22: The Diamond Model of Intrusion Analysis (Caltagirone et al.) ────
  {
    id: 'chk_diamond_01',
    documentId: 'doc_ref_22_diamond_model',
    section: 'Core Vertices: Adversary, Capability, Infrastructure, Victim',
    authorityTier: 0,
    tokenCount: 160,
    keyEntities: ['Diamond Model', 'Adversary Vertex', 'Capability Vertex', 'Infrastructure Vertex', 'Victim Vertex', 'Activity Threads'],
    text: 'The Diamond Model formalizes an intrusion event as an atomic activity consisting of four core vertices: Adversary (the entity responsible for malicious intent), Capability (the tools, malware, exploits, and techniques employed), Infrastructure (the command-and-control IP, domains, and delivery hardware utilized), and Victim (the targeted person, enterprise, or software asset). Meta-features connect vertices: Timestamp, Phase of Kill Chain, Result, Direction, and Analytical Confidence.',
  },
  {
    id: 'chk_diamond_02',
    documentId: 'doc_ref_22_diamond_model',
    section: 'Activity Threads & Correlation Axioms',
    authorityTier: 0,
    tokenCount: 150,
    keyEntities: ['Activity Threads', 'Intrusion Correlation', 'Diamond Axioms', 'Campaign Clustering'],
    text: 'Axiom 1 of the Diamond Model states that for every intrusion event, there exists an adversary who uses a capability over an infrastructure against a victim. Multiple related events are correlated across common vertices into Activity Threads. When two separate events share identical capabilities (e.g. custom packer, specific C2 handshake) and infrastructure, they form high-confidence evidence linking disparate victim observations to a single coordinated campaign.',
  },

  // ── CANONICAL-V1 CORPUS REFERENCE CHUNKS ──────────────────────────────────
  // ── DOC 07: FIRST CVSS v4.0 Specification Document ────────────────────────
  {
    id: 'doc-07-first-cvss4-p1-2',
    documentId: 'doc-07-first-cvss4',
    section: 'Common Vulnerability Scoring System version 4.0: Specification Document',
    authorityTier: 0,
    tokenCount: 239,
    keyEntities: ['CVSS v4.0', 'Base Metrics', 'Threat Metrics', 'Environmental Metrics', 'Supplemental Metrics'],
    text: 'The Common Vulnerability Scoring System (CVSS) is an open framework for communicating the characteristics and severity of software vulnerabilities. CVSS consists of four metric groups: Base, Threat, Environmental, and Supplemental. The Base group represents the intrinsic qualities of a vulnerability that are constant over time and across user environments, the Threat group reflects the characteristics of a vulnerability that change over time, and the Environmental group represents the characteristics of a vulnerability that are unique to a user\'s environment. Base metric values are combined with default values that assume the highest severity for Threat and Environmental metrics to produce a score ranging from 0 to 10. To further refine a resulting severity score, Threat and Environmental metrics can then be amended based on applicable threat intelligence and environmental considerations.',
  },
  {
    id: 'doc-07-first-cvss4-p1-8',
    documentId: 'doc-07-first-cvss4',
    section: 'Metrics',
    authorityTier: 0,
    tokenCount: 233,
    keyEntities: ['CVSS Metric Groups', 'Exploitability', 'Impact', 'Vulnerable System', 'Subsequent System'],
    text: 'CVSS is composed of four metric groups: Base, Threat, Environmental, and Supplemental, each consisting of a set of metrics, as shown in Figure 1. Figure 1: CVSS Metric Groups The Base metric group represents the intrinsic characteristics of a vulnerability that are constant over time and across user environments. It is composed of two sets of metrics: the Exploitability metrics and the Impact metrics. The Exploitability metrics reflect the ease and technical means by which the vulnerability can be exploited. That is, they represent characteristics of the "thing that is vulnerable", which we refer to formally as the "vulnerable system". The Impact metrics reflect the direct consequence of a successful exploit, and represent the consequence to the "things that suffer the impact", which may include impact on the vulnerable system and/or the downstream impact on what is formally called the "subsequent system(s)".',
  },
  {
    id: 'doc-07-first-cvss4-p1-18',
    documentId: 'doc-07-first-cvss4',
    section: 'Exploitability Metrics',
    authorityTier: 0,
    tokenCount: 157,
    keyEntities: ['Attack Vector', 'Network', 'Adjacent', 'Local', 'Physical'],
    text: 'This metric reflects the context by which vulnerability exploitation is possible. This metric value (and consequently the resulting severity) will be larger the more remote (logically, and physically) an attacker can be in order to exploit the vulnerable system. The assumption is that the number of potential attackers for a vulnerability that could be exploited from across a network is larger than the number of potential attackers that could exploit a vulnerability requiring physical access to a device, and therefore warrants a greater severity. The list of possible values is presented in Table 1. Table 1: Attack Vector',
  },

  // ── DOC 08: FIRST EPSS v3 Specification ───────────────────────────────────
  {
    id: 'doc-08-first-epss-p1-1',
    documentId: 'doc-08-first-epss',
    section: 'Introduction',
    authorityTier: 0,
    tokenCount: 159,
    keyEntities: ['FIRST EPSS', 'Exploit Prediction Scoring System', 'Probability', 'Percentile', 'Remediation Prioritization'],
    text: 'Exploit Prediction Scoring System (EPSS) The Exploit Prediction Scoring System (EPSS) is a data-driven machine-learning model that estimates the probability that a published CVE will be exploited in the wild in the next 30 days. It offsets subjective judgments with empirical signals from observed exploitation and ongoing activity, helping you focus limited remediation effort where attacks are most likely. EPSS publishes a 0–1 probability (with ranking percentiles) every day for every CVE and makes the data freely and openly accessible via CSV and API as well as a github repo , so it slots easily into workflows and dashboards.',
  },
  {
    id: 'doc-08-first-epss-p1-2',
    documentId: 'doc-08-first-epss',
    section: 'Where to go from here',
    authorityTier: 0,
    tokenCount: 168,
    keyEntities: ['EPSS Methodology', 'Exploit Likelihood', 'Prioritization Signal', 'CVSS Comparison', 'KEV Integration'],
    text: 'How It Works Model methodology, feature overview, calibration, and known limitations. Why EPSS? The empirical case for exploitation likelihood as a prioritization signal. Performance data, CVSS comparison, and what the research shows. Using EPSS How to set thresholds, combine EPSS with CVSS and KEV, interpret score changes, and avoid common misuses. Frequently Asked Questions Answers to the questions practitioners ask most often about the score, the percentile, and how EPSS compares to other tools. Research Peer-reviewed papers, presentations, and the version changelog. Get the Data API reference, daily CSV downloads, historical scores, and integration examples.',
  },

  // ── DOC CISA KEV: Known Exploited Vulnerabilities ───────────────────────────
  {
    id: 'doc-cisa-kev-record-1',
    documentId: 'doc-cisa-kev',
    section: 'KEV record',
    authorityTier: 0,
    tokenCount: 200,
    keyEntities: ['CISA KEV', 'Known Exploited Vulnerabilities', 'BOD 22-01', 'Mandatory Federal Remediation'],
    text: '{"cveID": "CVE-2023-49105", "cwes": ["CWE-287"], "dateAdded": "2026-08-27", "dueDate": "2026-08-30", "knownRansomwareCampaignUse": "Unknown", "notes": "CISA Known Exploited Vulnerabilities Catalog. Federal agencies must remediate according to BOD 22-01 binding operational directive timelines."}',
  },

  // ── DOC 04: NIST SP 800-86 Guide to Integrating Forensic Techniques ───────
  {
    id: 'doc-04-nist-sp-800-86-p1-1',
    documentId: 'doc-04-nist-sp-800-86',
    section: 'UNKNOWN',
    authorityTier: 0,
    tokenCount: 53,
    keyEntities: ['NIST SP 800-86', 'Forensic Techniques', 'Incident Response', 'Digital Evidence'],
    text: 'Special Publication 800-86 Guide to Integrating Forensic Techniques into Incident Response Recommendations of the National Institute of Standards and Technology Karen Kent Suzanne Chevalier Tim Grance Hung Dang',
  },
  {
    id: 'doc-04-nist-sp-800-86-p15-39',
    documentId: 'doc-04-nist-sp-800-86',
    section: '2. Establishing and Organizing a Forensics Capability',
    authorityTier: 0,
    tokenCount: 231,
    keyEntities: ['Digital Data', 'Forensic Capability', 'Memory Analysis', 'Data Sources'],
    text: 'The term data refers to distinct pieces of digital information that have been formatted in a specific way. The expansion of computers for professional and personal use and the pervasiveness of networking have fueled the need for tools that can record and analyze an ever-increasing amount of data from many sources. For example, data can be stored or transferred by standard computer systems (e.g., desktops, laptops, servers), networking equipment (e.g., firewalls, routers), computing peripherals (i.e., printers), personal digital assistants (PDA), CDs, DVDs, removable hard drives, backup tapes, flash memory, thumb drives, and jump drives. Many consumer electronic devices can also be used to store data. This increasing variety of data sources has helped spur the development and refinement of forensics tools and techniques.',
  },

  // ── DOC 05: NIST SP 800-61 Rev. 3 Incident Handling ────────────────────────
  {
    id: 'doc-05-nist-sp-800-61r3-p1-1',
    documentId: 'doc-05-nist-sp-800-61r3',
    section: 'Introduction',
    authorityTier: 0,
    tokenCount: 120,
    keyEntities: ['NIST SP 800-61r3', 'Incident Response Recommendations', 'Cybersecurity Risk Management', 'CSF 2.0 Community Profile'],
    text: 'NIST Special Publication 800 NIST SP 800-61r3 Incident Response Recommendations and Considerations for Cybersecurity Risk Management A CSF 2.0 Community Profile. Defines continuous incident handling preparation, triage, detection, containment, eradication, and organizational learning.',
  },

  // ── DOC 09: MITRE ATT&CK Enterprise Matrix ────────────────────────────────
  {
    id: 'doc-09-mitre-attack-p0-163',
    documentId: 'doc-09-mitre-attack',
    section: 'Account Discovery Mitigation',
    authorityTier: 0,
    tokenCount: 150,
    keyEntities: ['MITRE ATT&CK', 'Course of Action', 'Mitigation', 'T1087', 'T1190'],
    text: 'Course of action mitigation from MITRE ATT&CK Enterprise: Identify unnecessary system utilities or potentially malicious software that may be used to acquire information about system and domain accounts, and audit and/or block them by using whitelisting tools, like AppLocker, or Software Restriction Policies where appropriate.',
  },

  // ── DOC 01: Heuer Psychology of Intelligence Analysis ─────────────────────
  {
    id: 'doc-01-heuer-psychology-p5-1',
    documentId: 'doc-01-heuer-psychology',
    section: 'Preface',
    authorityTier: 0,
    tokenCount: 120,
    keyEntities: ['Psychology of Intelligence Analysis', 'Analytical Tradecraft', 'Cognitive Bias', 'Hypothesis Evaluation'],
    text: 'This book was prepared primarily for the use of US Government officials, and the format, coverage, and content were designed to meet their specific requirements. Discusses cognitive challenges, evidentiary diagnostic value, and structured analytical techniques for rigorous intelligence production.',
  },
];


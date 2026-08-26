/**
 * MITRE ATT&CK TTP Catalog and Mapping Module
 */

export interface MitreTTP {
  id: string;
  name: string;
  tactic: string;
  description: string;
}

export const MITRE_TTP_CATALOG: Record<string, MitreTTP> = {
  'T1190': {
    id: 'T1190',
    name: 'Exploit Public-Facing Application',
    tactic: 'Initial Access',
    description: 'Adversaries may attempt to exploit a weakness in an Internet-facing computer or program using software, system, or service flaws.',
  },
  'T1059': {
    id: 'T1059',
    name: 'Command and Scripting Interpreter',
    tactic: 'Execution',
    description: 'Adversaries may abuse command and script interpreters to execute commands, scripts, or binaries.',
  },
  'T1566': {
    id: 'T1566',
    name: 'Phishing',
    tactic: 'Initial Access',
    description: 'Adversaries may send phishing messages with malicious attachments or links to gain initial access.',
  },
  'T1003': {
    id: 'T1003',
    name: 'OS Credential Dumping',
    tactic: 'Credential Access',
    description: 'Adversaries may attempt to dump credentials to obtain account login and credential material.',
  },
  'T1071': {
    id: 'T1071',
    name: 'Application Layer Protocol',
    tactic: 'Command and Control',
    description: 'Adversaries may communicate using application layer protocols (HTTP/S, DNS) to blend in with normal network traffic.',
  },
  'T1486': {
    id: 'T1486',
    name: 'Data Encrypted for Impact',
    tactic: 'Impact',
    description: 'Adversaries may encrypt data on target systems to interrupt availability of system and network resources.',
  },
  'T1078': {
    id: 'T1078',
    name: 'Valid Accounts',
    tactic: 'Defense Evasion / Initial Access',
    description: 'Adversaries may obtain and abuse credentials of existing accounts as a means of gaining Initial Access or Persistence.',
  },
  'T1210': {
    id: 'T1210',
    name: 'Exploitation of Remote Services',
    tactic: 'Lateral Movement',
    description: 'Adversaries may exploit remote services to gain unauthorized access to internal systems once inside.',
  },
};

export function lookupTTP(ttpId: string): MitreTTP {
  const normalized = ttpId.toUpperCase().trim();
  if (MITRE_TTP_CATALOG[normalized]) {
    return MITRE_TTP_CATALOG[normalized];
  }
  return {
    id: normalized,
    name: `ATT&CK Technique ${normalized}`,
    tactic: 'Execution / Post-Exploitation',
    description: 'Identified MITRE ATT&CK technique observed in threat telemetry.',
  };
}

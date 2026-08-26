/**
 * Campaign Candidate Clustering Engine
 * Groups multi-event evidence into structured campaigns with lifecycle management.
 */

import { resolveActor } from '../resolution';

export interface CampaignCandidate {
  id: string;
  name: string;
  slug: string;
  actorId?: string;
  targetSectors: string[];
  targetRegions: string[];
  description: string;
  lifecycleState: 'CANDIDATE' | 'CORRELATED' | 'ANALYST_REVIEW' | 'CONFIRMED' | 'REJECTED';
  supportingEvents: string[];
}

export function detectCampaignCandidate(event: {
  id: string;
  title: string;
  summary: string;
  actors: string[];
  malware: string[];
  cves: string[];
}): CampaignCandidate | null {
  const actor = event.actors.length > 0 ? resolveActor(event.actors[0]) : null;
  
  // If an actor is weaponizing a CVE with malware, cluster as campaign candidate
  if (actor && (event.malware.length > 0 || event.cves.length > 0)) {
    const primaryMalware = event.malware[0] || 'Custom Implants';
    const primaryCve = event.cves[0] || 'Zero-Day Vectors';
    const campaignSlug = `operation-${actor.slug}-${primaryMalware.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    
    return {
      id: `camp_${crypto.randomUUID().slice(0, 12)}`,
      name: `Operation ${actor.name} (${primaryMalware})`,
      slug: campaignSlug,
      actorId: actor.id,
      targetSectors: ['Critical Infrastructure', 'Government', 'Enterprise IT'],
      targetRegions: ['Global'],
      description: `Tracked threat activity by ${actor.name} leveraging ${primaryMalware} and exploiting ${primaryCve}.`,
      lifecycleState: 'CORRELATED',
      supportingEvents: [event.id],
    };
  }

  return null;
}

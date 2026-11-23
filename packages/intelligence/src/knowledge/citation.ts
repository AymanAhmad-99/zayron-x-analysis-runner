export interface KnowledgeChunk { documentId: string; title: string; section: string; chunkId: string; text: string; sourceUrl: string; contentHash: string; }
export interface KnowledgeApplication { knowledgeRef: string; chunk: KnowledgeChunk; retrieved: boolean; relevant: boolean; applied: boolean; analyticalEffect: string; }
export interface VerifiedKnowledgeCitation { knowledgeRef: string; documentId: string; chunkId: string; exactText: string; sourceUrl: string; }

async function hash(text: string): Promise<string> { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))].map((b) => b.toString(16).padStart(2, '0')).join(''); }

export async function retrieveMitreT1203(fetcher: typeof fetch = fetch): Promise<KnowledgeChunk> {
  const sourceUrl = 'https://attack.mitre.org/techniques/T1203/'; const response = await fetcher(sourceUrl); if (!response.ok) throw new Error(`KNOWLEDGE_HTTP_${response.status}`); const html = await response.text();
  const title = 'Exploitation for Client Execution'; const marker = html.indexOf(title); if (marker < 0) throw new Error('KNOWLEDGE_SECTION_NOT_FOUND');
  const text = html.slice(Math.max(0, marker - 200), Math.min(html.length, marker + 1200)).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return { documentId: 'mitre-attack-enterprise', title, section: 'T1203', chunkId: `mitre-t1203-${(await hash(text)).slice(0, 24)}`, text, sourceUrl, contentHash: await hash(html) };
}

export function verifyCitation(chunk: KnowledgeChunk, exactText: string): VerifiedKnowledgeCitation {
  if (!exactText || !chunk.text.includes(exactText)) throw new Error('KNOWLEDGE_CITATION_NOT_FOUND');
  return { knowledgeRef: `knowledge:${chunk.chunkId}`, documentId: chunk.documentId, chunkId: chunk.chunkId, exactText, sourceUrl: chunk.sourceUrl };
}

export function applyKnowledge(chunk: KnowledgeChunk, citation: VerifiedKnowledgeCitation): KnowledgeApplication {
  if (citation.chunkId !== chunk.chunkId) throw new Error('KNOWLEDGE_CHUNK_MISMATCH');
  return { knowledgeRef: citation.knowledgeRef, chunk, retrieved: true, relevant: true, applied: true, analyticalEffect: 'Supports detection and validation guidance for client-side exploitation of a browser vulnerability; it does not prove exploitation of this CVE.' };
}

import {
  normalizeIntelligenceSignal,
  validateEnglishQuality,
  resolveActor,
  resolveMalware,
  resolveVulnerability,
  extractGraphRelations,
  lookupTTP,
  detectCampaignCandidate,
  generatePlatformDerivatives,
} from '@zayron/intelligence';

export interface Env {
  DB: D1Database;
  STORAGE?: R2Bucket;
  AI?: any;
  VECTORIZE?: any;
  PUBLISH_QUEUE?: Queue;
  TELEGRAM_COLLECTOR_SERVICE?: Fetcher;
  TELEGRAM_TARGET_CHANNEL?: string;
  ENVIRONMENT: string;
}

interface IngestionMessagePayload {
  sourceId: string;
  sourceName?: string;
  sourceTrustScore?: number;
  externalMessageId: string;
  externalChannelId?: string;
  contentHash: string;
  rawText: string;
  sourceUrl?: string;
  publishedAt?: string;
  receivedAt?: string;
  mediaFileId?: string;
  metadata?: Record<string, unknown>;
}

export default {
  async queue(batch: MessageBatch<IngestionMessagePayload>, env: Env): Promise<void> {
    for (const msg of batch.messages) {
      const payload = msg.body;

      try {
        // ── 1. Idempotency Check: (source_id + external_message_id) OR content_hash ──
        const existing = await env.DB.prepare(
          'SELECT id FROM source_messages WHERE (source_id = ? AND external_message_id = ?) OR content_hash = ? LIMIT 1'
        )
          .bind(payload.sourceId, payload.externalMessageId, payload.contentHash)
          .first();

        if (existing) {
          console.log(`[INGEST] Skipping duplicate message: source=${payload.sourceId}, id=${payload.externalMessageId}`);
          msg.ack();
          continue;
        }

        // ── 2. Source Metadata Lookup & Auto-Registration ─────────────────────
        let sourceRecord = await env.DB.prepare(
          'SELECT display_name, trust_score, status, enabled FROM sources WHERE id = ? LIMIT 1'
        )
          .bind(payload.sourceId)
          .first<{ display_name: string; trust_score: number; status: string; enabled: number }>();

        if (!sourceRecord) {
          const defaultName = payload.sourceName || payload.sourceId.replace('tg_', '@');
          const defaultUrl = payload.sourceUrl || `https://t.me/${payload.sourceId.replace('tg_', '')}`;
          await env.DB.prepare(
            `INSERT INTO sources (
              id, display_name, url, source_type, language, region, trust_score, priority, status, enabled, created_at, updated_at
            ) VALUES (?, ?, ?, 'telegram', 'en', 'global', 0.85, 'B', 'ENABLED', 1, datetime('now'), datetime('now'))
            ON CONFLICT(id) DO NOTHING`
          )
            .bind(payload.sourceId, defaultName, defaultUrl)
            .run();

          sourceRecord = { display_name: defaultName, trust_score: 0.85, status: 'ENABLED', enabled: 1 };
        }

        if (!sourceRecord.enabled || sourceRecord.status === 'DISABLED') {
          console.warn(`[INGEST] Source ${payload.sourceId} is disabled. Skipping.`);
          msg.ack();
          continue;
        }

        const sourceName = sourceRecord.display_name;
        const sourceTrust = sourceRecord.trust_score ?? payload.sourceTrustScore ?? 0.85;

        // ── 3. Normalization, Entity Extraction & Initial English Synthesis ───
        let result = await normalizeIntelligenceSignal({
          sourceId: payload.sourceId,
          sourceName,
          sourceTrustScore: sourceTrust,
          externalMessageId: payload.externalMessageId,
          rawText: payload.rawText,
          sourceUrl: payload.sourceUrl,
          publishedAt: payload.publishedAt,
        });

        const messageId = `msg_${crypto.randomUUID().slice(0, 12)}`;

        // Quarantine spam / low-value signals
        if (result.isSpam) {
          await env.DB.prepare(
            `INSERT INTO source_messages (
              id, source_id, external_message_id, content_hash, raw_content, 
              original_language, status, published_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'QUARANTINED', ?, datetime('now'), datetime('now'))`
          )
            .bind(
              messageId,
              payload.sourceId,
              payload.externalMessageId,
              payload.contentHash,
              payload.rawText,
              result.originalLanguage,
              payload.publishedAt || new Date().toISOString()
            )
            .run();

          msg.ack();
          continue;
        }

        // ── 4. AI English Translation & Synthesis Gate for Non-English Signals ─
        let finalTitle = result.normalizedTitle;
        let finalSummary = result.normalizedSummary;
        let isEnglishVerified = result.isEnglishValid;

        if (result.requiresAITranslation && env.AI) {
          try {
            const aiPrompt = `You are ZAYRON-X CTI Translation & Normalization Engine.
Convert this non-English cyber threat intelligence message into an authoritative, professional English technical threat advisory.
CRITICAL RULES:
1. Output MUST be 100% English. DO NOT output Russian, Persian, Arabic, Chinese, or other non-English text.
2. DO NOT translate technical identifiers: Keep CVE IDs (${result.entities.cves.join(', ') || 'none'}), IP addresses (${result.entities.ipv4s.join(', ') || 'none'}), Hashes, Domains, and MITRE TTPs (${result.entities.ttps.join(', ') || 'none'}) EXACTLY as they are.
3. Return ONLY valid JSON:
{
  "title": "string (Concise technical English title max 100 chars)",
  "summary": "string (Objective analyst-grade technical English summary 2-4 sentences)"
}`;

            const userContent = `Source Language: ${result.originalLanguage.toUpperCase()}\nRaw Content:\n${payload.rawText.slice(0, 1500)}`;

            const aiResp = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
              messages: [
                { role: 'system', content: aiPrompt },
                { role: 'user', content: userContent },
              ],
              temperature: 0.1,
              max_tokens: 400,
            });

            const textResp = aiResp?.response || '';
            const match = textResp.match(/\{[\s\S]*\}/);
            if (match) {
              const parsed = JSON.parse(match[0]);
              if (parsed.title && parsed.summary) {
                const titleVal = validateEnglishQuality(parsed.title);
                const summaryVal = validateEnglishQuality(parsed.summary);
                if (titleVal.isValid && summaryVal.isValid) {
                  finalTitle = parsed.title.trim();
                  finalSummary = parsed.summary.trim();
                  isEnglishVerified = true;
                }
              }
            }
          } catch (aiErr) {
            console.warn('[INGEST] AI English synthesis error (falling back to structured synthesis):', aiErr);
          }
        }

        // Final verification check
        const qualityCheck = validateEnglishQuality(finalTitle);
        if (!qualityCheck.isValid) {
          console.warn(`[INGEST] Signal failed English gate: ${qualityCheck.reason}. Flagging as NEEDS_TRANSLATION.`);
          isEnglishVerified = false;
        }

        const messageStatus = isEnglishVerified ? 'SUCCEEDED' : 'NEEDS_TRANSLATION';

        // ── 5. Insert Verified Source Message (Raw Foreign Text Preserved) ─────
        await env.DB.prepare(
          `INSERT INTO source_messages (
            id, source_id, external_message_id, content_hash, raw_content, 
            normalized_content, original_language, parsed_entities, status, 
            published_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
        )
          .bind(
            messageId,
            payload.sourceId,
            payload.externalMessageId,
            result.contentHash,
            payload.rawText, // Raw source language preserved internally
            finalSummary,    // English normalized content
            result.originalLanguage,
            JSON.stringify(result.entities),
            messageStatus,
            payload.publishedAt || new Date().toISOString()
          )
          .run();

        // If translation completely failed and English is invalid, stop before public event creation
        if (!isEnglishVerified) {
          console.log(`[INGEST] Message ${messageId} held for translation. Not creating public intelligence event.`);
          msg.ack();
          continue;
        }

        // ── 6. Generate Canonical English Intelligence Event ───────────────────
        const eventId = `evt_${crypto.randomUUID().slice(0, 16)}`;
        const eventType = result.entities.cves.length > 0 
          ? 'vulnerability_exploitation' 
          : result.entities.malware.length > 0 
          ? 'malware_campaign' 
          : result.entities.actors.length > 0 
          ? 'threat_actor_activity' 
          : 'threat_intelligence';

        await env.DB.prepare(
          `INSERT INTO intelligence_events (
            id, type, title, summary, severity, confidence, status, content_hash,
            first_seen_at, last_updated_at, entities_json, mitre_matrix, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
        )
          .bind(
            eventId,
            eventType,
            finalTitle,
            finalSummary,
            result.severity,
            result.confidenceScore,
            result.confidenceState,
            result.contentHash,
            payload.publishedAt || new Date().toISOString(),
            new Date().toISOString(),
            JSON.stringify(result.entities),
            JSON.stringify(result.entities.ttps)
          )
          .run();

        // ── 7. Attach Provenance Evidence ──────────────────────────────────────
        const evidenceId = `evi_${crypto.randomUUID().slice(0, 12)}`;
        await env.DB.prepare(
          `INSERT INTO evidence (
            id, event_id, source_id, source_message_id, type, url, weight, snippet, reviewer_state, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'UNREVIEWED', datetime('now'), datetime('now'))`
        )
          .bind(
            evidenceId,
            eventId,
            payload.sourceId,
            messageId,
            result.provenance.evidenceType,
            result.provenance.sourceUrl,
            result.provenance.weight,
            finalSummary.slice(0, 250)
          )
          .run();

        // ── 8. Persist Extracted CVEs into vulnerabilities table ───────────────
        for (const cve of result.entities.cves) {
          const resolvedCve = resolveVulnerability(cve) || cve;
          const cveDbId = `vuln_${resolvedCve.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
          await env.DB.prepare(
            `INSERT INTO vulnerabilities (
              id, cve_id, title, description, severity, is_exploited_in_wild, published_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            ON CONFLICT(cve_id) DO UPDATE SET updated_at = datetime('now')`
          )
            .bind(
              cveDbId,
              resolvedCve,
              `${resolvedCve} Security Advisory`,
              finalSummary,
              result.severity.toUpperCase(),
              result.severity === 'critical' ? 1 : 0,
              payload.publishedAt || new Date().toISOString()
            )
            .run();
        }

        // ── 9. Persist Extracted IOCs (IPs & Hashes) ───────────────────────────
        for (const ip of result.entities.ipv4s.slice(0, 5)) {
          const iocId = `ioc_${crypto.randomUUID().slice(0, 12)}`;
          await env.DB.prepare(
            `INSERT INTO iocs (id, type, normalized_value, event_id, confidence, created_at, updated_at)
             VALUES (?, 'ipv4', ?, ?, ?, datetime('now'), datetime('now'))`
          )
            .bind(iocId, ip, eventId, result.confidenceScore)
            .run();
        }

        for (const sha of result.entities.sha256s.slice(0, 5)) {
          const iocId = `ioc_${crypto.randomUUID().slice(0, 12)}`;
          await env.DB.prepare(
            `INSERT INTO iocs (id, type, normalized_value, event_id, confidence, created_at, updated_at)
             VALUES (?, 'sha256', ?, ?, ?, datetime('now'), datetime('now'))`
          )
            .bind(iocId, sha, eventId, result.confidenceScore)
            .run();
        }

        // ── 10. Upsert Threat Actors with Canonical Resolution ─────────────────
        for (const rawActor of result.entities.actors) {
          const canonical = resolveActor(rawActor);
          const actorName = canonical ? canonical.name : rawActor;
          const actorSlug = canonical ? canonical.slug : rawActor.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const actorId = canonical ? canonical.id : `act_${actorSlug}`;
          const aliases = canonical ? canonical.aliases.join(', ') : null;
          const country = canonical?.country || null;
          const motivation = canonical?.motivation || null;

          await env.DB.prepare(
            `INSERT INTO actors (id, name, slug, aliases, country, motivation, description, first_seen, last_active, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'), datetime('now'))
             ON CONFLICT(slug) DO UPDATE SET last_active = datetime('now'), updated_at = datetime('now')`
          )
            .bind(actorId, actorName, actorSlug, aliases, country, motivation, `Identified threat actor: ${actorName}`)
            .run();
        }

        // ── 11. Upsert Malware Families with Canonical Resolution ──────────────
        for (const rawMw of result.entities.malware) {
          const canonical = resolveMalware(rawMw);
          const mwName = canonical ? canonical.name : rawMw;
          const mwSlug = canonical ? canonical.slug : rawMw.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const mwId = canonical ? canonical.id : `mw_${mwSlug}`;
          const family = canonical?.family || 'Malware Payload';

          await env.DB.prepare(
            `INSERT INTO malware (id, name, slug, family, description, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
             ON CONFLICT(slug) DO UPDATE SET updated_at = datetime('now')`
          )
            .bind(mwId, mwName, mwSlug, family, `Identified malware payload: ${mwName}`)
            .run();
        }

        // ── 12. Extract and Persist Graph Relationships ────────────────────────
        const relations = extractGraphRelations({
          eventId,
          evidenceId,
          actors: result.entities.actors,
          malware: result.entities.malware,
          cves: result.entities.cves,
          ipv4s: result.entities.ipv4s,
          sha256s: result.entities.sha256s,
          ttps: result.entities.ttps,
          confidence: result.confidenceScore,
        });

        for (const rel of relations) {
          await env.DB.prepare(
            `INSERT INTO relations (
              id, source_entity_type, source_entity_id, target_entity_type, target_entity_id, relation_type, confidence, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
          )
            .bind(
              rel.id,
              rel.source_entity_type,
              rel.source_entity_id,
              rel.target_entity_type,
              rel.target_entity_id,
              rel.relation_type,
              rel.confidence
            )
            .run();
        }

        // ── 13. Persist MITRE ATT&CK TTP Mappings ─────────────────────────────
        for (const ttpId of result.entities.ttps) {
          const ttpMeta = lookupTTP(ttpId);
          const mappingId = `ttp_${crypto.randomUUID().slice(0, 12)}`;
          await env.DB.prepare(
            `INSERT INTO ttp_mappings (
              id, mitre_ttp_id, technique_name, tactic, event_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
          )
            .bind(mappingId, ttpMeta.id, ttpMeta.name, ttpMeta.tactic, eventId)
            .run();
        }

        // ── 14. Form Campaign Candidates ──────────────────────────────────────
        const campaignCandidate = detectCampaignCandidate({
          id: eventId,
          title: finalTitle,
          summary: finalSummary,
          actors: result.entities.actors,
          malware: result.entities.malware,
          cves: result.entities.cves,
        });

        if (campaignCandidate) {
          await env.DB.prepare(
            `INSERT INTO campaigns (
              id, name, slug, actor_id, target_sectors, target_regions, description, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            ON CONFLICT(slug) DO UPDATE SET updated_at = datetime('now')`
          )
            .bind(
              campaignCandidate.id,
              campaignCandidate.name,
              campaignCandidate.slug,
              campaignCandidate.actorId || null,
              campaignCandidate.targetSectors.join(', '),
              campaignCandidate.targetRegions.join(', '),
              campaignCandidate.description
            )
            .run();

          if (campaignCandidate.actorId) {
            await env.DB.prepare(
              `INSERT INTO relations (
                id, source_entity_type, source_entity_id, target_entity_type, target_entity_id, relation_type, confidence, created_at, updated_at
              ) VALUES (?, 'actor', ?, 'campaign', ?, 'ACTOR_CONDUCTS_CAMPAIGN', 0.9, datetime('now'), datetime('now'))`
            )
              .bind(`rel_${crypto.randomUUID().slice(0, 12)}`, campaignCandidate.actorId, campaignCandidate.id)
              .run();
          }
        }

        // ── 15. Vectorize Embeddings ──────────────────────────────────────────
        if (env.AI && env.VECTORIZE) {
          try {
            const embedText = `${finalTitle}. ${finalSummary}`;
            const embeddingResponse = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
              text: [embedText],
            });
            const vector = embeddingResponse?.data?.[0];

            if (vector && Array.isArray(vector)) {
              await env.VECTORIZE.upsert([
                {
                  id: eventId,
                  values: vector,
                  metadata: {
                    type: 'intelligence_event',
                    title: finalTitle,
                    severity: result.severity,
                    actors: result.entities.actors.join(','),
                    malware: result.entities.malware.join(','),
                    cves: result.entities.cves.join(','),
                    source_id: payload.sourceId,
                  },
                },
              ]);
            }
          } catch (vecErr) {
            console.warn('[INGEST] Vectorize embedding error (non-fatal):', vecErr);
          }
        }

        // ── 16. PUBLICATION GATE & DEEP AI GENERATION ──────────────────────────
        // Only high-value signals meeting publication criteria become public articles.
        if (result.isEligibleForArticle && result.publicationStatus === 'PUBLISHED') {
          let articleContent = finalSummary;
          let articleDek = finalSummary.slice(0, 140);
          let articleExcerpt = finalSummary.slice(0, 180);
          let articleAiSummary = finalSummary;
          let isDeepAiSuccessful = false;

          if (env.AI) {
            try {
              // 1. Budget Guard: Limit deep AI runs per day
              const todayRuns = await env.DB.prepare(
                "SELECT count(*) as count FROM ai_runs WHERE date(created_at) = date('now')"
              ).first<{ count: number }>();
              
              if ((todayRuns?.count || 0) < 150) {
                const aiPrompt = `You are the ZAYRON-X Principal Intelligence Analyst.
Analyze this cyber threat event and output a structured JSON report.
CRITICAL RULES:
1. Output ONLY valid JSON, no markdown formatting outside of the JSON values.
2. Be highly technical, objective, and evidence-based. No fluff.
3. Ensure the JSON conforms exactly to this structure:
{
  "executive_assessment": "1-2 sentences of high-level strategic impact",
  "what_happened": "Detailed paragraph of the event/vulnerability/attack",
  "why_it_matters": "Paragraph explaining the systemic risk or operational impact",
  "defensive_implications": "1-2 actionable defensive recommendations"
}`;
                const userContent = `Event: ${finalTitle}\nSummary: ${finalSummary}\nEntities: ${JSON.stringify(result.entities)}`;
                
                const startTime = Date.now();
                const aiResp = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
                  messages: [
                    { role: 'system', content: aiPrompt },
                    { role: 'user', content: userContent },
                  ],
                  temperature: 0.2,
                  max_tokens: 800,
                });
                const duration = Date.now() - startTime;
                
                // Track AI run for budget guard
                await env.DB.prepare(
                  `INSERT INTO ai_runs (id, workflow, model_id, duration_ms, status, created_at)
                   VALUES (?, 'deep_article_generation', '@cf/meta/llama-3.1-8b-instruct', ?, 'SUCCEEDED', datetime('now'))`
                )
                  .bind(`airun_${crypto.randomUUID().slice(0, 12)}`, duration)
                  .run();

                const textResp = aiResp?.response || '';
                const match = textResp.match(/\{[\s\S]*\}/);
                
                if (match) {
                  const parsed = JSON.parse(match[0]);
                  
                  if (parsed.executive_assessment && parsed.what_happened && parsed.why_it_matters && parsed.defensive_implications) {
                    articleDek = parsed.executive_assessment;
                    articleExcerpt = parsed.executive_assessment;
                    articleAiSummary = parsed.what_happened;
                    
                    // Build Canonical Markdown
                    articleContent = `## Executive Assessment\n${parsed.executive_assessment}\n\n## What Happened\n${parsed.what_happened}\n\n## Why It Matters\n${parsed.why_it_matters}\n\n## Defensive Implications\n${parsed.defensive_implications}`;
                    
                    // Append structured entity evidence
                    articleContent += `\n\n## Intelligence Evidence & Entities\n`;
                    if (result.entities.cves.length > 0) articleContent += `- **Vulnerabilities:** ${result.entities.cves.join(', ')}\n`;
                    if (result.entities.actors.length > 0) articleContent += `- **Threat Actors:** ${result.entities.actors.join(', ')}\n`;
                    if (result.entities.malware.length > 0) articleContent += `- **Malware:** ${result.entities.malware.join(', ')}\n`;
                    if (result.entities.ttps.length > 0) articleContent += `- **MITRE ATT&CK:** ${result.entities.ttps.join(', ')}\n`;
                    
                    articleContent += `\n*Analysis grounded in verified telemetry from ${sourceName}.*`;
                    
                    isDeepAiSuccessful = true;
                  }
                }
              } else {
                console.warn(`[INGEST] AI Budget Guard triggered (Runs: ${todayRuns?.count}). Falling back to deterministic generation.`);
              }
            } catch (err) {
              console.error('[INGEST] Deep AI generation failed:', err);
            }
          }

          // Quality Gate: If AI failed, use deterministic markdown layout
          if (!isDeepAiSuccessful) {
             articleContent = `## Executive Assessment\n${finalSummary}\n\n## Intelligence Evidence & Entities\n`;
             if (result.entities.cves.length > 0) articleContent += `- **Vulnerabilities:** ${result.entities.cves.join(', ')}\n`;
             if (result.entities.actors.length > 0) articleContent += `- **Threat Actors:** ${result.entities.actors.join(', ')}\n`;
             if (result.entities.malware.length > 0) articleContent += `- **Malware:** ${result.entities.malware.join(', ')}\n`;
             if (result.entities.ttps.length > 0) articleContent += `- **MITRE ATT&CK:** ${result.entities.ttps.join(', ')}\n`;
          }

          const articleSlug = finalTitle
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 80) + `-${eventId.slice(4, 10)}`;

          const articleId = `art_${crypto.randomUUID().slice(0, 12)}`;
          await env.DB.prepare(
            `INSERT INTO articles (
              id, title, slug, dek, content, excerpt, author, category, tags,
              severity, confidence, ai_summary, is_published, is_featured, is_breaking,
              canonical_intel_event_id, published_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'ZAYRON-X Intelligence Crew', ?, ?, ?, ?, ?, 1, 0, ?, ?, ?, datetime('now'), datetime('now'))`
          )
            .bind(
              articleId,
              finalTitle,
              articleSlug,
              articleDek,
              articleContent,
              articleExcerpt,
              eventType,
              JSON.stringify([...result.entities.actors, ...result.entities.malware, ...result.entities.cves]),
              result.severity,
              result.confidenceScore,
              articleAiSummary,
              result.severity === 'critical' ? 1 : 0,
              eventId,
              payload.publishedAt || new Date().toISOString()
            )
            .run();
          console.log(`[INGEST] Public article created: ${articleSlug} (${articleId})`);

          // ── 16B. Outbound Social Publication to Official Channel "Zeron X" (@zayronxai) ──
          if (env.TELEGRAM_COLLECTOR_SERVICE) {
            try {
              const canonicalUrl = `https://zayron-x.co/threats/${articleSlug}`;
              const reportForDerivatives = {
                assessment: {
                  headline: finalTitle,
                  executive_summary: articleDek,
                  threat_level: result.severity.toUpperCase(),
                  confidence_state: result.confidenceState,
                  confidence_score: result.confidenceScore,
                },
                what_happened: articleAiSummary || finalSummary,
                why_it_matters: articleExcerpt || finalSummary,
                vulnerabilities: result.entities.cves.map(c => ({ cveId: c, isExploitedInWild: result.severity === 'critical', severity: result.severity.toUpperCase() })),
                actors: result.entities.actors.map(a => ({ name: a })),
                malware: result.entities.malware.map(m => ({ name: m })),
                iocs: [
                  ...result.entities.ipv4s.map(ip => ({ type: 'ipv4' as const, value: ip, confidence: result.confidenceScore })),
                  ...result.entities.sha256s.map(h => ({ type: 'sha256' as const, value: h, confidence: result.confidenceScore })),
                ],
                depth: 'STANDARD' as const,
              };

              const derivatives = generatePlatformDerivatives(reportForDerivatives, canonicalUrl);
              const targetChannel = env.TELEGRAM_TARGET_CHANNEL || 'zayronxai';
              
              const pubResp = await env.TELEGRAM_COLLECTOR_SERVICE.fetch('http://internal/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  target: targetChannel,
                  message: derivatives.telegram,
                }),
              });

              if (pubResp.ok) {
                const pubData = await pubResp.json() as any;
                const assetId = `asset_tg_${crypto.randomUUID().slice(0, 10)}`;
                const pubId = `pub_tg_${crypto.randomUUID().slice(0, 10)}`;
                const idempotencyKey = `idem_tg_${articleId}`;

                await env.DB.prepare(
                  `INSERT INTO social_assets (id, event_id, article_id, platform, format, status, body, idempotency_key, created_at, updated_at)
                   VALUES (?, ?, ?, 'telegram', 'ALERT', 'PUBLISHED', ?, ?, datetime('now'), datetime('now'))`
                )
                  .bind(assetId, eventId, articleId, derivatives.telegram, idempotencyKey)
                  .run();

                await env.DB.prepare(
                  `INSERT INTO social_publications (id, asset_id, platform, external_post_id, status, attempts, published_at, created_at, updated_at)
                   VALUES (?, ?, 'telegram', ?, 'PUBLISHED', 1, datetime('now'), datetime('now'), datetime('now'))`
                )
                  .bind(pubId, assetId, String(pubData.message_id || ''))
                  .run();

                console.log(`[INGEST] Successfully published article ${articleId} to Telegram @${targetChannel} (MsgID: ${pubData.message_id})`);
              } else {
                console.warn(`[INGEST] Telegram publish response not ok: ${pubResp.status}`);
              }
            } catch (pubErr) {
              console.error('[INGEST] Outbound Telegram publish error (non-fatal):', pubErr);
            }
          }
        } else {
          console.log(`[INGEST] Signal retained as internal intelligence event ${eventId} (Status: ${result.publicationStatus})`);
        }

        // ── 17. Update Source last_seen_at timestamp ───────────────────────────
        await env.DB.prepare(
          `UPDATE sources SET last_seen_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
        )
          .bind(payload.sourceId)
          .run();

        // Acknowledge queue message
        msg.ack();
      } catch (error) {
        console.error('Ingestion queue worker processing failure:', error);
        if (msg.attempts < 3) {
          msg.retry();
        } else {
          console.error(`[INGEST] Max retries reached for message ${msg.id}. Dropping.`);
          msg.ack();
        }
      }
    }
  },
};

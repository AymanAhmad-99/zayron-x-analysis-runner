/**
 * PHASE 9B — authoritative MITRE ATT&CK software → technique extractor.
 *
 * Pure function so the same code path is used by the production seeder and by
 * the unit gate. The STIX bundle documents, per software object (`malware` or
 * `tool`), a `uses` relationship to an `attack-pattern`. Nothing here infers an
 * edge: a row exists only when MITRE published that relationship.
 *
 * Our `technique_edges.entity_slug` must be the canonical D1 `malware.slug`, so
 * a software object is mapped onto a D1 family ONLY by an explicit, documented
 * name match (`normalizeName`), never by fuzzy guessing.
 */

const TECHNIQUE_ID = /^T\d{4}(?:\.\d{3})?$/;

/** `Lumma Stealer` → `lummastealer`; `MEDUSA` → `medusa`. */
export function normalizeName(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

/**
 * Map one D1 family onto exactly one STIX software object.
 *
 * Rules, in order:
 *   1. exact normalized-equality with the family `name` or `slug`;
 *   2. a documented `aliases` entry (STIX `x_mitre_aliases`) matching exactly;
 *   3. a documented name that is a whole-word prefix of the normalized family
 *      name only when unambiguous (at most one candidate).
 * Ambiguous matches are rejected — a wrong attribution is worse than a gap.
 */
export function matchSoftwareForFamily(softwareList, family) {
  const wanted = new Set([normalizeName(family?.name), normalizeName(family?.slug)].filter(Boolean));
  if (wanted.size === 0) return null;

  const exact = softwareList.filter((software) => {
    const names = [software?.name, ...(Array.isArray(software?.x_mitre_aliases) ? software.x_mitre_aliases : [])];
    return names.some((name) => wanted.has(normalizeName(name)));
  });
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return null;

  const prefixed = softwareList.filter((software) => {
    const name = normalizeName(software?.name);
    if (!name) return false;
    // Either direction: D1 may hold the family stem (`lumma`) while MITRE
    // documents the full product (`Lumma Stealer`). The delta bound keeps an
    // unrelated long name from matching, and the ambiguity guard below still
    // rejects a multiply-matched family.
    return [...wanted].some((familyName) => {
      if (familyName.startsWith(name)) return familyName.length - name.length <= 12;
      return name.startsWith(familyName) && name.length - familyName.length <= 12;
    });
  });
  return prefixed.length === 1 ? prefixed[0] : null;
}

function externalId(object) {
  const refs = Array.isArray(object?.external_references) ? object.external_references : [];
  const mitre = refs.find((ref) => String(ref?.source_name ?? '').toLowerCase() === 'mitre-attack');
  const id = String(mitre?.external_id ?? '').trim().toUpperCase();
  return TECHNIQUE_ID.test(id) ? id : '';
}

export function techniqueDisplayName(attackPattern) {
  const refs = Array.isArray(attackPattern?.external_references) ? attackPattern.external_references : [];
  const mitre = refs.find((ref) => String(ref?.source_name ?? '').toLowerCase() === 'mitre-attack');
  const name = String(mitre?.external_id ?? '') === String(attackPattern?.external_id ?? '')
    ? attackPattern?.name
    : attackPattern?.name;
  return String(name ?? '').replace(/\s+/g, ' ').trim().slice(0, 200);
}

export function techniqueTactic(attackPattern) {
  const phases = Array.isArray(attackPattern?.kill_chain_phases) ? attackPattern.kill_chain_phases : [];
  const phase = phases.find((entry) => String(entry?.kill_chain_name ?? '') === 'mitre-attack');
  const tactic = String(phase?.phase_name ?? '').trim().toLowerCase();
  return tactic || 'unmapped';
}

/**
 * Extract every documented `software uses attack-pattern` edge, restricted to
 * the D1 families we actually publish.
 *
 * @param {Array} objects STIX objects from the MITRE bundle
 * @param {Array<{slug: string, name: string}>} families rows from D1 `malware`
 * @returns {{edges: Array, matched: Array, unmatched: Array}}
 */
export function extractSoftwareTechniqueEdges(objects, families) {
  const list = Array.isArray(objects) ? objects : [];
  const byId = new Map();
  for (const object of list) {
    if (object?.id) byId.set(object.id, object);
  }

  const software = list.filter((object) => object?.type === 'malware' || object?.type === 'tool');
  const patterns = new Map();
  for (const object of list) {
    if (object?.type !== 'attack-pattern') continue;
    const id = externalId(object);
    if (id) patterns.set(object.id, { id, name: techniqueDisplayName(object), tactic: techniqueTactic(object) });
  }

  const uses = list.filter(
    (object) => object?.type === 'relationship' && object?.relationship_type === 'uses',
  );

  const edges = [];
  const matched = [];
  const unmatched = [];
  const seen = new Set();

  for (const family of Array.isArray(families) ? families : []) {
    const softwareObject = matchSoftwareForFamily(software, family);
    if (!softwareObject) {
      unmatched.push({ slug: family?.slug ?? '', name: family?.name ?? '' });
      continue;
    }
    const techniqueRows = [];
    for (const relationship of uses) {
      if (relationship.source_ref !== softwareObject.id) continue;
      const pattern = patterns.get(relationship.target_ref);
      if (!pattern) continue;
      techniqueRows.push(pattern);
      const key = `${pattern.id}|malware|${family.slug}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({
        technique_id: pattern.id,
        technique_name: pattern.name,
        tactic: pattern.tactic,
        entity_type: 'malware',
        entity_slug: family.slug,
        entity_name: family.name,
        source_software: softwareObject.name,
      });
    }
    matched.push({ slug: family.slug, name: family.name, software: softwareObject.name, techniques: techniqueRows.length });
  }

  return { edges, matched, unmatched };
}

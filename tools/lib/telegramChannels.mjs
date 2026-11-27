/**
 * PHASE 10B-1 — pure logic behind the zero-friction Telegram channel importer.
 *
 * Nothing here touches the network or the filesystem: the CLI in
 * `tools/import-telegram-channels.mjs` reads the export, calls these functions
 * and writes the artifacts. That split is what makes the importer unit-testable.
 */

export const IMPORT_REGIONS = ["RU", "CN", "IR", "KR", "GCC", "GLOBAL"];

const PERSIAN_MARKERS = /[\u067E\u0686\u0698\u06AF\u06CC\u06A9\u06F0-\u06F9]/;

/** Same deterministic script detection as the ingest engine. */
export function detectLanguage(text) {
  const value = String(text ?? "");
  const counts = { cyrillic: 0, han: 0, hangul: 0, arabic: 0, latin: 0 };
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code >= 0x0400 && code <= 0x04ff) counts.cyrillic += 1;
    else if (code >= 0x4e00 && code <= 0x9fff) counts.han += 1;
    else if (code >= 0xac00 && code <= 0xd7af) counts.hangul += 1;
    else if (code >= 0x0600 && code <= 0x06ff) counts.arabic += 1;
    else if ((code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a)) counts.latin += 1;
  }
  const best = Math.max(counts.cyrillic, counts.han, counts.hangul, counts.arabic);
  if (best === 0 || counts.latin > best * 2) return "en";
  if (best === counts.cyrillic) return "ru";
  if (best === counts.han) return "zh";
  if (best === counts.hangul) return "ko";
  return PERSIAN_MARKERS.test(value) ? "fa" : "ar";
}

export function regionForLanguage(language) {
  switch (String(language ?? "").toLowerCase()) {
    case "ru":
      return "RU";
    case "zh":
      return "CN";
    case "fa":
      return "IR";
    case "ko":
      return "KR";
    case "ar":
      return "GCC";
    default:
      return "GLOBAL";
  }
}

/** `@Name`, `t.me/Name`, `https://t.me/s/Name/123` → `tg:name`. */
export function normalizeHandle(raw) {
  let value = String(raw ?? "").trim();
  if (!value) return "";
  value = value.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  if (/^t\.me\//i.test(value)) value = value.slice(5);
  if (/^telegram\.me\//i.test(value)) value = value.slice(12);
  value = value.split(/[?#]/)[0].replace(/^s\//i, "").split("/")[0];
  value = value.replace(/^@/, "").trim().toLowerCase();
  if (!/^[a-z0-9_]{4,64}$/.test(value)) return "";
  return `tg:${value}`;
}

/** Invite links can never be polled by the public HTML endpoint. */
export function isPrivateLink(raw) {
  const value = String(raw ?? "").trim();
  return /t\.me\/(?:\+|joinchat\/)/i.test(value) || /^tg:\+/.test(value);
}

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

/** Telegram Desktop `result.json` → raw chat entries. */
export function parseTelegramDesktopExport(payload) {
  const list =
    (payload && payload.chats && Array.isArray(payload.chats.list) && payload.chats.list) ||
    (payload && Array.isArray(payload.chats) && payload.chats) ||
    (payload && Array.isArray(payload.dialogs) && payload.dialogs) ||
    [];
  const entries = [];
  for (const chat of list) {
    if (!chat || typeof chat !== "object") continue;
    const title = cleanText(chat.name ?? chat.title ?? "");
    const username = cleanText(chat.username ?? "").replace(/^@/, "");
    const invite = cleanText(chat.invite_link ?? chat.invite ?? "");
    entries.push({
      title,
      username,
      invite,
      type: cleanText(chat.type ?? ""),
      description: cleanText(chat.about ?? chat.description ?? ""),
    });
  }
  return entries;
}

/** Plain `.txt` / `.csv` list → raw entries. */
export function parsePlainList(text) {
  const entries = [];
  for (const rawLine of String(text ?? "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith("//")) continue;
    const cells = line.split(/[;,\t]/).map((cell) => cell.trim()).filter(Boolean);
    const link = cells.find((cell) => /t\.me|telegram\.me|^@/i.test(cell)) ?? cells[0];
    if (!link) continue;
    const title = cells.find((cell) => cell !== link) ?? "";
    entries.push({ title, username: link, invite: isPrivateLink(link) ? link : "", type: "", description: "" });
  }
  return entries;
}

/** Decide the input shape from the file name and its first non-space character. */
export function parseInput(content, fileName = "") {
  const text = String(content ?? "");
  const looksJson = /\.json$/i.test(fileName) || text.trimStart().startsWith("{") || text.trimStart().startsWith("[");
  if (!looksJson) return parsePlainList(text);
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error("INVALID_JSON_EXPORT");
  }
  if (Array.isArray(payload)) return parseTelegramDesktopExport({ chats: payload });
  return parseTelegramDesktopExport(payload);
}

/**
 * Split every entry into a pollable public channel or a private/invite-only
 * queue item. Deduplicates by handle and never invents a region: the language is
 * detected from the title and description, and the region follows the script.
 */
export function classifyChannels(entries) {
  const publicChannels = new Map();
  const privateChannels = new Map();

  for (const entry of Array.isArray(entries) ? entries : []) {
    const handle = normalizeHandle(entry.username);
    if (handle) {
      if (!publicChannels.has(handle)) {
        const language = detectLanguage(`${entry.title} ${entry.description}`);
        publicChannels.set(handle, {
          handle,
          title: cleanText(entry.title) || handle.replace(/^tg:/, ""),
          language,
          region: regionForLanguage(language),
          category: "news",
        });
      }
      continue;
    }
    if (isPrivateLink(entry.invite) || isPrivateLink(entry.username)) {
      const key = cleanText(entry.invite || entry.username || entry.title).toLowerCase();
      if (!key) continue;
      if (!privateChannels.has(key)) {
        const language = detectLanguage(`${entry.title} ${entry.description}`);
        privateChannels.set(key, {
          invite: cleanText(entry.invite || entry.username),
          title: cleanText(entry.title) || "Unnamed private channel",
          language,
          region: regionForLanguage(language),
        });
      }
      continue;
    }
    // A chat with neither a username nor an invite link is a saved group, not a
    // source: it is recorded as private so the owner can decide, never polled.
    if (cleanText(entry.title)) {
      const key = cleanText(entry.title).toLowerCase();
      if (!privateChannels.has(key)) {
        privateChannels.set(key, {
          invite: "",
          title: cleanText(entry.title),
          language: detectLanguage(entry.title),
          region: regionForLanguage(detectLanguage(entry.title)),
        });
      }
    }
  }

  return { publicChannels: [...publicChannels.values()], privateChannels: [...privateChannels.values()] };
}

function sqlString(value) {
  return `'${String(value ?? "").replace(/'/g, "''")}'`;
}

/** Stable id so a re-run is byte-identical and `INSERT OR IGNORE` is a no-op. */
export function sourceIdFor(handle) {
  const clean = String(handle ?? "").replace(/^tg:/, "");
  let hash = 0x811c9dc5;
  for (let index = 0; index < clean.length; index += 1) {
    hash ^= clean.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `src_tg_import_${hash.toString(16).padStart(8, "0")}`;
}

/** The complete idempotent seed file for an owner import. */
export function buildSeedSql(publicChannels) {
  const rows = [];
  for (const channel of Array.isArray(publicChannels) ? publicChannels : []) {
    rows.push(
      `INSERT OR IGNORE INTO osint_sources (id, handle, source_type, title, region, language, category, credibility_score, poll_interval_mins, enabled) VALUES (${[
        sqlString(sourceIdFor(channel.handle)),
        sqlString(channel.handle),
        sqlString("telegram_public"),
        sqlString(channel.title),
        sqlString(channel.region),
        sqlString(channel.language),
        sqlString(channel.category ?? "news"),
        "50.0",
        "30",
        "1",
      ].join(", ")});`,
    );
  }
  return `${rows.join("\n")}\n`;
}

export function summarize(publicChannels, privateChannels) {
  const byRegion = new Map();
  for (const channel of publicChannels) {
    byRegion.set(channel.region, (byRegion.get(channel.region) ?? 0) + 1);
  }
  for (const region of IMPORT_REGIONS) if (!byRegion.has(region)) byRegion.set(region, 0);
  return {
    public: publicChannels.length,
    private: privateChannels.length,
    total: publicChannels.length + privateChannels.length,
    byRegion: [...byRegion.entries()].filter(([, count]) => count > 0).map(([region, count]) => ({ region, count })),
  };
}

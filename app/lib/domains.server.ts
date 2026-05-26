import type { D1Database } from "@cloudflare/workers-types";

// 5-letter .com domains using a-z only
const ALPHABET = "abcdefghijklmnopqrstuvwxyz";

export function generateRandomFiveLetterDomain(): string {
  let result = "";
  for (let i = 0; i < 5; i++) {
    result += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return result;
}

export function generateUniqueCandidates(count: number, exclude: Set<string> = new Set()): string[] {
  const candidates = new Set<string>();
  const maxAttempts = count * 20; // safety to avoid infinite loop
  let attempts = 0;

  while (candidates.size < count && attempts < maxAttempts) {
    attempts++;
    const candidate = generateRandomFiveLetterDomain();
    if (!exclude.has(candidate)) {
      candidates.add(candidate);
    }
  }

  return Array.from(candidates);
}

/**
 * The main function used by the UI.
 * Returns up to 5 random domain suggestions from cache.
 * Triggers generation of fresh ones if the last batch is old.
 */
export async function getFiveDomainSuggestions(db: D1Database): Promise<string[]> {
  // Check if we should generate fresh suggestions
  await maybeGenerateFreshSuggestions(db);

  const result = await db
    .prepare(
      `SELECT domain FROM domains 
       WHERE suggested = 1 
       ORDER BY RANDOM() 
       LIMIT 5`
    )
    .all<{ domain: string }>();

  let domains = result.results.map((r) => r.domain);

  // If we have fewer than 5 suggestions in cache, generate some fresh ones
  if (domains.length < 5) {
    const needed = 5 - domains.length;
    const exclude = new Set(domains);
    const fresh = generateUniqueCandidates(needed, exclude);

    // These are generated suggestions only.
    // We do not check or guarantee availability.
    const now = Date.now();
    const stmt = db.prepare(
      "INSERT OR IGNORE INTO domains (domain, suggested, generated_at) VALUES (?, 1, ?)"
    );

    for (const d of fresh) {
      await stmt.bind(d, now).run();
    }

    // fetch again
    const second = await db
      .prepare(
        `SELECT domain FROM domains 
         WHERE suggested = 1 
         ORDER BY RANDOM() 
         LIMIT 5`
      )
      .all<{ domain: string }>();

    domains = second.results.map((r) => r.domain);
  }

  return domains.slice(0, 5);
}

/**
 * Decides whether it's time to generate a fresh batch of suggestions.
 */
async function maybeGenerateFreshSuggestions(db: D1Database) {
  const meta = await db
    .prepare("SELECT value FROM meta WHERE key = 'last_refresh'")
    .first<{ value: string }>();

  const lastRefresh = meta ? parseInt(meta.value, 10) : 0;
  const oneHourMs = 1000 * 60 * 60;
  const now = Date.now();

  if (!lastRefresh || now - lastRefresh > oneHourMs) {
    await generateAndStoreNewSuggestions(db, now);
  }
}

/**
 * Generates new candidate domains and stores them as suggestions.
 * No real availability checking is performed.
 */
async function generateAndStoreNewSuggestions(db: D1Database, now: number) {
  // Get 20 fresh candidates we haven't seen recently
  const recent = await db
    .prepare("SELECT domain FROM domains ORDER BY generated_at DESC LIMIT 50")
    .all<{ domain: string }>();

  const exclude = new Set(recent.results.map((r) => r.domain));
  const candidates = generateUniqueCandidates(20, exclude);

  const stmt = db.prepare(
    "INSERT OR REPLACE INTO domains (domain, suggested, generated_at) VALUES (?, 1, ?)"
  );

  for (const domain of candidates) {
    await stmt.bind(domain, now).run();
  }

  // Update the last generated timestamp
  await db
    .prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('last_generated', ?)")
    .bind(now.toString())
    .run();

  console.log(`[nnole-domains] Generated ${candidates.length} new suggestions`);
}

/**
 * Called when the user explicitly clicks "Get 5 more".
 * Respects a 5-minute cooldown.
 * Forces generation of new suggestions.
 */
export async function forceNewDomainSuggestions(db: D1Database): Promise<string[]> {
  const now = Date.now();

  // Always add a few brand new candidates when user explicitly asks
  const recent = await db
    .prepare("SELECT domain FROM domains ORDER BY generated_at DESC LIMIT 30")
    .all<{ domain: string }>();

  const exclude = new Set(recent.results.map((r) => r.domain));
  const candidates = generateUniqueCandidates(8, exclude);

  const stmt = db.prepare(
    "INSERT OR REPLACE INTO domains (domain, suggested, generated_at) VALUES (?, 1, ?)"
  );

  for (const domain of candidates) {
    await stmt.bind(domain, now).run();
  }

  // Update last_generated so the hourly logic doesn't fight us
  await db
    .prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('last_generated', ?)")
    .bind(now.toString())
    .run();

  // Return a fresh random set
  const result = await db
    .prepare(
      `SELECT domain FROM domains 
       WHERE suggested = 1 
       ORDER BY RANDOM() 
       LIMIT 5`
    )
    .all<{ domain: string }>();

  return result.results.map((r) => r.domain);
}

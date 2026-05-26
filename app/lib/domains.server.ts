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
 * Returns up to 5 available domains from cache, triggering a refresh
 * if the last refresh was more than 1 hour ago (or never).
 */
export async function getFiveAvailableDomains(db: D1Database): Promise<string[]> {
  // Check if we should do a lazy refresh first
  await maybeTriggerHourlyRefresh(db);

  const result = await db
    .prepare(
      `SELECT domain FROM domains 
       WHERE available = 1 
       ORDER BY RANDOM() 
       LIMIT 5`
    )
    .all<{ domain: string }>();

  let domains = result.results.map((r) => r.domain);

  // If we have fewer than 5 available in cache, generate some fresh ones
  if (domains.length < 5) {
    const needed = 5 - domains.length;
    const exclude = new Set(domains);
    const fresh = generateUniqueCandidates(needed, exclude);

    // For now we treat all new random 5-letter domains as available
    // (this will be replaced with real API checks later)
    const now = Date.now();
    const stmt = db.prepare(
      "INSERT OR IGNORE INTO domains (domain, available, checked_at) VALUES (?, 1, ?)"
    );

    for (const d of fresh) {
      await stmt.bind(d, now).run();
    }

    // fetch again
    const second = await db
      .prepare(
        `SELECT domain FROM domains 
         WHERE available = 1 
         ORDER BY RANDOM() 
         LIMIT 5`
      )
      .all<{ domain: string }>();

    domains = second.results.map((r) => r.domain);
  }

  return domains.slice(0, 5);
}

/**
 * Enforces the "only refresh if > 1 hour since last visit-driven check" rule.
 */
async function maybeTriggerHourlyRefresh(db: D1Database) {
  const meta = await db
    .prepare("SELECT value FROM meta WHERE key = 'last_refresh'")
    .first<{ value: string }>();

  const lastRefresh = meta ? parseInt(meta.value, 10) : 0;
  const oneHourMs = 1000 * 60 * 60;
  const now = Date.now();

  if (!lastRefresh || now - lastRefresh > oneHourMs) {
    await performRefresh(db, now);
  }
}

/**
 * Generates new candidate domains and "checks" them.
 * Currently mocks all as available. This is the place to plug in a real API later.
 */
async function performRefresh(db: D1Database, now: number) {
  // Get 20 fresh candidates we haven't seen recently
  const recent = await db
    .prepare("SELECT domain FROM domains ORDER BY checked_at DESC LIMIT 50")
    .all<{ domain: string }>();

  const exclude = new Set(recent.results.map((r) => r.domain));
  const candidates = generateUniqueCandidates(20, exclude);

  const stmt = db.prepare(
    "INSERT OR REPLACE INTO domains (domain, available, checked_at) VALUES (?, 1, ?)"
  );

  for (const domain of candidates) {
    await stmt.bind(domain, now).run();
  }

  // Update the last refresh timestamp
  await db
    .prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('last_refresh', ?)")
    .bind(now.toString())
    .run();

  console.log(`[nnole-domains] Performed refresh with ${candidates.length} new candidates`);
}

/**
 * Called when the user explicitly clicks "Get 5 more".
 * Respects a 5-minute cooldown (enforced by the caller via cookie for now).
 * Always forces a small top-up of fresh candidates.
 */
export async function forceRefreshDomains(db: D1Database): Promise<string[]> {
  const now = Date.now();

  // Always add a few brand new candidates when user explicitly asks
  const recent = await db
    .prepare("SELECT domain FROM domains ORDER BY checked_at DESC LIMIT 30")
    .all<{ domain: string }>();

  const exclude = new Set(recent.results.map((r) => r.domain));
  const candidates = generateUniqueCandidates(8, exclude);

  const stmt = db.prepare(
    "INSERT OR REPLACE INTO domains (domain, available, checked_at) VALUES (?, 1, ?)"
  );

  for (const domain of candidates) {
    await stmt.bind(domain, now).run();
  }

  // Update last_refresh so the hourly logic doesn't fight us
  await db
    .prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('last_refresh', ?)")
    .bind(now.toString())
    .run();

  // Return a fresh random set
  const result = await db
    .prepare(
      `SELECT domain FROM domains 
       WHERE available = 1 
       ORDER BY RANDOM() 
       LIMIT 5`
    )
    .all<{ domain: string }>();

  return result.results.map((r) => r.domain);
}

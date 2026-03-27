/**
 * Fetches SaaS startup data from TrustMRR API (Stripe-verified revenue).
 * Loads raw data into Bronze layer, transforms to Silver, refreshes Gold.
 *
 * Usage: TRUSTMRR_API_KEY=tmrr_xxx SUPABASE_ACCESS_TOKEN=... node scripts/fetch-trustmrr.mjs
 *
 * TrustMRR API: https://trustmrr.com/docs/api
 */

import { writeFileSync } from "fs";
import {
  startRun,
  loadBronzeRecords,
  transformRun,
  autoCategorize,
  refreshGold,
  completeRun,
  failRun,
} from "./lib/pipeline.mjs";

const API_BASE = "https://trustmrr.com/api/v1";
const API_KEY = process.env.TRUSTMRR_API_KEY;

if (!API_KEY) {
  console.error("Error: TRUSTMRR_API_KEY environment variable required");
  console.error(
    "Usage: TRUSTMRR_API_KEY=tmrr_xxx SUPABASE_ACCESS_TOKEN=... node scripts/fetch-trustmrr.mjs",
  );
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
};

// ============================================================
// Fetch with retry + exponential backoff
// ============================================================

async function fetchWithRetry(url, options, maxRetries = 5) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, options);

    if (res.ok) {
      return res;
    }

    if (res.status === 429 && attempt < maxRetries) {
      const retryAfter = parseInt(res.headers.get("retry-after") || "0", 10);
      const wait = retryAfter > 0 ? retryAfter * 1000 : attempt * 15000;
      console.log(
        `  429 Too Many Requests — waiting ${wait / 1000}s (attempt ${attempt}/${maxRetries})...`,
      );
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }

    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text.substring(0, 300)}`);
  }
}

// ============================================================
// Fetch all startups with pagination
// ============================================================

async function fetchAllStartups() {
  const allStartups = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    console.log(`Fetching page ${page}...`);
    const url = `${API_BASE}/startups?page=${page}&limit=50&sort=revenue-desc`;
    const res = await fetchWithRetry(url, { headers });

    const json = await res.json();
    allStartups.push(...json.data);
    hasMore = json.meta.hasMore;
    page++;

    // Rate limiting: wait 2s between requests to avoid 429s on longer pagination runs
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log(`Fetched ${allStartups.length} startups total`);
  return allStartups;
}

// ============================================================
// Main — Bronze -> Silver -> Gold pipeline
// ============================================================

async function main() {
  const run = await startRun("trustmrr");

  try {
    console.log("Fetching TrustMRR data...");
    const startups = await fetchAllStartups();

    // Save raw JSON backup (skip in CI if dir doesn't exist)
    const jsonBackupDir =
      process.env.JSON_BACKUP_DIR || "/home/ens/repos/my-second-brain";
    try {
      writeFileSync(
        `${jsonBackupDir}/trustmrr-startups.json`,
        JSON.stringify(startups, null, 2),
      );
      console.log(`Saved raw JSON: ${jsonBackupDir}/trustmrr-startups.json`);
    } catch {
      console.log("Skipped JSON backup (directory not found)");
    }

    // Also save as artifact-friendly file in repo
    const scriptDir = new URL(".", import.meta.url).pathname;
    const repoRoot = scriptDir.replace(/\/scripts\/$/, "");
    try {
      writeFileSync(
        `${repoRoot}/trustmrr-startups.json`,
        JSON.stringify(startups, null, 2),
      );
    } catch {
      // ignore
    }

    // Load into Bronze
    const records = startups.map((s) => ({
      externalId: s.slug || s.name,
      rawData: s,
    }));

    const bronzeResult = await loadBronzeRecords(
      run.runId,
      "trustmrr",
      records,
    );

    // Transform Bronze -> Silver
    const transformResult = await transformRun(run.runId);

    // Auto-categorize + Refresh Gold view
    await autoCategorize();
    await refreshGold();

    // Complete run
    await completeRun(run.runId, {
      fetched: startups.length,
      loaded: bronzeResult.loaded,
      errors: bronzeResult.errors + transformResult.errors,
      metadata: {
        pages: Math.ceil(startups.length / 50),
        transformInserts: transformResult.inserts,
        transformUpdates: transformResult.updates,
        transformSkips: transformResult.skips,
      },
    });

    console.log("\n=== COMPLETE ===");
    console.log(`Total startups: ${startups.length}`);
    console.log(
      `Bronze: ${bronzeResult.loaded} loaded, ${bronzeResult.errors} errors`,
    );
    console.log(
      `Silver: ${transformResult.inserts} inserts, ${transformResult.updates} updates, ${transformResult.skips} skips`,
    );
  } catch (err) {
    await failRun(run.runId, err.message);
    throw err;
  }
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});

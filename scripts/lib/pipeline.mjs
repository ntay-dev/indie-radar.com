/**
 * Shared pipeline utilities for Bronze/Silver/Gold medallion architecture.
 * All fetch scripts use these functions to:
 * 1. Create a pipeline_run record
 * 2. Load raw data into bronze_raw_records
 * 3. Transform Bronze -> Silver via SQL function
 * 4. Refresh Gold materialized view
 *
 * Requires: SUPABASE_ACCESS_TOKEN env var
 */

import { createHash } from "crypto";

const PROJECT_ID = process.env.SUPABASE_PROJECT_ID || "wenerrewidsepasvnlft";
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

// ============================================================
// Input validation & safe SQL escaping
// ============================================================

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SOURCE_NAME_RE = /^[a-zA-Z0-9_-]+$/;

function assertUUID(value, label) {
  if (!UUID_RE.test(value)) {
    throw new Error(`Invalid UUID for ${label}: ${value}`);
  }
}

function assertSourceName(value) {
  if (!SOURCE_NAME_RE.test(value)) {
    throw new Error(
      `Invalid source name (only alphanumeric, underscore, hyphen): ${value}`,
    );
  }
}

function assertInteger(value, label) {
  if (!Number.isInteger(value)) {
    throw new Error(`Expected integer for ${label}: ${value}`);
  }
}

/**
 * Escape a string for safe inclusion in a PostgreSQL single-quoted literal.
 * Handles single quotes AND backslashes (standard_conforming_strings = on).
 */
function escapeSqlString(str) {
  if (str === null || str === undefined) return "NULL";
  return String(str).replace(/'/g, "''");
}

if (!ACCESS_TOKEN) {
  console.error("Error: SUPABASE_ACCESS_TOKEN environment variable required");
  process.exit(1);
}

// ============================================================
// SQL execution against Supabase Management API
// ============================================================

export async function executeSql(sql, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch(
      `https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ACCESS_TOKEN}`,
        },
        body: JSON.stringify({ query: sql }),
      },
    );

    if (res.ok) {
      return res.json();
    }

    const text = await res.text();

    if (res.status === 429 && attempt < retries) {
      const wait = attempt * 5000;
      console.log(
        `  Rate limited, waiting ${wait / 1000}s (attempt ${attempt}/${retries})...`,
      );
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }

    throw new Error(`SQL error (${res.status}): ${text.substring(0, 500)}`);
  }
}

// ============================================================
// Pipeline run management
// ============================================================

/**
 * Start a new pipeline run.
 * @param {string} sourceName - e.g. 'trustmrr', 'indiehackers', 'acquire'
 * @returns {{ runId: string }}
 */
export async function startRun(sourceName) {
  assertSourceName(sourceName);
  const result = await executeSql(`
    INSERT INTO public.pipeline_runs (source_name, status)
    VALUES ('${escapeSqlString(sourceName)}', 'running')
    RETURNING id;
  `);
  const runId = result[0].id;
  console.log(`Pipeline run started: ${runId} (source: ${sourceName})`);
  return { runId };
}

/**
 * Mark a pipeline run as completed.
 */
export async function completeRun(runId, stats = {}) {
  assertUUID(runId, "runId");
  const { fetched = 0, loaded = 0, errors = 0, metadata = {} } = stats;
  assertInteger(fetched, "fetched");
  assertInteger(loaded, "loaded");
  assertInteger(errors, "errors");
  await executeSql(`
    UPDATE public.pipeline_runs
    SET status = 'completed',
        completed_at = now(),
        records_fetched = ${fetched},
        records_loaded = ${loaded},
        records_errors = ${errors},
        metadata = '${escapeSqlString(JSON.stringify(metadata))}'::jsonb
    WHERE id = '${escapeSqlString(runId)}';
  `);
  console.log(
    `Pipeline run completed: ${runId} (fetched=${fetched}, loaded=${loaded}, errors=${errors})`,
  );
}

/**
 * Mark a pipeline run as failed.
 */
export async function failRun(runId, errorMessage) {
  assertUUID(runId, "runId");
  const safeMsg = escapeSqlString(String(errorMessage).substring(0, 2000));
  await executeSql(`
    UPDATE public.pipeline_runs
    SET status = 'failed',
        completed_at = now(),
        error_message = '${safeMsg}'
    WHERE id = '${escapeSqlString(runId)}';
  `);
  console.error(`Pipeline run failed: ${runId} — ${errorMessage}`);
}

// ============================================================
// Bronze layer: load raw records
// ============================================================

function computeChecksum(data) {
  return createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

/**
 * Load raw records into bronze_raw_records.
 * @param {string} runId - pipeline run ID
 * @param {string} sourceName - source identifier
 * @param {Array<{externalId: string, rawData: object}>} records
 * @returns {{ loaded: number, errors: number }}
 */
export async function loadBronzeRecords(runId, sourceName, records) {
  assertUUID(runId, "runId");
  assertSourceName(sourceName);

  let loaded = 0;
  let errors = 0;
  const batchSize = 50;

  const safeRunId = escapeSqlString(runId);
  const safeSrcName = escapeSqlString(sourceName);

  function buildRecordValues(r) {
    const checksum = computeChecksum(r.rawData);
    const jsonStr = escapeSqlString(JSON.stringify(r.rawData));
    const extId = escapeSqlString(r.externalId);
    return `('${safeRunId}', '${safeSrcName}', '${extId}', '${jsonStr}'::jsonb, '${checksum}')`;
  }

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const values = batch.map(buildRecordValues);

    const sql = `
      INSERT INTO public.bronze_raw_records
        (pipeline_run_id, source_name, external_id, raw_data, checksum)
      VALUES ${values.join(",\n")}
      ON CONFLICT (pipeline_run_id, source_name, external_id)
      DO UPDATE SET raw_data = EXCLUDED.raw_data, checksum = EXCLUDED.checksum;
    `;

    try {
      await executeSql(sql);
      loaded += batch.length;
    } catch (err) {
      console.error(
        `  Bronze batch ${Math.floor(i / batchSize) + 1} error: ${err.message.substring(0, 200)}`,
      );
      // Retry individual records
      for (const r of batch) {
        try {
          await executeSql(`
            INSERT INTO public.bronze_raw_records
              (pipeline_run_id, source_name, external_id, raw_data, checksum)
            VALUES ${buildRecordValues(r)}
            ON CONFLICT (pipeline_run_id, source_name, external_id)
            DO UPDATE SET raw_data = EXCLUDED.raw_data, checksum = EXCLUDED.checksum;
          `);
          loaded++;
        } catch (innerErr) {
          console.error(
            `  Failed record ${r.externalId}: ${innerErr.message.substring(0, 200)}`,
          );
          errors++;
        }
      }
    }

    if (i > 0 && i % 200 === 0) {
      console.log(`  Bronze: ${loaded}/${records.length} loaded...`);
    }

    // Rate limit between batches
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`Bronze load complete: ${loaded} loaded, ${errors} errors`);
  return { loaded, errors };
}

// ============================================================
// Silver transform + Gold refresh
// ============================================================

/**
 * Run Bronze -> Silver transformation for a pipeline run.
 * Calls the transform_bronze_to_silver SQL function.
 * @param {string} runId
 * @returns {{ inserts: number, updates: number, skips: number, errors: number }}
 */
export async function transformRun(runId) {
  assertUUID(runId, "runId");
  console.log(`Transforming Bronze -> Silver for run ${runId}...`);
  const result = await executeSql(
    `SELECT * FROM public.transform_bronze_to_silver('${escapeSqlString(runId)}');`,
  );
  const stats = result[0] || { inserts: 0, updates: 0, skips: 0, errors: 0 };
  console.log(
    `Transform complete: ${stats.inserts} inserts, ${stats.updates} updates, ${stats.skips} skips, ${stats.errors} errors`,
  );
  return stats;
}

/**
 * Auto-categorize uncategorized products via keyword matching.
 */
export async function autoCategorize() {
  console.log("Auto-categorizing uncategorized products...");
  const result = await executeSql(
    `SELECT * FROM public.auto_categorize_products();`,
  );
  const stats = result[0] || {
    categorized_count: 0,
    already_categorized: 0,
    no_match: 0,
  };
  console.log(
    `Auto-categorization: ${stats.categorized_count} categorized, ${stats.no_match} no match`,
  );
  return stats;
}

/**
 * Refresh the Gold materialized view.
 */
export async function refreshGold() {
  console.log("Refreshing Gold view...");
  await executeSql(`SELECT public.refresh_gold_view();`);
  console.log("Gold view refreshed");
}

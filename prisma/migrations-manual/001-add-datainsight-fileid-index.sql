-- Wave G · Phase 1 — additive index (safe, reversible)
--
-- DataInsight.fileId had no index, so deleting a company's reference data
-- (deleteMany where fileId IN (...)) and company-scoped insight queries did a
-- sequential scan. This adds the matching index.
--
-- All other tenant-scoped slug columns (DataFile, FurnaceSpec, PdfDocument,
-- KnowledgeChunk) are ALREADY indexed on companySlug, so no further index work
-- is needed there.
--
-- HOW TO APPLY (after taking a Supabase backup):
--   * Preferred (no table lock) — run via psql, NOT inside a transaction:
--       CREATE INDEX CONCURRENTLY ...   (statement below)
--     The Supabase SQL editor wraps statements in a transaction, where
--     CONCURRENTLY is not allowed. Either run it through psql, or use the
--     non-concurrent fallback below (DataInsight is small reference data, so a
--     brief lock is acceptable).
--
-- Reversible with:  DROP INDEX IF EXISTS "DataInsight_fileId_idx";

-- Preferred (no lock):
CREATE INDEX CONCURRENTLY IF NOT EXISTS "DataInsight_fileId_idx"
  ON "DataInsight" ("fileId");

-- Non-concurrent fallback (brief lock; OK for this small table) — use instead of
-- the above if running in the Supabase SQL editor:
-- CREATE INDEX IF NOT EXISTS "DataInsight_fileId_idx" ON "DataInsight" ("fileId");

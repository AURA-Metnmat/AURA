# Manual migrations (Wave G — data-model hardening)

These are **prepared, additive, reversible** SQL changes for the production
Supabase DB. They are **not auto-applied** — review and apply them yourself,
**after taking a Supabase backup** (Dashboard → Database → Backups, or a manual
snapshot). The app uses `prisma db push` (no migration history), so these are
hand-authored to be safe on a live DB.

> **Always back up first.** Then apply, verify, and keep this folder as the
> record of what ran.

## Phase 1 — index (ready to apply)

- **`001-add-datainsight-fileid-index.sql`** — adds the missing
  `DataInsight.fileId` index. Zero data risk; `CONCURRENTLY` avoids any table
  lock. The matching `@@index([fileId])` is already in `schema.prisma`, so the
  ORM and DB stay in sync (a future `prisma db push` becomes a no-op for it).

Note: the other tenant-scoped slug columns (`DataFile`, `FurnaceSpec`,
`PdfDocument`, `KnowledgeChunk`) are **already indexed** on `companySlug`, so no
further index work is required.

## Phase 2 — companyId FK conversion (PLAN ONLY — not yet written as SQL)

Today the reference/RAG tables are scoped by a **nullable `companySlug` string**
with no foreign key to `Company`. The most dangerous symptom of that — a deleted
company's RAG corpus leaking to a company that later reused the slug — is
**already fixed in code** (commit `351d69f`: `deleteCompanyCompletely` now
deletes `KnowledgeChunk` and runs atomically). Phase 2 adds DB-level referential
integrity on top. It is a larger, coordinated change, so it's documented here
rather than rushed:

Tables: `DataFile`, `FurnaceSpec`, `PdfDocument`, `KnowledgeChunk`
(`DataInsight` links via `DataFile`).

Recommended sequence (each step reversible; backup before each):
1. **Add nullable column** `companyId` to each table (additive, no lock issue).
2. **Backfill** from the slug, e.g.:
   ```sql
   UPDATE "KnowledgeChunk" k
     SET "companyId" = c.id
     FROM "Company" c
     WHERE k."companySlug" = c."slug" AND k."companyId" IS NULL;
   ```
   (`Company.slug` is unique, so the join is 1:1. Rows whose slug no longer
   matches a live company stay NULL — review/clean those.)
3. **Add FK + index**:
   ```sql
   ALTER TABLE "KnowledgeChunk"
     ADD CONSTRAINT "KnowledgeChunk_companyId_fkey"
     FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE;
   CREATE INDEX CONCURRENTLY IF NOT EXISTS "KnowledgeChunk_companyId_idx"
     ON "KnowledgeChunk" ("companyId");
   ```
4. **Update app code** to read/write `companyId` (keep `companySlug` during a
   transition window), and update `schema.prisma` relations.
5. Once everything reads `companyId` and the column is fully backfilled,
   optionally make it `NOT NULL` and drop the `companySlug` dependency.

After Phase 2, `deleteCompanyCompletely` collapses to a single
`company.delete()` (the cascade covers everything) — the hand-rolled multi-table
delete can be removed.

**Do not run Phase 2 against prod without a backup and a staging dry-run.**

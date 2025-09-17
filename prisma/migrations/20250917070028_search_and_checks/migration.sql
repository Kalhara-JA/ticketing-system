-- Enable trigram extension (safe to re-run)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram indexes for "contains"-style search on title/body
CREATE INDEX "Ticket_title_trgm_idx"
  ON "Ticket" USING GIN ("title" gin_trgm_ops);

CREATE INDEX "Ticket_body_trgm_idx"
  ON "Ticket" USING GIN ("body" gin_trgm_ops);

-- Optional: Combined FTS index (simple config) for ranked search
CREATE INDEX "Ticket_fts_idx"
  ON "Ticket" USING GIN (
    to_tsvector('simple', coalesce("title", '') || ' ' || coalesce("body", ''))
  );
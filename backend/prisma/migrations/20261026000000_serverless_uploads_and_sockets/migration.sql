CREATE TABLE "stored_uploads" (
  "path" TEXT PRIMARY KEY,
  "content" BYTEA NOT NULL,
  "mime_type" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "socket_io_attachments" (
  "id" BIGSERIAL UNIQUE,
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "payload" BYTEA
);

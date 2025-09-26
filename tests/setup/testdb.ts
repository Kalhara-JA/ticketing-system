import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";

let container: StartedPostgreSqlContainer | null = null;

/**
 * Start an ephemeral PostgreSQL for tests and run Prisma migrations.
 * Sets process.env.DATABASE_URL for the process.
 */
export async function startTestDb() {
  if (container) return;

  const started = await new PostgreSqlContainer("postgres:17-alpine")
    .withDatabase("app")
    .withUsername("test")
    .withPassword("test")
    .start();

  container = started;
  const dbUrl = container.getConnectionUri();
  process.env.DATABASE_URL = dbUrl;

  // Run prisma migrate deploy against the test DB
  const repoRoot = resolve(fileURLToPath(import.meta.url), "../../../");
  execFileSync(
    process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    ["prisma:migrate:deploy"],
    {
      cwd: repoRoot,
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: dbUrl },
    }
  );
}

/**
 * Stop and remove the test database container.
 */
export async function stopTestDb() {
  if (!container) return;
  await container.stop();
  container = null;
}

export function getDatabaseUrl() {
  return process.env.DATABASE_URL ?? "";
}

 
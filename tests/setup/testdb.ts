import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { resolve } from 'node:path';
import { execa } from 'execa';

let container: StartedTestContainer | null = null;
let databaseUrl: string | null = null;

export async function startTestDatabase() {
  if (container) return { url: databaseUrl as string };

  // Start a Postgres container suitable for Prisma tests
  const pgPassword = 'postgres';
  const pgUser = 'postgres';
  const pgDb = 'app_tests';

  container = await new GenericContainer('postgres:16-alpine')
    .withEnv('POSTGRES_PASSWORD', pgPassword)
    .withEnv('POSTGRES_USER', pgUser)
    .withEnv('POSTGRES_DB', pgDb)
    .withExposedPorts(5432)
    .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections'))
    .start();

  const host = container.getHost();
  const port = container.getMappedPort(5432);
  databaseUrl = `postgresql://${pgUser}:${pgPassword}@${host}:${port}/${pgDb}?schema=public`;

  process.env.DATABASE_URL = databaseUrl;
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';

  // Run migrations against the fresh DB
  await runPrismaMigrateDeploy();

  return { url: databaseUrl };
}

export async function stopTestDatabase() {
  if (container) {
    await container.stop({ timeout: 5000 });
    container = null;
  }
}

async function runPrismaMigrateDeploy() {
  // Ensure prisma generate is run so client matches schema
  await execa('pnpm', ['prisma:generate'], { stdio: 'inherit', cwd: resolve(__dirname, '../../') });
  await execa('pnpm', ['prisma:migrate:deploy'], { stdio: 'inherit', cwd: resolve(__dirname, '../../') });
}

export function getTestDatabaseUrl() {
  if (!databaseUrl) throw new Error('Test DB not started');
  return databaseUrl;
}



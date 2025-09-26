// Load .env.test if present, else fall back to .env.local/.env
import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../../');
const testEnv = resolve(root, '.env.test');
const localEnv = resolve(root, '.env.local');
const defaultEnv = resolve(root, '.env');

if (existsSync(testEnv)) {
  config({ path: testEnv });
} else if (existsSync(localEnv)) {
  config({ path: localEnv });
} else if (existsSync(defaultEnv)) {
  config({ path: defaultEnv });
} else {
  // Fallback to default dotenv behavior
  config();
}




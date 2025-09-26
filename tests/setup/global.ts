import { startTestDatabase, stopTestDatabase } from './testdb';

export default async function() {
  await startTestDatabase();
  return async () => {
    await stopTestDatabase();
  };
}



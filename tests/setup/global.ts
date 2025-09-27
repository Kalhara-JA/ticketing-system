import "./env";
import { beforeAll, afterAll } from "vitest";
import { ensureContainersStarted, cleanupContainers } from "./shared-containers";

// Global test setup - start containers once for all integration tests
beforeAll(async () => {
  await ensureContainersStarted();
});

afterAll(async () => {
  await cleanupContainers();
});



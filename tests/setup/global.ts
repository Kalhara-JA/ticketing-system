import "./env";
import { beforeAll, afterAll } from "vitest";
import { startTestDb, stopTestDb } from "./testDb";
import { startTestMinio, stopTestMinio } from "./testMinio";
import { __resetEnvCacheForTests } from "@/lib/validation/env";
import { resetMinioClients } from "@/lib/storage/minio";

// Global test setup - start containers once for all integration tests
beforeAll(async () => {
  console.log("🚀 Starting shared test containers for integration tests...");
  await Promise.all([startTestDb(), startTestMinio()]);
  __resetEnvCacheForTests();
  
  // Reset MinIO clients to pick up new environment variables
  resetMinioClients();
  
  // Give MinIO a moment to be fully ready
  console.log("⏳ Waiting for MinIO to be fully ready...");
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log("✅ Test containers ready - running integration tests sequentially");
});

afterAll(async () => {
  console.log("🧹 Cleaning up shared test containers...");
  await Promise.all([stopTestDb(), stopTestMinio()]);
  console.log("✅ Test containers stopped");
});



// Shared container management for integration tests
import { startTestDb, stopTestDb } from "./testdb";
import { startTestMinio, stopTestMinio } from "./testMinio";
import { __resetEnvCacheForTests } from "@/lib/validation/env";
import { resetMinioClients } from "@/lib/storage/minio";

// Global container state
let containersStarted = false;
let containersStopped = false;
let containerStartPromise: Promise<void> | null = null;

export async function ensureContainersStarted(): Promise<void> {
  if (containersStarted) {
    return;
  }
  
  if (containerStartPromise) {
    await containerStartPromise;
    return;
  }
  
  console.log("🚀 Starting shared test containers for integration tests...");
  containerStartPromise = (async () => {
    await Promise.all([startTestDb(), startTestMinio()]);
    __resetEnvCacheForTests();
    
    // Reset MinIO clients to pick up new environment variables
    resetMinioClients();
    
    // Give MinIO a moment to be fully ready
    console.log("⏳ Waiting for MinIO to be fully ready...");
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    containersStarted = true;
    console.log("✅ Test containers ready - running integration tests sequentially");
  })();
  
  await containerStartPromise;
}

export async function cleanupContainers(): Promise<void> {
  if (containersStopped) {
    return;
  }
  
  console.log("🧹 Cleaning up shared test containers...");
  await Promise.all([stopTestDb(), stopTestMinio()]);
  containersStopped = true;
  console.log("✅ Test containers stopped");
}

// Handle process exit to ensure cleanup
process.on('exit', cleanupContainers);
process.on('SIGINT', cleanupContainers);
process.on('SIGTERM', cleanupContainers);

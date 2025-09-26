import { GenericContainer, StartedTestContainer, Wait } from "testcontainers";
import { resetMinioClients } from "@/lib/storage/minio";

let container: StartedTestContainer | null = null;

export async function startTestMinio() {
  if (container) return;
  const accessKey = process.env.MINIO_ACCESS_KEY || "minioadmin";
  const secretKey = process.env.MINIO_SECRET_KEY || "minioadmin";

  console.log("🐳 Starting MinIO container...");
  
  const g = new GenericContainer("minio/minio:latest")
    .withEnvironment({
      MINIO_ROOT_USER: accessKey,
      MINIO_ROOT_PASSWORD: secretKey,
    })
    .withExposedPorts(9000, 9001)
    .withCommand(["server", "/data", "--console-address", ":9001"]) 
    // Just wait for ports to be listening - simpler and more reliable
    .withWaitStrategy(Wait.forListeningPorts())
    .withStartupTimeout(180_000); // Increase timeout to 3 minutes

  container = await g.start();

  const mappedPort = container.getMappedPort(9000);
  const host = container.getHost();
  
  console.log(`🔗 MinIO container started on ${host}:${mappedPort}`);
  
  // Internal client uses MINIO_ENDPOINT/MINIO_PORT
  process.env.MINIO_ENDPOINT = host;
  process.env.MINIO_PORT = String(mappedPort);
  process.env.MINIO_SSL = "false";
  // External client should be the same during tests
  process.env.MINIO_EXTERNAL_ENDPOINT = host;
  process.env.MINIO_EXTERNAL_PORT = String(mappedPort);
  process.env.MINIO_EXTERNAL_SSL = "false";
  process.env.MINIO_BUCKET = process.env.MINIO_BUCKET || "ticket-attachments";
  
  // Set credentials
  process.env.MINIO_ACCESS_KEY = accessKey;
  process.env.MINIO_SECRET_KEY = secretKey;
  
  console.log("✅ MinIO environment variables set");
  
  // Give MinIO a moment to fully initialize
  console.log("⏳ Waiting for MinIO to be fully ready...");
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Reset the MinIO client cache to pick up new environment variables
  resetMinioClients();
  
  console.log("✅ MinIO container ready");
}

export async function stopTestMinio() {
  if (!container) return;
  await container.stop();
  container = null;
}



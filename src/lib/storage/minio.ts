// src/lib/storage/minio.ts
import { Client } from "minio";

const endPoint = process.env.MINIO_ENDPOINT!;
const port = Number(process.env.MINIO_PORT || 9000);
const useSSL = process.env.MINIO_SSL === "true";
const accessKey = process.env.MINIO_ACCESS_KEY!;
const secretKey = process.env.MINIO_SECRET_KEY!;
export const BUCKET = process.env.MINIO_BUCKET!;

export const minio = new Client({ endPoint, port, useSSL, accessKey, secretKey, region: "us-east-1" });

// Basic verification logs (non-sensitive)
if (process.env.NODE_ENV !== "production") {
  // Do not log credentials
  console.log("[minio] Initialized client", {
    endPoint,
    port,
    useSSL,
    bucket: BUCKET,
    region: "us-east-1",
  });
}

export async function ensureBucket() {
  if (process.env.NODE_ENV !== "production") {
    console.log("[minio] Checking bucket existence", { bucket: BUCKET });
  }
  const exists = await minio.bucketExists(BUCKET).catch(() => false);
  if (!exists) {
    if (process.env.NODE_ENV !== "production") {
      console.log("[minio] Bucket not found. Creating bucket", { bucket: BUCKET });
    }
    await minio.makeBucket(BUCKET, "us-east-1");
    if (process.env.NODE_ENV !== "production") {
      console.log("[minio] Bucket created", { bucket: BUCKET });
    }
  } else if (process.env.NODE_ENV !== "production") {
    console.log("[minio] Bucket exists", { bucket: BUCKET });
  }
}

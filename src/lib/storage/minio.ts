/**
 * @fileoverview src/lib/storage/minio.ts
 * MinIO client configuration with lazy initialization and dual endpoint support
 */

import { Client } from "minio";
import { logger } from "@/lib/logger";
import { getEnv } from "@/lib/validation/env";

const env = getEnv();
const endPoint = env.MINIO_ENDPOINT;
const port = Number(env.MINIO_PORT || 9000);
const useSSL = !!env.MINIO_SSL;
const accessKey = env.MINIO_ACCESS_KEY;
const secretKey = env.MINIO_SECRET_KEY;
export const BUCKET = env.MINIO_BUCKET;

// External URL for presigned URLs (what browsers will access)
const externalEndPoint = env.MINIO_EXTERNAL_ENDPOINT || endPoint;
const externalPort = Number(env.MINIO_EXTERNAL_PORT || port);
const externalUseSSL = (env.MINIO_EXTERNAL_SSL ?? useSSL) as boolean;

// Lazy initialization to avoid errors during build time when env vars are not available
let _minio: Client | null = null;
let _minioExternal: Client | null = null;

/**
 * Gets internal MinIO client for server-side operations
 * @returns {Client} Configured MinIO client
 * @throws {Error} When required environment variables are missing
 */
function getMinioClient(): Client {
  if (!_minio) {
    // Validate required environment variables
    if (!endPoint || !accessKey || !secretKey || !BUCKET) {
      throw new Error("MinIO configuration is incomplete. Required environment variables: MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET");
    }
    _minio = new Client({ endPoint, port, useSSL, accessKey, secretKey, region: "us-east-1" });
  }
  return _minio;
}

/**
 * Gets external MinIO client for browser-accessible presigned URLs
 * @returns {Client} Configured MinIO client with external endpoint
 * @throws {Error} When required environment variables are missing
 */
function getMinioExternalClient(): Client {
  if (!_minioExternal) {
    // Validate required environment variables
    if (!externalEndPoint || !accessKey || !secretKey || !BUCKET) {
      throw new Error("MinIO configuration is incomplete. Required environment variables: MINIO_EXTERNAL_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET");
    }
    _minioExternal = new Client({ 
      endPoint: externalEndPoint, 
      port: externalPort, 
      useSSL: externalUseSSL, 
      accessKey, 
      secretKey, 
      region: "us-east-1" 
    });
  }
  return _minioExternal;
}

export const minio = new Proxy({} as Client, {
  get(target, prop) {
    return getMinioClient()[prop as keyof Client];
  }
});

export const minioExternal = new Proxy({} as Client, {
  get(target, prop) {
    return getMinioExternalClient()[prop as keyof Client];
  }
});

/**
 * Ensures the MinIO bucket exists, creating it if necessary
 * @returns {Promise<void>} Resolves when bucket is confirmed to exist
 */
export async function ensureBucket() {
  const exists = await minio.bucketExists(BUCKET).catch(() => false);
  
  if (!exists) {
    await minio.makeBucket(BUCKET, "us-east-1");
    // Log bucket creation as it's a significant infrastructure event
    logger.info("MinIO bucket created", { bucket: BUCKET });
  }
}

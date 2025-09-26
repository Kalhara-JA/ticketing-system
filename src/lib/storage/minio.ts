/**
 * @fileoverview src/lib/storage/minio.ts
 * MinIO client configuration with lazy initialization and dual endpoint support
 */

import { Client } from "minio";
import { logger } from "@/lib/logger";
import { getEnv } from "@/lib/validation/env";

// Function to get fresh bucket name (important for tests)
export function getBucket() {
  return getFreshEnv().MINIO_BUCKET;
}

// Lazy initialization to avoid errors during build time when env vars are not available
let _minio: Client | null = null;
let _minioExternal: Client | null = null;

// Function to reset clients (useful for tests)
export function resetMinioClients() {
  _minio = null;
  _minioExternal = null;
}

// Function to get fresh environment variables (for tests)
function getFreshEnv() {
  return getEnv();
}

/**
 * Gets internal MinIO client for server-side operations
 * @returns {Client} Configured MinIO client
 * @throws {Error} When required environment variables are missing
 */
function getMinioClient(): Client {
  if (!_minio) {
    // Get fresh environment variables (important for tests)
    const freshEnv = getFreshEnv();
    const freshEndPoint = freshEnv.MINIO_ENDPOINT;
    const freshPort = Number(freshEnv.MINIO_PORT || 9000);
    const freshUseSSL = !!freshEnv.MINIO_SSL;
    const freshAccessKey = freshEnv.MINIO_ACCESS_KEY;
    const freshSecretKey = freshEnv.MINIO_SECRET_KEY;
    const freshBucket = freshEnv.MINIO_BUCKET;
    
    // Validate required environment variables
    if (!freshEndPoint || !freshAccessKey || !freshSecretKey || !freshBucket) {
      throw new Error("MinIO configuration is incomplete. Required environment variables: MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET");
    }
    _minio = new Client({ endPoint: freshEndPoint, port: freshPort, useSSL: freshUseSSL, accessKey: freshAccessKey, secretKey: freshSecretKey, region: "us-east-1" });
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
    // Get fresh environment variables (important for tests)
    const freshEnv = getFreshEnv();
    const freshExternalEndPoint = freshEnv.MINIO_EXTERNAL_ENDPOINT || freshEnv.MINIO_ENDPOINT;
    const freshExternalPort = Number(freshEnv.MINIO_EXTERNAL_PORT || freshEnv.MINIO_PORT || 9000);
    const freshExternalUseSSL = (freshEnv.MINIO_EXTERNAL_SSL ?? freshEnv.MINIO_SSL) as boolean;
    const freshAccessKey = freshEnv.MINIO_ACCESS_KEY;
    const freshSecretKey = freshEnv.MINIO_SECRET_KEY;
    const freshBucket = freshEnv.MINIO_BUCKET;
    
    // Validate required environment variables
    if (!freshExternalEndPoint || !freshAccessKey || !freshSecretKey || !freshBucket) {
      throw new Error("MinIO configuration is incomplete. Required environment variables: MINIO_EXTERNAL_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET");
    }
    _minioExternal = new Client({ 
      endPoint: freshExternalEndPoint, 
      port: freshExternalPort, 
      useSSL: freshExternalUseSSL, 
      accessKey: freshAccessKey, 
      secretKey: freshSecretKey, 
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
  const bucket = getBucket();
  const exists = await minio.bucketExists(bucket).catch((error) => {
    logger.warn("MinIO bucket check failed, will attempt to create", { bucket, error: error.message });
    return false;
  });
  
  if (!exists) {
    try {
      await minio.makeBucket(bucket, "us-east-1");
      // Log bucket creation as it's a significant infrastructure event
      logger.info("MinIO bucket created", { bucket });
    } catch (error) {
      logger.error("Failed to create MinIO bucket", { bucket, error: (error as Error).message });
      throw error;
    }
  }
}

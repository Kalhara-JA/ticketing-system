/**
 * @fileoverview src/lib/storage/presign.ts
 * MinIO presigned URL generation for secure file uploads and downloads
 */

import { minio, minioExternal, BUCKET, ensureBucket } from "./minio";
import { logger } from "@/lib/logger";

/**
 * Generates a presigned URL for file upload
 * @param {string} key - Storage key for the file
 * @param {number} expirySeconds - URL expiry time in seconds (default: 15 minutes)
 * @returns {Promise<string>} Presigned upload URL
 */
export async function presignUpload(key: string, expirySeconds = 900) {
    // Ensure bucket exists before issuing presigned URLs
    await ensureBucket();
    
    // Use external client for presigned URLs so browsers can access them
    return minioExternal.presignedPutObject(BUCKET, key, expirySeconds);
}

/**
 * Generates a presigned URL for file download
 * @param {string} key - Storage key for the file
 * @param {number} expirySeconds - URL expiry time in seconds (default: 15 minutes)
 * @param {Record<string, string>} resHeaders - Optional response headers
 * @returns {Promise<string>} Presigned download URL
 */
export async function presignDownload(key: string, expirySeconds = 900, resHeaders?: Record<string, string>) {
    await ensureBucket();
    
    // Use external client for presigned URLs so browsers can access them
    return minioExternal.presignedGetObject(BUCKET, key, expirySeconds, resHeaders);
}

/**
 * Deletes an object from MinIO storage
 * @param {string} key - Storage key for the file to delete
 * @returns {Promise<void>} Resolves when object is deleted
 */
export async function deleteObject(key: string) {
    await minio.removeObject(BUCKET, key);
}

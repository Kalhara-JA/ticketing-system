// src/lib/storage/presign.ts
import { minio, BUCKET, ensureBucket } from "./minio";

export async function presignUpload(key: string, expirySeconds = 900) {
    // Ensure bucket exists before issuing presigned URLs
    await ensureBucket();
    if (process.env.NODE_ENV !== "production") {
        console.log("[minio] Presigning PUT", { bucket: BUCKET, key, expirySeconds });
    }
    return minio.presignedPutObject(BUCKET, key, expirySeconds);
}
export async function presignDownload(key: string, expirySeconds = 900, resHeaders?: Record<string, string>) {
    await ensureBucket();
    if (process.env.NODE_ENV !== "production") {
        console.log("[minio] Presigning GET", { bucket: BUCKET, key, expirySeconds, resHeaders });
    }
    // Pass response header overrides as signing parameters; do NOT modify URL after signing
    return minio.presignedGetObject(BUCKET, key, expirySeconds, resHeaders);
}
export async function deleteObject(key: string) {
    await minio.removeObject(BUCKET, key);
}

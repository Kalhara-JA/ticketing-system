// src/lib/storage/presign.ts
import { minio, BUCKET } from "./minio";

export async function presignUpload(key: string, expirySeconds = 900) {
    return minio.presignedPutObject(BUCKET, key, expirySeconds);
}
export async function presignDownload(key: string, expirySeconds = 900) {
    return minio.presignedGetObject(BUCKET, key, expirySeconds);
}
export async function deleteObject(key: string) {
    await minio.removeObject(BUCKET, key);
}

// src/lib/storage/minio.ts
import { Client } from "minio";

const endPoint = process.env.MINIO_ENDPOINT!;
const port = Number(process.env.MINIO_PORT || 9000);
const useSSL = process.env.MINIO_SSL === "true";
const accessKey = process.env.MINIO_ACCESS_KEY!;
const secretKey = process.env.MINIO_SECRET_KEY!;
export const BUCKET = process.env.MINIO_BUCKET!;

export const minio = new Client({ endPoint, port, useSSL, accessKey, secretKey, region: "us-east-1" });

export async function ensureBucket() {
  const exists = await minio.bucketExists(BUCKET).catch(() => false);
  if (!exists) await minio.makeBucket(BUCKET, "us-east-1");
}

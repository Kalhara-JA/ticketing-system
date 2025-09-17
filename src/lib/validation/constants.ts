// src/lib/validation/constants.ts
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const ATTACHMENT_ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg"] as const;
export const ATTACHMENT_MAX_COUNT = 5;
export const DEFAULT_PAGE_SIZE = 20;
export const USERNAME_REGEX = /^[a-z0-9._-]{3,32}$/i;

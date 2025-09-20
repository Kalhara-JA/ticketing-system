/**
 * @fileoverview src/lib/validation/constants.ts
 * Validation constants for file uploads, usernames, and business rules
 */

// File upload constraints
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024; // 10MB
export const ATTACHMENT_ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg"] as const;
export const ATTACHMENT_MAX_COUNT = 5; // Maximum attachments per ticket

// Username validation pattern (3-32 chars, alphanumeric + . _ -)
export const USERNAME_REGEX = /^[a-z0-9._-]{3,32}$/i;

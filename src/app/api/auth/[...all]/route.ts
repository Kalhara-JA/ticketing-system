/**
 * @fileoverview src/app/api/auth/[...all]/route.ts
 * Better Auth API route handler for all authentication operations
 */

import { auth } from "@/lib/auth/auth";
import { toNextJsHandler } from "better-auth/next-js";

// Export GET and POST handlers for Better Auth operations
export const { GET, POST } = toNextJsHandler(auth.handler);

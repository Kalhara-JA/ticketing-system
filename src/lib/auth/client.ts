/**
 * @fileoverview src/lib/auth/client.ts
 * Better Auth client configuration for React components
 */

import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "@/lib/auth/auth";

// Client-side auth instance with type inference for additional fields
export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>()],
});

/**
 * @fileoverview src/app/api/config/route.ts
 * API route to expose public configuration to the client
 */

import { NextResponse } from "next/server";
import { getEnv } from "@/lib/validation/env";

/**
 * Returns public configuration that can be safely exposed to the client
 * @returns {Promise<NextResponse>} JSON response with public configuration
 */
export async function GET() {
    const env = getEnv();
    
    return NextResponse.json({
        enableAttachments: env.ENABLE_ATTACHMENTS,
    });
}

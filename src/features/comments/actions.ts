/**
 * @fileoverview src/features/comments/actions.ts
 * Server actions for comment operations (deletion)
 */

"use server";

import { headers } from "next/headers";
import { requireUser } from "@/lib/auth/session";
import { commentService } from "@/features/comments/services/commentService";

/**
 * Soft deletes a comment (admin or comment author only)
 * @param {string} commentId - ID of comment to delete
 * @returns {Promise<{id: string}>} Deleted comment ID
 * @throws {Error} When user lacks permission or comment not found
 */
export async function deleteCommentAction(commentId: string) {
  const user = await requireUser();
  const ip = (await headers()).get("x-forwarded-for") ?? null;
  return commentService.softDelete({ user, commentId, ip });
}



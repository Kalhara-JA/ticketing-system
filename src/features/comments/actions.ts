"use server";

import { headers } from "next/headers";
import { requireUser } from "@/lib/auth/session";
import { commentService } from "@/features/comments/services/commentService";

export async function deleteCommentAction(commentId: string) {
  const user = await requireUser();
  const ip = (await headers()).get("x-forwarded-for") ?? null;
  return commentService.softDelete({ user, commentId, ip });
}



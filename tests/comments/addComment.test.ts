/**
 * @fileoverview tests/actions/addComment.test.ts
 * Tests for addCommentAction server action
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { addCommentAction } from "@/features/tickets/actions/userTicket";
import * as commentServiceModule from "@/features/comments/services/commentService";
import * as sessionModule from "@/lib/auth/session";

vi.mock("@/features/comments/services/commentService", () => ({
  commentService: {
    add: vi.fn(),
  },
}));

vi.mock("@/lib/auth/session", () => ({
  requireUser: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue("127.0.0.1"),
  }),
}));

describe("addCommentAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should add comment successfully", async () => {
    const mockUser = {
      id: "user123",
      email: "user@example.com",
      username: "testuser",
      role: "user",
    };
    const mockComment = { id: "comment123" };

    (sessionModule.requireUser as any).mockResolvedValue(mockUser);
    (commentServiceModule.commentService.add as any).mockResolvedValue(mockComment);

    const input = {
      ticketId: "ticket123",
      body: "Test comment",
    };

    const result = await addCommentAction(input);

    expect(result).toEqual({ id: "comment123" });
    expect(commentServiceModule.commentService.add).toHaveBeenCalledWith({
      user: mockUser,
      ticketId: "ticket123",
      body: "Test comment",
      ip: "127.0.0.1",
    });
  });

  it("should throw error when user not authenticated", async () => {
    (sessionModule.requireUser as any).mockRejectedValue(new Error("Unauthorized"));

    const input = {
      ticketId: "ticket123",
      body: "Test comment",
    };

    await expect(addCommentAction(input)).rejects.toThrow("Unauthorized");
  });

  it("should throw error when comment creation fails", async () => {
    const mockUser = {
      id: "user123",
      email: "user@example.com",
      username: "testuser",
      role: "user",
    };

    (sessionModule.requireUser as any).mockResolvedValue(mockUser);
    (commentServiceModule.commentService.add as any).mockRejectedValue(new Error("Forbidden"));

    const input = {
      ticketId: "ticket123",
      body: "Test comment",
    };

    await expect(addCommentAction(input)).rejects.toThrow("Forbidden");
  });

  it("should handle validation errors", async () => {
    const mockUser = {
      id: "user123",
      email: "user@example.com",
      username: "testuser",
      role: "user",
    };

    (sessionModule.requireUser as any).mockResolvedValue(mockUser);

    const input = {
      ticketId: "",
      body: "Test comment",
    };

    await expect(addCommentAction(input)).rejects.toThrow();
  });
});

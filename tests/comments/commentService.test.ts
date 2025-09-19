import { describe, it, expect, beforeEach, vi } from "vitest";
import { commentService } from "@/features/comments/services/commentService";
import * as prismaModule from "@/lib/db/prisma";
import * as notifyModule from "@/lib/email/notify";
import * as emailModule from "@/features/tickets/email";
import * as auditModule from "@/features/audit/audit";

vi.mock("@/lib/db/prisma", () => ({ prisma: { ticket: { findFirst: vi.fn() }, comment: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() } } }));
vi.mock("@/lib/email/notify", () => ({ shouldSendNotification: vi.fn().mockResolvedValue(true) }));
vi.mock("@/features/tickets/email", () => ({ sendCommentAddedEmail: vi.fn() }));
vi.mock("@/features/audit/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/email/resend", () => ({ 
  resend: { emails: { send: vi.fn() } }, 
  EMAIL_FROM: "test@example.com",
  ADMIN_EMAIL: "admin@example.com"
}));

describe("commentService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("add enforces RBAC via ticket ownership", async () => {
    const prisma = (prismaModule as any).prisma;
    const shouldSendNotification = vi.fn().mockResolvedValue(true);
    (notifyModule as any).shouldSendNotification = shouldSendNotification;
    
    prisma.ticket.findFirst.mockResolvedValue({ id: "t1" });
    prisma.comment.create.mockResolvedValue({ 
      id: "c1", 
      ticket: { 
        id: "t1", 
        title: "Test Ticket", 
        userId: "u1",
        user: { email: "user@example.com" } 
      } 
    });
    const res = await commentService.add({ 
      user: { id: "u1", role: "user", email: "user@example.com" }, 
      ticketId: "t1", 
      body: "Test comment" 
    });
    expect(res.id).toBe("c1");
    expect(shouldSendNotification).toHaveBeenCalledWith("t1", "comment_added");
    expect((emailModule as any).sendCommentAddedEmail).toHaveBeenCalledWith({
      ticketId: "t1",
      title: "Test Ticket",
      recipientEmail: "admin@example.com"
    }, "admin");
    expect((auditModule as any).audit).toHaveBeenCalledWith("u1", "comment:add", "comment", "c1", { ticketId: "t1" }, null);
  });

  it("softDelete allows admin or author", async () => {
    const prisma = (prismaModule as any).prisma;
    prisma.comment.findUnique.mockResolvedValue({ id: "c1", authorId: "u1", ticketId: "t1" });
    prisma.comment.update.mockResolvedValue({ id: "c1" });
    const res = await commentService.softDelete({ user: { id: "admin", role: "admin" }, commentId: "c1" });
    expect(res.id).toBe("c1");
  });
});



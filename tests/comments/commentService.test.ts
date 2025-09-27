import { describe, it, expect, beforeEach, vi } from "vitest";
import { commentService } from "@/features/comments/services/commentService";
import { prisma } from "@/lib/db/prisma";
import * as notifyModule from "@/lib/email/notify";
import * as emailModule from "@/features/tickets/email";
import * as auditModule from "@/features/audit/audit";

// Mock the prisma client
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    ticket: { findFirst: vi.fn() },
    comment: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() }
  }
}));

// Get the mocked prisma instance
const mockPrisma = vi.mocked(prisma);
vi.mock("@/lib/email/notify", () => ({ shouldSendNotification: vi.fn().mockResolvedValue(true) }));
vi.mock("@/features/tickets/email", () => ({ sendCommentAddedEmail: vi.fn() }));
vi.mock("@/features/audit/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/email/resend", () => ({ 
  resend: { emails: { send: vi.fn() } }, 
  getEmailFrom: vi.fn(() => "test@example.com"),
  getAdminEmail: vi.fn(() => "admin@example.com")
}));

describe("commentService", () => {
  const mockUser = { id: "u1", role: "user", email: "user@example.com" };
  const mockAdmin = { id: "admin1", role: "admin", email: "admin@example.com" };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("add", () => {
    it("enforces RBAC via ticket ownership for users", async () => {
      const shouldSendNotification = vi.fn().mockResolvedValue(true);
      (notifyModule as any).shouldSendNotification = shouldSendNotification;
      
      mockPrisma.ticket.findFirst.mockResolvedValue({ id: "t1" });
      mockPrisma.comment.create.mockResolvedValue({ 
        id: "c1", 
        ticket: { 
          id: "t1", 
          title: "Test Ticket", 
          userId: "u1",
          user: { email: "user@example.com" } 
        } 
      });
      
      const res = await commentService.add({ 
        user: mockUser, 
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

    it("allows admin to comment on any ticket", async () => {
      const shouldSendNotification = vi.fn().mockResolvedValue(true);
      (notifyModule as any).shouldSendNotification = shouldSendNotification;
      
      mockPrisma.ticket.findFirst.mockResolvedValue({ id: "t1" }); // Admin can access any ticket
      mockPrisma.comment.create.mockResolvedValue({ 
        id: "c1", 
        ticket: { 
          id: "t1", 
          title: "Test Ticket", 
          userId: "u1",
          user: { email: "user@example.com" } 
        } 
      });
      
      const res = await commentService.add({ 
        user: mockAdmin, 
        ticketId: "t1", 
        body: "Admin comment" 
      });
      
      expect(res.id).toBe("c1");
      expect((emailModule as any).sendCommentAddedEmail).toHaveBeenCalledWith({
        ticketId: "t1",
        title: "Test Ticket",
        recipientEmail: "user@example.com"
      }, "user");
    });

    it("rejects user commenting on other user's ticket", async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue(null); // No ticket found for this user
      
      await expect(commentService.add({ 
        user: mockUser, 
        ticketId: "t1", 
        body: "Test comment" 
      })).rejects.toThrow("Forbidden");
    });

    it("handles notification throttling", async () => {
      const shouldSendNotification = vi.fn().mockResolvedValue(false); // Throttled
      (notifyModule as any).shouldSendNotification = shouldSendNotification;
      
      mockPrisma.ticket.findFirst.mockResolvedValue({ id: "t1" });
      mockPrisma.comment.create.mockResolvedValue({ 
        id: "c1", 
        ticket: { 
          id: "t1", 
          title: "Test Ticket", 
          userId: "u1",
          user: { email: "user@example.com" } 
        } 
      });
      
      await commentService.add({ 
        user: mockUser, 
        ticketId: "t1", 
        body: "Test comment" 
      });
      
      expect(shouldSendNotification).toHaveBeenCalledWith("t1", "comment_added");
      expect((emailModule as any).sendCommentAddedEmail).not.toHaveBeenCalled();
    });

    it("handles IP address in audit log", async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue({ id: "t1" });
      mockPrisma.comment.create.mockResolvedValue({ 
        id: "c1", 
        ticket: { 
          id: "t1", 
          title: "Test Ticket", 
          userId: "u1",
          user: { email: "user@example.com" } 
        } 
      });
      
      await commentService.add({ 
        user: mockUser, 
        ticketId: "t1", 
        body: "Test comment",
        ip: "192.168.1.1"
      });
      
      expect((auditModule as any).audit).toHaveBeenCalledWith("u1", "comment:add", "comment", "c1", { ticketId: "t1" }, "192.168.1.1");
    });
  });

  describe("softDelete", () => {
    it("allows admin to delete any comment", async () => {
      mockPrisma.comment.findUnique.mockResolvedValue({ 
        id: "c1", 
        authorId: "u1", 
        ticketId: "t1" 
      });
      mockPrisma.comment.update.mockResolvedValue({ id: "c1" });
      
      const res = await commentService.softDelete({ 
        user: mockAdmin, 
        commentId: "c1" 
      });
      
      expect(res.id).toBe("c1");
      expect(mockPrisma.comment.update).toHaveBeenCalledWith({
        where: { id: "c1" },
        data: { deletedAt: expect.any(Date) }
      });
      expect((auditModule as any).audit).toHaveBeenCalledWith("admin1", "comment:delete", "comment", "c1", { ticketId: "t1" }, null);
    });

    it("allows author to delete their own comment", async () => {
      mockPrisma.comment.findUnique.mockResolvedValue({ 
        id: "c1", 
        authorId: "u1", 
        ticketId: "t1" 
      });
      mockPrisma.comment.update.mockResolvedValue({ id: "c1" });
      
      const res = await commentService.softDelete({ 
        user: mockUser, 
        commentId: "c1" 
      });
      
      expect(res.id).toBe("c1");
      expect((auditModule as any).audit).toHaveBeenCalledWith("u1", "comment:delete", "comment", "c1", { ticketId: "t1" }, null);
    });

    it("rejects user deleting other user's comment", async () => {
      mockPrisma.comment.findUnique.mockResolvedValue({ 
        id: "c1", 
        authorId: "u2", // Different author
        ticketId: "t1" 
      });
      
      await expect(commentService.softDelete({ 
        user: mockUser, 
        commentId: "c1" 
      })).rejects.toThrow("Forbidden");
    });

    it("throws error for non-existent comment", async () => {
      mockPrisma.comment.findUnique.mockResolvedValue(null);
      
      await expect(commentService.softDelete({ 
        user: mockAdmin, 
        commentId: "nonexistent" 
      })).rejects.toThrow("Not found");
    });

    it("handles IP address in audit log", async () => {
      mockPrisma.comment.findUnique.mockResolvedValue({ 
        id: "c1", 
        authorId: "u1", 
        ticketId: "t1" 
      });
      mockPrisma.comment.update.mockResolvedValue({ id: "c1" });
      
      await commentService.softDelete({ 
        user: mockUser, 
        commentId: "c1",
        ip: "10.0.0.1"
      });
      
      expect((auditModule as any).audit).toHaveBeenCalledWith("u1", "comment:delete", "comment", "c1", { ticketId: "t1" }, "10.0.0.1");
    });
  });
});



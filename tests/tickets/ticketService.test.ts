import { describe, it, expect, beforeEach, vi } from "vitest";
import { ticketService } from "@/features/tickets/services/ticketService";
import { prisma } from "@/lib/db/prisma";
import * as emailModule from "@/features/tickets/email";
import * as auditModule from "@/features/audit/audit";
import * as notifyModule from "@/lib/email/notify";

// Mock the prisma client
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    ticket: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn()
    }
  }
}));

// Get the mocked prisma instance
const mockPrisma = vi.mocked(prisma);
vi.mock("@/features/tickets/email", () => ({ 
  sendTicketCreatedEmail: vi.fn(), 
  sendStatusChangedEmail: vi.fn(), 
  sendReopenedEmail: vi.fn() 
}));
vi.mock("@/features/audit/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/email/notify", () => ({ shouldSendNotification: vi.fn().mockResolvedValue(true) }));

describe("ticketService", () => {
  const mockUser = { id: "u1", email: "u@example.com", username: "u", role: "user" as const };
  const mockAdmin = { id: "admin1", role: "admin" as const, email: "admin@example.com", username: "admin" };
  const mockTicket = { 
    id: "t1", 
    title: "Test Ticket", 
    status: "new" as const, 
    priority: "normal" as const,
    userId: "u1",
    user: { email: "u@example.com" },
    resolvedAt: null,
    closedAt: null
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createTicket", () => {
    it("validates attachment key scope and creates ticket", async () => {
      mockPrisma.ticket.create.mockResolvedValue({ id: "t1", title: "Title" });
      
      const res = await ticketService.createTicket({
        user: mockUser,
        title: "Title",
        body: "Body",
        attachments: [{ name: "a.pdf", key: "u/u1/incoming/x", size: 1, contentType: "application/pdf" }],
      });
      
      expect(res.id).toBe("t1");
      expect((emailModule as any).sendTicketCreatedEmail).toHaveBeenCalledWith({
        ticketId: "t1",
        title: "Title",
        userEmail: "u@example.com",
        userUsername: "u"
      });
      expect((auditModule as any).audit).toHaveBeenCalledWith("u1", "ticket:create", "ticket", "t1", { title: "Title" }, null);
    });

    it("rejects foreign attachment key", async () => {
      await expect(ticketService.createTicket({
        user: mockUser,
        title: "t",
        body: "b",
        attachments: [{ name: "a.pdf", key: "u/u2/incoming/x", size: 1, contentType: "application/pdf" }],
      })).rejects.toThrow("Invalid attachment key");
    });

    it("creates ticket without attachments", async () => {
      mockPrisma.ticket.create.mockResolvedValue({ id: "t1", title: "Title" });
      
      const res = await ticketService.createTicket({
        user: mockUser,
        title: "Title",
        body: "Body",
        attachments: [],
      });
      
      expect(res.id).toBe("t1");
      expect(mockPrisma.ticket.create).toHaveBeenCalledWith({
        data: {
          title: "Title",
          body: "Body",
          userId: "u1",
          attachments: { create: [] }
        },
        select: { id: true, title: true }
      });
    });
  });

  describe("updatePriority", () => {
    it("allows admin to update priority", async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(mockTicket);
      mockPrisma.ticket.update.mockResolvedValue({ id: "t1", priority: "high" });
      
      const res = await ticketService.updatePriority({
        admin: mockAdmin,
        ticketId: "t1",
        priority: "high",
      });
      
      expect(res.priority).toBe("high");
      expect((auditModule as any).audit).toHaveBeenCalledWith("admin1", "ticket:priority_change", "ticket", "t1", { from: "normal", to: "high" }, null);
    });

    it("rejects non-admin users", async () => {
      await expect(ticketService.updatePriority({
        admin: { ...mockUser, role: "user" as const },
        ticketId: "t1",
        priority: "high",
      })).rejects.toThrow("Forbidden");
    });

    it("rejects invalid priority", async () => {
      await expect(ticketService.updatePriority({
        admin: mockAdmin,
        ticketId: "t1",
        priority: "invalid" as any,
      })).rejects.toThrow("Invalid priority");
    });

    it("returns same priority if unchanged", async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(mockTicket);
      
      const res = await ticketService.updatePriority({
        admin: mockAdmin,
        ticketId: "t1",
        priority: "normal",
      });
      
      expect(res.priority).toBe("normal");
      expect(mockPrisma.ticket.update).not.toHaveBeenCalled();
    });

    it("throws error for non-existent ticket", async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(null);
      
      await expect(ticketService.updatePriority({
        admin: mockAdmin,
        ticketId: "nonexistent",
        priority: "high",
      })).rejects.toThrow("Not found");
    });
  });

  describe("updateStatus", () => {
    it("allows valid status transitions", async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(mockTicket);
      mockPrisma.ticket.update.mockResolvedValue({ id: "t1", status: "in_progress", title: "Test Ticket", user: { email: "u@example.com" } });
      
      const res = await ticketService.updateStatus({
        admin: mockAdmin,
        ticketId: "t1",
        status: "in_progress",
      });
      
      expect(res.status).toBe("in_progress");
      expect((auditModule as any).audit).toHaveBeenCalledWith("admin1", "ticket:status_change", "ticket", "t1", { from: "new", to: "in_progress" }, null);
      expect((emailModule as any).sendStatusChangedEmail).toHaveBeenCalled();
    });

    it("allows admins to bypass status transition restrictions", async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({ ...mockTicket, status: "closed" });
      mockPrisma.ticket.update.mockResolvedValue({ id: "t1", status: "in_progress", title: "Test Ticket", user: { email: "u@example.com" } });
      
      const res = await ticketService.updateStatus({
        admin: mockAdmin,
        ticketId: "t1",
        status: "in_progress",
      });
      
      expect(res.status).toBe("in_progress");
      expect((auditModule as any).audit).toHaveBeenCalledWith("admin1", "ticket:status_change", "ticket", "t1", { from: "closed", to: "in_progress" }, null);
    });


    it("sets resolvedAt when status becomes resolved", async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({ ...mockTicket, status: "in_progress" });
      mockPrisma.ticket.update.mockResolvedValue({ id: "t1", status: "resolved", title: "Test Ticket", user: { email: "u@example.com" } });
      
      await ticketService.updateStatus({
        admin: mockAdmin,
        ticketId: "t1",
        status: "resolved",
      });
      
      expect(mockPrisma.ticket.update).toHaveBeenCalledWith({
        where: { id: "t1" },
        data: { 
          status: "resolved", 
          resolvedAt: expect.any(Date), 
          closedAt: null 
        },
        select: { id: true, status: true, title: true, user: { select: { email: true } } }
      });
    });

    it("sets closedAt when status becomes closed", async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({ ...mockTicket, status: "resolved" });
      mockPrisma.ticket.update.mockResolvedValue({ id: "t1", status: "closed", title: "Test Ticket", user: { email: "u@example.com" } });
      
      await ticketService.updateStatus({
        admin: mockAdmin,
        ticketId: "t1",
        status: "closed",
      });
      
      expect(mockPrisma.ticket.update).toHaveBeenCalledWith({
        where: { id: "t1" },
        data: { 
          status: "closed", 
          closedAt: expect.any(Date) 
        },
        select: { id: true, status: true, title: true, user: { select: { email: true } } }
      });
    });

    it("rejects non-admin users", async () => {
      await expect(ticketService.updateStatus({
        admin: { ...mockUser, role: "user" as const },
        ticketId: "t1",
        status: "in_progress",
      })).rejects.toThrow("Forbidden");
    });

    it("rejects invalid status", async () => {
      await expect(ticketService.updateStatus({
        admin: mockAdmin,
        ticketId: "t1",
        status: "invalid" as any,
      })).rejects.toThrow("Invalid status");
    });
  });

  describe("reopen", () => {
    it("allows admin to reopen any ticket", async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({ ...mockTicket, status: "closed" });
      mockPrisma.ticket.update.mockResolvedValue({ id: "t1", title: "Test Ticket" });
      
      const res = await ticketService.reopen({
        actor: mockAdmin,
        ticketId: "t1",
      });
      
      expect(res.status).toBe("reopened");
      expect((auditModule as any).audit).toHaveBeenCalledWith("admin1", "ticket:reopen", "ticket", "t1", {}, null);
    });

    it("allows user to reopen their own resolved ticket within window", async () => {
      const recentResolvedAt = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
      mockPrisma.ticket.findUnique.mockResolvedValue({ 
        ...mockTicket, 
        status: "resolved", 
        resolvedAt: recentResolvedAt,
        userId: "u1"
      });
      mockPrisma.ticket.update.mockResolvedValue({ id: "t1", title: "Test Ticket" });
      
      const res = await ticketService.reopen({
        actor: mockUser,
        ticketId: "t1",
      });
      
      expect(res.status).toBe("reopened");
      expect((emailModule as any).sendReopenedEmail).toHaveBeenCalled();
    });

    it("rejects user reopening ticket outside window", async () => {
      const oldResolvedAt = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000); // 20 days ago
      mockPrisma.ticket.findUnique.mockResolvedValue({ 
        ...mockTicket, 
        status: "resolved", 
        resolvedAt: oldResolvedAt,
        userId: "u1"
      });
      
      await expect(ticketService.reopen({
        actor: mockUser,
        ticketId: "t1",
      })).rejects.toThrow("Reopen window elapsed");
    });

    it("rejects user reopening non-resolved ticket", async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({ 
        ...mockTicket, 
        status: "in_progress",
        userId: "u1"
      });
      
      await expect(ticketService.reopen({
        actor: mockUser,
        ticketId: "t1",
      })).rejects.toThrow("Only resolved tickets can be reopened by the requester");
    });

    it("rejects user reopening other user's ticket", async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({ 
        ...mockTicket, 
        status: "resolved",
        userId: "u2" // different user
      });
      
      await expect(ticketService.reopen({
        actor: mockUser,
        ticketId: "t1",
      })).rejects.toThrow("Forbidden");
    });

    it("throws error for non-existent ticket", async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(null);
      
      await expect(ticketService.reopen({
        actor: mockAdmin,
        ticketId: "nonexistent",
      })).rejects.toThrow("Not found");
    });

    it("clears resolvedAt and closedAt when reopening", async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({ 
        ...mockTicket, 
        status: "resolved",
        resolvedAt: new Date(),
        closedAt: new Date()
      });
      mockPrisma.ticket.update.mockResolvedValue({ id: "t1", title: "Test Ticket" });
      
      await ticketService.reopen({
        actor: mockAdmin,
        ticketId: "t1",
      });
      
      expect(mockPrisma.ticket.update).toHaveBeenCalledWith({
        where: { id: "t1" },
        data: { 
          status: "reopened", 
          resolvedAt: null, 
          closedAt: null 
        },
        select: { id: true, title: true }
      });
    });
  });
});



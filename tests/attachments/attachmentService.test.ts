import { describe, it, expect, beforeEach, vi } from "vitest";
import { attachmentService } from "@/features/attachments/services/attachmentService";
import { prisma } from "@/lib/db/prisma";
import * as auditModule from "@/features/audit/audit";

// Mock the prisma client
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    ticket: { findFirst: vi.fn() },
    attachment: {
      count: vi.fn(),
      createMany: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn()
    }
  }
}));

// Get the mocked prisma instance
const mockPrisma = vi.mocked(prisma);
vi.mock("@/features/audit/audit", () => ({ audit: vi.fn() }));

describe("attachmentService", () => {
  const mockUser = { id: "u1", role: "user" };
  const mockAdmin = { id: "admin1", role: "admin" };
  const mockTicket = { id: "t1", userId: "u1" };
  const mockAttachment = {
    id: "a1",
    key: "u/u1/incoming/file.pdf",
    ticket: { id: "t1", userId: "u1" },
    uploadedById: "u1"
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("add", () => {
    it("allows user to add attachments to their own ticket", async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue(mockTicket);
      mockPrisma.attachment.count.mockResolvedValue(2);
      mockPrisma.attachment.createMany.mockResolvedValue({ count: 1 });

      const files = [{ name: "test.pdf", key: "u/u1/incoming/test.pdf", size: 1024, contentType: "application/pdf" }];
      
      const res = await attachmentService.add({
        user: mockUser,
        ticketId: "t1",
        files,
      });

      expect(res.added).toBe(1);
      expect(mockPrisma.attachment.createMany).toHaveBeenCalledWith({
        data: [{
          ticketId: "t1",
          filename: "test.pdf",
          key: "u/u1/incoming/test.pdf",
          size: 1024,
          contentType: "application/pdf",
          uploadedById: "u1"
        }],
        skipDuplicates: true
      });
      expect((auditModule as any).audit).toHaveBeenCalledWith("u1", "attachment:add", "ticket", "t1", { count: 1 }, null);
    });

    it("allows admin to add attachments to any ticket", async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue(mockTicket);
      mockPrisma.attachment.count.mockResolvedValue(1);
      mockPrisma.attachment.createMany.mockResolvedValue({ count: 1 });

      const files = [{ name: "admin.pdf", key: "u/admin1/incoming/admin.pdf", size: 2048, contentType: "application/pdf" }];
      
      const res = await attachmentService.add({
        user: mockAdmin,
        ticketId: "t1",
        files,
      });

      expect(res.added).toBe(1);
      expect((auditModule as any).audit).toHaveBeenCalledWith("admin1", "attachment:add", "ticket", "t1", { count: 1 }, null);
    });

    it("rejects user adding attachments to other user's ticket", async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue(null); // No ticket found for this user

      const files = [{ name: "test.pdf", key: "u/u1/incoming/test.pdf", size: 1024, contentType: "application/pdf" }];
      
      await expect(attachmentService.add({
        user: mockUser,
        ticketId: "t1",
        files,
      })).rejects.toThrow("You don't have permission to add attachments to this ticket.");
    });

    it("rejects invalid attachment keys for non-admin users", async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue(mockTicket);
      mockPrisma.attachment.count.mockResolvedValue(0);

      const files = [{ name: "test.pdf", key: "u/u2/incoming/test.pdf", size: 1024, contentType: "application/pdf" }];
      
      await expect(attachmentService.add({
        user: mockUser,
        ticketId: "t1",
        files,
      })).rejects.toThrow("Invalid attachment key. Please try uploading again.");
    });

    it("enforces 5 attachment limit per ticket", async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue(mockTicket);
      mockPrisma.attachment.count.mockResolvedValue(4); // Already 4 attachments

      const files = [
        { name: "test1.pdf", key: "u/u1/incoming/test1.pdf", size: 1024, contentType: "application/pdf" },
        { name: "test2.pdf", key: "u/u1/incoming/test2.pdf", size: 1024, contentType: "application/pdf" }
      ]; // Trying to add 2 more (would be 6 total)
      
      await expect(attachmentService.add({
        user: mockUser,
        ticketId: "t1",
        files,
      })).rejects.toThrow("Maximum 5 attachments allowed. You currently have 4 attachments and are trying to add 2 more.");
    });

    it("allows exactly 5 attachments", async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue(mockTicket);
      mockPrisma.attachment.count.mockResolvedValue(3); // 3 existing

      const files = [
        { name: "test1.pdf", key: "u/u1/incoming/test1.pdf", size: 1024, contentType: "application/pdf" },
        { name: "test2.pdf", key: "u/u1/incoming/test2.pdf", size: 1024, contentType: "application/pdf" }
      ]; // Adding 2 more (total 5)
      
      mockPrisma.attachment.createMany.mockResolvedValue({ count: 2 });
      
      const res = await attachmentService.add({
        user: mockUser,
        ticketId: "t1",
        files,
      });

      expect(res.added).toBe(2);
    });

    it("handles multiple files correctly", async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue(mockTicket);
      mockPrisma.attachment.count.mockResolvedValue(0);
      mockPrisma.attachment.createMany.mockResolvedValue({ count: 3 });

      const files = [
        { name: "test1.pdf", key: "u/u1/incoming/test1.pdf", size: 1024, contentType: "application/pdf" },
        { name: "test2.png", key: "u/u1/incoming/test2.png", size: 2048, contentType: "image/png" },
        { name: "test3.jpg", key: "u/u1/incoming/test3.jpg", size: 3072, contentType: "image/jpeg" }
      ];
      
      const res = await attachmentService.add({
        user: mockUser,
        ticketId: "t1",
        files,
      });

      expect(res.added).toBe(3);
      expect(mockPrisma.attachment.createMany).toHaveBeenCalledWith({
        data: [
          { ticketId: "t1", filename: "test1.pdf", key: "u/u1/incoming/test1.pdf", size: 1024, contentType: "application/pdf", uploadedById: "u1" },
          { ticketId: "t1", filename: "test2.png", key: "u/u1/incoming/test2.png", size: 2048, contentType: "image/png", uploadedById: "u1" },
          { ticketId: "t1", filename: "test3.jpg", key: "u/u1/incoming/test3.jpg", size: 3072, contentType: "image/jpeg", uploadedById: "u1" }
        ],
        skipDuplicates: true
      });
    });
  });

  describe("remove", () => {
    it("allows user to remove their own attachments", async () => {
      mockPrisma.attachment.findUnique.mockResolvedValue(mockAttachment);
      mockPrisma.attachment.delete.mockResolvedValue({ id: "a1" });

      const res = await attachmentService.remove({
        user: mockUser,
        attachmentId: "a1",
      });

      expect(res.id).toBe("a1");
      expect(res.ticketId).toBe("t1");
      expect(mockPrisma.attachment.delete).toHaveBeenCalledWith({ where: { id: "a1" } });
      expect((auditModule as any).audit).toHaveBeenCalledWith("u1", "attachment:remove", "ticket", "t1", { attachmentId: "a1" }, null);
    });

    it("allows admin to remove any attachment", async () => {
      mockPrisma.attachment.findUnique.mockResolvedValue(mockAttachment);
      mockPrisma.attachment.delete.mockResolvedValue({ id: "a1" });

      const res = await attachmentService.remove({
        user: mockAdmin,
        attachmentId: "a1",
      });

      expect(res.id).toBe("a1");
      expect((auditModule as any).audit).toHaveBeenCalledWith("admin1", "attachment:remove", "ticket", "t1", { attachmentId: "a1" }, null);
    });

    it("allows ticket owner to remove any attachment from their ticket", async () => {
      const attachmentByOtherUser = { ...mockAttachment, uploadedById: "u2" };
      mockPrisma.attachment.findUnique.mockResolvedValue(attachmentByOtherUser);
      mockPrisma.attachment.delete.mockResolvedValue({ id: "a1" });

      const res = await attachmentService.remove({
        user: mockUser, // Ticket owner
        attachmentId: "a1",
      });

      expect(res.id).toBe("a1");
      expect((auditModule as any).audit).toHaveBeenCalledWith("u1", "attachment:remove", "ticket", "t1", { attachmentId: "a1" }, null);
    });

    it("rejects user removing attachment from other user's ticket", async () => {
      const attachmentFromOtherTicket = { 
        ...mockAttachment, 
        ticket: { id: "t2", userId: "u2" },
        uploadedById: "u2"
      };
      mockPrisma.attachment.findUnique.mockResolvedValue(attachmentFromOtherTicket);

      await expect(attachmentService.remove({
        user: mockUser,
        attachmentId: "a1",
      })).rejects.toThrow("You don't have permission to remove this attachment.");
    });

    it("allows ticket owner to remove attachment uploaded by someone else from their ticket", async () => {
      const attachmentByOtherUser = { 
        ...mockAttachment, 
        uploadedById: "u2" // Different uploader, but same ticket owner
      };
      mockPrisma.attachment.findUnique.mockResolvedValue(attachmentByOtherUser);
      mockPrisma.attachment.delete.mockResolvedValue({ id: "a1" });

      const res = await attachmentService.remove({
        user: mockUser, // Ticket owner
        attachmentId: "a1",
      });

      expect(res.id).toBe("a1");
      expect((auditModule as any).audit).toHaveBeenCalledWith("u1", "attachment:remove", "ticket", "t1", { attachmentId: "a1" }, null);
    });

    it("throws error for non-existent attachment", async () => {
      mockPrisma.attachment.findUnique.mockResolvedValue(null);

      await expect(attachmentService.remove({
        user: mockUser,
        attachmentId: "nonexistent",
      })).rejects.toThrow("Attachment not found.");
    });

    it("handles IP address in audit log", async () => {
      mockPrisma.attachment.findUnique.mockResolvedValue(mockAttachment);
      mockPrisma.attachment.delete.mockResolvedValue({ id: "a1" });

      await attachmentService.remove({
        user: mockUser,
        attachmentId: "a1",
        ip: "192.168.1.1",
      });

      expect((auditModule as any).audit).toHaveBeenCalledWith("u1", "attachment:remove", "ticket", "t1", { attachmentId: "a1" }, "192.168.1.1");
    });
  });
});

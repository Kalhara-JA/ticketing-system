import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { ticketService } from "@/features/tickets/services/ticketService";
import { attachmentService } from "@/features/attachments/services/attachmentService";

// Mock email sending to avoid network calls
vi.mock("@/lib/email/resend", () => {
  return {
    resend: { emails: { send: vi.fn(async () => ({ id: "test" })) } },
    EMAIL_FROM: "test@example.com",
    ADMIN_EMAIL: "admin@example.com",
  };
});

describe("attachments integration", () => {
  beforeEach(async () => {
    await prisma.attachment.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.notificationDedup.deleteMany();
    await prisma.user.deleteMany();
  });

  it("adds then removes an attachment with RBAC rules", async () => {
    const uid = `u_${Math.random().toString(36).slice(2)}`;
    const adminId = `a_${Math.random().toString(36).slice(2)}`;
    await prisma.user.createMany({
      data: [
        { id: uid, name: "U", email: `${uid}@e.com`, username: `u_${uid}`, role: "user" },
        { id: adminId, name: "A", email: `${adminId}@e.com`, username: `a_${adminId}`, role: "admin" },
      ],
      skipDuplicates: true,
    });

    const t = await ticketService.createTicket({ user: { id: uid, email: `${uid}@e.com`, username: `u_${uid}` }, title: "T", body: "B", attachments: [] });

    // Verify ticket exists in DB
    const dbTicket = await prisma.ticket.findUnique({ where: { id: t.id } });
    expect(dbTicket).toBeTruthy();
    expect(dbTicket?.userId).toBe(uid);

    // Add one attachment by owner
    const addRes = await attachmentService.add({
      user: { id: uid, role: "user" },
      ticketId: t.id,
      files: [{ name: "a.txt", key: `u/${uid}/a.txt`, size: 1, contentType: "text/plain" }],
    });
    expect(addRes.added).toBe(1);

    const a = await prisma.attachment.findFirstOrThrow({ where: { ticketId: t.id } });

    // Remove by admin
    const removed = await attachmentService.remove({ user: { id: adminId, role: "admin" }, attachmentId: a.id });
    expect(removed.id).toBe(a.id);
  });
});



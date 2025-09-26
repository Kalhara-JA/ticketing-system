import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { ticketService } from "@/features/tickets/services/ticketService";
import { attachmentService } from "@/features/attachments/services/attachmentService";
import { presignUpload, presignDownload } from "@/lib/storage/presign";

// Mock email sending to avoid network calls
vi.mock("@/lib/email/resend", () => {
  return {
    resend: { emails: { send: vi.fn(async () => ({ id: "test" })) } },
    EMAIL_FROM: "test@example.com",
    ADMIN_EMAIL: "admin@example.com",
  };
});

describe("attachments with MinIO integration", () => {
  beforeEach(async () => {
    await prisma.attachment.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.notificationDedup.deleteMany();
    await prisma.user.deleteMany();
  });

  it("generates presigned URLs and manages attachments end-to-end", async () => {
    const uid = `u_${Math.random().toString(36).slice(2)}`;
    await prisma.user.create({
      data: { id: uid, name: "U", email: `${uid}@e.com`, username: `u_${uid}`, role: "user" },
    });

    // Create ticket
    const t = await ticketService.createTicket({
      user: { id: uid, email: `${uid}@e.com`, username: `u_${uid}` },
      title: "Test Ticket",
      body: "Body",
      attachments: [],
    });

    // Retry MinIO operations with exponential backoff
    const retryMinioOperation = async (operation: () => Promise<any>, maxRetries = 3) => {
      for (let i = 0; i < maxRetries; i++) {
        try {
          return await operation();
        } catch (error) {
          if (i === maxRetries - 1) throw error;
          console.log(`MinIO operation failed, retrying in ${(i + 1) * 1000}ms...`);
          await new Promise(resolve => setTimeout(resolve, (i + 1) * 1000));
        }
      }
    };

    // Generate presigned upload URL with retry
    const key = `u/${uid}/test-file.txt`;
    const uploadUrl = await retryMinioOperation(() => presignUpload(key, 900));
    expect(uploadUrl).toContain("http");
    expect(uploadUrl).toContain(key);

    // Add attachment to ticket
    const addRes = await attachmentService.add({
      user: { id: uid, role: "user" },
      ticketId: t.id,
      files: [{ name: "test-file.txt", key, size: 1024, contentType: "text/plain" }],
    });
    expect(addRes.added).toBe(1);

    // Generate presigned download URL with retry
    const downloadUrl = await retryMinioOperation(() => presignDownload(key, 900));
    expect(downloadUrl).toContain("http");
    expect(downloadUrl).toContain(key);

    // Verify attachment in DB
    const attachment = await prisma.attachment.findFirst({ where: { ticketId: t.id } });
    expect(attachment?.key).toBe(key);
    expect(attachment?.filename).toBe("test-file.txt");
  });
});

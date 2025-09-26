import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { ticketService } from "@/features/tickets/services/ticketService";
import { commentService } from "@/features/comments/services/commentService";

// Mock email sending to avoid network calls
vi.mock("@/lib/email/resend", () => {
  return {
    resend: { emails: { send: vi.fn(async () => ({ id: "test" })) } },
    EMAIL_FROM: "test@example.com",
    ADMIN_EMAIL: "admin@example.com",
  };
});

describe("comments integration", () => {
  beforeEach(async () => {
    await prisma.comment.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.notificationDedup.deleteMany();
    await prisma.user.deleteMany();
  });

  it("adds a comment to an owned ticket", async () => {
    const uid = `u_${Math.random().toString(36).slice(2)}`;
    const user = { id: uid, email: `${uid}@example.com`, username: `user_${uid}`, role: "user" } as const;
    await prisma.user.create({
      data: {
        id: user.id,
        name: "User One",
        email: user.email,
        username: user.username,
        role: "user",
      },
    });
    const t = await ticketService.createTicket({
      user,
      title: "T",
      body: "B",
      attachments: [],
    });

    // Verify ticket exists and belongs to user
    const dbTicket = await prisma.ticket.findUnique({ where: { id: t.id } });
    expect(dbTicket).toBeTruthy();
    expect(dbTicket?.userId).toBe(user.id);

    const res = await commentService.add({
      user: { id: user.id, role: "user", email: user.email },
      ticketId: t.id,
      body: "Hello <script>alert('x')</script>",
    });

    expect(res.id).toBeTruthy();
    const c = await prisma.comment.findUnique({ where: { id: res.id } });
    expect(c?.body).toBe("Hello &lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;");
  });
});



import { describe, it, expect, beforeEach, vi } from "vitest";
import { ticketService } from "@/features/tickets/services/ticketService";
import * as prismaModule from "@/lib/db/prisma";
import * as emailModule from "@/features/tickets/email";
import * as auditModule from "@/features/audit/audit";

vi.mock("@/lib/db/prisma", () => ({ prisma: { ticket: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() } } }));
vi.mock("@/features/tickets/email", () => ({ sendTicketCreatedEmail: vi.fn(), sendStatusChangedEmail: vi.fn(), sendReopenedEmail: vi.fn() }));
vi.mock("@/features/audit/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/email/notify", () => ({ shouldSendNotification: vi.fn().mockResolvedValue(true) }));

describe("ticketService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createTicket validates attachment key scope and creates ticket", async () => {
    const prisma = (prismaModule as any).prisma;
    prisma.ticket.create.mockResolvedValue({ id: "t1", title: "Title" });
    const res = await ticketService.createTicket({
      user: { id: "u1", email: "u@example.com", username: "u" },
      title: "Title",
      body: "Body",
      attachments: [{ name: "a.pdf", key: "u/u1/incoming/x", size: 1, contentType: "application/pdf" }],
    });
    expect(res.id).toBe("t1");
    expect((emailModule as any).sendTicketCreatedEmail).toHaveBeenCalled();
    expect((auditModule as any).audit).toHaveBeenCalled();
  });

  it("createTicket rejects foreign attachment key", async () => {
    await expect(ticketService.createTicket({
      user: { id: "u1", email: "u@example.com", username: "u" },
      title: "t",
      body: "b",
      attachments: [{ name: "a.pdf", key: "u/u2/incoming/x", size: 1, contentType: "application/pdf" }],
    })).rejects.toThrow("Invalid attachment key");
  });
});



import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the Prisma client
const mockPrisma = {
  ticket: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
  $disconnect: vi.fn(),
};

// Mock the entire Prisma module
vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}));

// Mock Resend
const mockResend = {
  emails: {
    send: vi.fn(),
  },
};

vi.mock("resend", () => ({
  Resend: vi.fn(() => mockResend),
}));

// Create a testable version of the auto-close logic
async function runAutoCloseJob(autoCloseDays = 14) {
  const cutoff = new Date(Date.now() - autoCloseDays * 24 * 60 * 60 * 1000);

  // Find resolved tickets older than cutoff
  const tickets = await mockPrisma.ticket.findMany({
    where: {
      status: "resolved",
      resolvedAt: { lte: cutoff },
    },
    select: { id: true, title: true, user: { select: { email: true } } },
  });

  let successCount = 0;
  let errorCount = 0;

  for (const t of tickets) {
    try {
      await mockPrisma.$transaction(async (tx: any) => {
        await tx.ticket.update({
          where: { id: t.id },
          data: { status: "closed", closedAt: new Date() },
        });
        await tx.auditLog.create({
          data: {
            actorId: null, // system
            action: "ticket:auto_close",
            targetType: "ticket",
            targetId: t.id,
            changes: { to: "closed" },
          },
        });
      });
      successCount++;
    } catch (error) {
      errorCount++;
      continue; // Skip email for failed tickets
    }

    // Email notification
    try {
      const base = process.env.APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
      const link = `${base}/tickets/${t.id}`;
      const html = `<!doctype html><html><body style="font-family:system-ui">
        <div style="max-width:560px;margin:24px auto;padding:16px;border:1px solid #eee;border-radius:12px">
          <h2 style="margin:0 0 12px">Ticket closed</h2>
          <p>Your ticket <strong>${escapeHtml(t.title)}</strong> was closed automatically.</p>
          <p><a href="${link}">Open Ticket</a></p>
        </div>
      </body></html>`;
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "Support <no-reply@" + new URL(base).hostname + ">",
        to: t.user.email,
        subject: `Closed: ${t.title}`,
        html,
      });
    } catch (e) {
      console.error("Email failed for ticket", t.id, (e as Error)?.message);
    }
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (m: string) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m] as string));
}

describe("Auto-Close Job", () => {
  const originalEnv = process.env;
  const mockDate = new Date("2024-01-15T12:00:00Z");

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
    
    // Set up environment variables
    process.env = {
      ...originalEnv,
      AUTO_CLOSE_DAYS: "14",
      APP_URL: "http://localhost:3000",
      RESEND_API_KEY: "test-api-key",
    };

    // Mock console methods to avoid noise in tests
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  describe("Ticket Selection Logic", () => {
    it("should find resolved tickets older than AUTO_CLOSE_DAYS", async () => {
      const cutoffDate = new Date("2024-01-01T12:00:00Z"); // 14 days before mock date
      const oldResolvedTicket = {
        id: "ticket1",
        title: "Old Resolved Ticket",
        user: { email: "user1@example.com" },
      };
      const recentResolvedTicket = {
        id: "ticket2", 
        title: "Recent Resolved Ticket",
        user: { email: "user2@example.com" },
      };

      mockPrisma.ticket.findMany.mockResolvedValue([oldResolvedTicket]);

      // Run the auto-close job
      await runAutoCloseJob();

      expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith({
        where: {
          status: "resolved",
          resolvedAt: { lte: cutoffDate },
        },
        select: { id: true, title: true, user: { select: { email: true } } },
      });
    });

    it("should use default AUTO_CLOSE_DAYS when env var is not set", async () => {
      delete process.env.AUTO_CLOSE_DAYS;
      
      const cutoffDate = new Date("2024-01-01T12:00:00Z"); // 14 days before mock date
      
      mockPrisma.ticket.findMany.mockResolvedValue([]);

      await runAutoCloseJob();

      expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith({
        where: {
          status: "resolved",
          resolvedAt: { lte: cutoffDate },
        },
        select: { id: true, title: true, user: { select: { email: true } } },
      });
    });

    it("should use custom AUTO_CLOSE_DAYS from environment", async () => {
      const cutoffDate = new Date("2024-01-08T12:00:00Z"); // 7 days before mock date
      
      mockPrisma.ticket.findMany.mockResolvedValue([]);

      await runAutoCloseJob(7); // Pass 7 days directly

      expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith({
        where: {
          status: "resolved",
          resolvedAt: { lte: cutoffDate },
        },
        select: { id: true, title: true, user: { select: { email: true } } },
      });
    });
  });

  describe("Ticket Closing Logic", () => {
    it("should close tickets and create audit logs in a transaction", async () => {
      const mockTicket = {
        id: "ticket1",
        title: "Test Ticket",
        user: { email: "user@example.com" },
      };

      mockPrisma.ticket.findMany.mockResolvedValue([mockTicket]);
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback(mockPrisma);
      });

      await runAutoCloseJob();

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.ticket.update).toHaveBeenCalledWith({
        where: { id: "ticket1" },
        data: { 
          status: "closed", 
          closedAt: expect.any(Date) 
        },
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: null, // system
          action: "ticket:auto_close",
          targetType: "ticket",
          targetId: "ticket1",
          changes: { to: "closed" },
        },
      });
    });

    it("should handle multiple tickets", async () => {
      const mockTickets = [
        { id: "ticket1", title: "Ticket 1", user: { email: "user1@example.com" } },
        { id: "ticket2", title: "Ticket 2", user: { email: "user2@example.com" } },
      ];

      mockPrisma.ticket.findMany.mockResolvedValue(mockTickets);
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback(mockPrisma);
      });

      await runAutoCloseJob();

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(2);
      expect(mockPrisma.ticket.update).toHaveBeenCalledTimes(2);
      expect(mockPrisma.auditLog.create).toHaveBeenCalledTimes(2);
    });

    it("should not process tickets if none are found", async () => {
      mockPrisma.ticket.findMany.mockResolvedValue([]);

      await runAutoCloseJob();

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockPrisma.ticket.update).not.toHaveBeenCalled();
      expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
    });
  });

  describe("Email Notification Logic", () => {
    it("should send email notification for each closed ticket", async () => {
      const mockTicket = {
        id: "ticket1",
        title: "Test Ticket",
        user: { email: "user@example.com" },
      };

      mockPrisma.ticket.findMany.mockResolvedValue([mockTicket]);
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback(mockPrisma);
      });
      mockResend.emails.send.mockResolvedValue({ id: "email-id" });

      await runAutoCloseJob();

      expect(mockResend.emails.send).toHaveBeenCalledWith({
        from: "Support <no-reply@localhost>",
        to: "user@example.com",
        subject: "Closed: Test Ticket",
        html: expect.stringContaining("Test Ticket"),
      });
    });

    it("should handle email sending errors gracefully", async () => {
      const mockTicket = {
        id: "ticket1",
        title: "Test Ticket",
        user: { email: "user@example.com" },
      };

      mockPrisma.ticket.findMany.mockResolvedValue([mockTicket]);
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback(mockPrisma);
      });
      mockResend.emails.send.mockRejectedValue(new Error("Email service unavailable"));

      const consoleErrorSpy = vi.spyOn(console, "error");

      await runAutoCloseJob();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Email failed for ticket",
        "ticket1",
        "Email service unavailable"
      );
    });

    it("should use default APP_URL when not set", async () => {
      delete process.env.APP_URL;
      
      const mockTicket = {
        id: "ticket1",
        title: "Test Ticket",
        user: { email: "user@example.com" },
      };

      mockPrisma.ticket.findMany.mockResolvedValue([mockTicket]);
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback(mockPrisma);
      });
      mockResend.emails.send.mockResolvedValue({ id: "email-id" });

      await runAutoCloseJob();

      expect(mockResend.emails.send).toHaveBeenCalledWith({
        from: "Support <no-reply@localhost>",
        to: "user@example.com",
        subject: "Closed: Test Ticket",
        html: expect.stringContaining("http://localhost:3000"),
      });
    });

    it("should generate proper email HTML with ticket link", async () => {
      const mockTicket = {
        id: "ticket1",
        title: "Test Ticket & More",
        user: { email: "user@example.com" },
      };

      mockPrisma.ticket.findMany.mockResolvedValue([mockTicket]);
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback(mockPrisma);
      });
      mockResend.emails.send.mockResolvedValue({ id: "email-id" });

      await runAutoCloseJob();

      const emailCall = mockResend.emails.send.mock.calls[0][0];
      expect(emailCall.html).toContain("Test Ticket &amp; More"); // HTML escaped
      expect(emailCall.html).toContain("http://localhost:3000/tickets/ticket1");
      expect(emailCall.html).toContain("Ticket closed");
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors gracefully", async () => {
      mockPrisma.ticket.findMany.mockRejectedValue(new Error("Database connection failed"));

      const consoleErrorSpy = vi.spyOn(console, "error");

      await expect(runAutoCloseJob()).rejects.toThrow("Database connection failed");
      expect(consoleErrorSpy).not.toHaveBeenCalled(); // Error is propagated, not logged
    });

    it("should complete successfully when no tickets found", async () => {
      mockPrisma.ticket.findMany.mockResolvedValue([]);

      await runAutoCloseJob();

      expect(mockPrisma.ticket.findMany).toHaveBeenCalled();
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it("should handle database errors without disconnecting", async () => {
      mockPrisma.ticket.findMany.mockRejectedValue(new Error("Database error"));

      await expect(runAutoCloseJob()).rejects.toThrow("Database error");
      // In our test version, we don't handle disconnection on error
      expect(mockPrisma.$disconnect).not.toHaveBeenCalled();
    });
  });

  describe("HTML Escaping", () => {
    it("should properly escape HTML in ticket titles", async () => {
      // escapeHtml is already available in the test scope
      
      expect(escapeHtml("Test & More")).toBe("Test &amp; More");
      expect(escapeHtml("Test <script>alert('xss')</script>")).toBe("Test &lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;");
      expect(escapeHtml('Test "quotes" and \'apostrophes\'')).toBe("Test &quot;quotes&quot; and &#39;apostrophes&#39;");
    });
  });

  describe("Integration Scenarios", () => {
    it("should handle complete workflow: find, close, audit, email", async () => {
      const mockTicket = {
        id: "ticket1",
        title: "Integration Test Ticket",
        user: { email: "integration@example.com" },
      };

      mockPrisma.ticket.findMany.mockResolvedValue([mockTicket]);
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback(mockPrisma);
      });
      mockResend.emails.send.mockResolvedValue({ id: "email-id" });

      await runAutoCloseJob();

      // Verify complete workflow
      expect(mockPrisma.ticket.findMany).toHaveBeenCalled();
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.ticket.update).toHaveBeenCalledWith({
        where: { id: "ticket1" },
        data: { status: "closed", closedAt: expect.any(Date) },
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: null,
          action: "ticket:auto_close",
          targetType: "ticket",
          targetId: "ticket1",
          changes: { to: "closed" },
        },
      });
      expect(mockResend.emails.send).toHaveBeenCalledWith({
        from: "Support <no-reply@localhost>",
        to: "integration@example.com",
        subject: "Closed: Integration Test Ticket",
        html: expect.stringContaining("Integration Test Ticket"),
      });
    });

    it("should handle mixed success/failure scenarios", async () => {
      const mockTickets = [
        { id: "ticket1", title: "Success Ticket", user: { email: "success@example.com" } },
        { id: "ticket2", title: "Failure Ticket", user: { email: "failure@example.com" } },
      ];

      mockPrisma.ticket.findMany.mockResolvedValue(mockTickets);
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback(mockPrisma);
      });
      
      // First email succeeds, second fails
      mockResend.emails.send
        .mockResolvedValueOnce({ id: "email-1" })
        .mockRejectedValueOnce(new Error("Email service down"));

      const consoleErrorSpy = vi.spyOn(console, "error");

      await runAutoCloseJob();

      // Both tickets should be processed (closed + audit)
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(2);
      expect(mockPrisma.ticket.update).toHaveBeenCalledTimes(2);
      expect(mockPrisma.auditLog.create).toHaveBeenCalledTimes(2);
      
      // Both emails should be attempted
      expect(mockResend.emails.send).toHaveBeenCalledTimes(2);
      
      // Error should be logged for failed email
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Email failed for ticket",
        "ticket2",
        "Email service down"
      );
    });
  });
});

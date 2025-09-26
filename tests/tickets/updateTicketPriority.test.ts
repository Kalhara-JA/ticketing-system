/**
 * @fileoverview tests/actions/updateTicketPriority.test.ts
 * Tests for updateTicketPriorityAction server action
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateTicketPriorityAction } from "@/features/tickets/actions/adminTicket";
import * as ticketServiceModule from "@/features/tickets/services/ticketService";
import * as sessionModule from "@/lib/auth/session";

vi.mock("@/features/tickets/services/ticketService", () => ({
  ticketService: {
    updatePriority: vi.fn(),
  },
}));

vi.mock("@/lib/auth/session", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue("127.0.0.1"),
  }),
}));

describe("updateTicketPriorityAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should update ticket priority successfully", async () => {
    const mockAdmin = {
      id: "admin123",
      email: "admin@example.com",
      username: "admin",
      role: "admin",
    };
    const mockResult = { id: "ticket123", priority: "high" };

    (sessionModule.requireAdmin as any).mockResolvedValue(mockAdmin);
    (ticketServiceModule.ticketService.updatePriority as any).mockResolvedValue(mockResult);

    const result = await updateTicketPriorityAction("ticket123", "high");

    expect(result).toEqual({ id: "ticket123", priority: "high" });
    expect(ticketServiceModule.ticketService.updatePriority).toHaveBeenCalledWith({
      admin: mockAdmin,
      ticketId: "ticket123",
      priority: "high",
      ip: "127.0.0.1",
    });
  });

  it("should throw error when user not admin", async () => {
    (sessionModule.requireAdmin as any).mockRejectedValue(new Error("Forbidden"));

    await expect(updateTicketPriorityAction("ticket123", "high")).rejects.toThrow("Forbidden");
  });

  it("should throw error when priority update fails", async () => {
    const mockAdmin = {
      id: "admin123",
      email: "admin@example.com",
      username: "admin",
      role: "admin",
    };

    (sessionModule.requireAdmin as any).mockResolvedValue(mockAdmin);
    (ticketServiceModule.ticketService.updatePriority as any).mockRejectedValue(new Error("Ticket not found"));

    await expect(updateTicketPriorityAction("ticket123", "high")).rejects.toThrow("Ticket not found");
  });

  it("should handle validation errors", async () => {
    const mockAdmin = {
      id: "admin123",
      email: "admin@example.com",
      username: "admin",
      role: "admin",
    };

    (sessionModule.requireAdmin as any).mockResolvedValue(mockAdmin);

    await expect(updateTicketPriorityAction("", "invalid" as any)).rejects.toThrow();
  });
});

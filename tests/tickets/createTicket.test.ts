/**
 * @fileoverview tests/actions/createTicket.test.ts
 * Tests for createTicketAction server action
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTicketAction } from "@/features/tickets/actions/createTicket";
import * as ticketServiceModule from "@/features/tickets/services/ticketService";
import * as sessionModule from "@/lib/auth/session";

vi.mock("@/features/tickets/services/ticketService", () => ({
  ticketService: {
    createTicket: vi.fn(),
  },
}));

vi.mock("@/lib/auth/session", () => ({
  requireUser: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue("127.0.0.1"),
  }),
}));

describe("createTicketAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create ticket successfully", async () => {
    const mockUser = {
      id: "user123",
      email: "user@example.com",
      username: "testuser",
    };
    const mockTicket = { id: "ticket123" };

    (sessionModule.requireUser as any).mockResolvedValue(mockUser);
    (ticketServiceModule.ticketService.createTicket as any).mockResolvedValue(mockTicket);

    const input = {
      title: "Test Ticket",
      body: "Test description",
      attachments: [],
    };

    const result = await createTicketAction(input);

    expect(result).toEqual({ id: "ticket123" });
    expect(ticketServiceModule.ticketService.createTicket).toHaveBeenCalledWith({
      user: mockUser,
      title: "Test Ticket",
      body: "Test description",
      attachments: [],
      ip: "127.0.0.1",
    });
  });

  it("should create ticket with attachments", async () => {
    const mockUser = {
      id: "user123",
      email: "user@example.com",
      username: "testuser",
    };
    const mockTicket = { id: "ticket123" };

    (sessionModule.requireUser as any).mockResolvedValue(mockUser);
    (ticketServiceModule.ticketService.createTicket as any).mockResolvedValue(mockTicket);

    const input = {
      title: "Test Ticket",
      body: "Test description",
      attachments: [
        {
          name: "test.pdf",
          key: "u/user123/incoming/test.pdf",
          size: 1024,
          contentType: "application/pdf" as const,
        },
      ],
    };

    const result = await createTicketAction(input);

    expect(result).toEqual({ id: "ticket123" });
    expect(ticketServiceModule.ticketService.createTicket).toHaveBeenCalledWith({
      user: mockUser,
      title: "Test Ticket",
      body: "Test description",
      attachments: input.attachments,
      ip: "127.0.0.1",
    });
  });

  it("should throw error when user not authenticated", async () => {
    (sessionModule.requireUser as any).mockRejectedValue(new Error("Unauthorized"));

    const input = {
      title: "Test Ticket",
      body: "Test description",
      attachments: [],
    };

    await expect(createTicketAction(input)).rejects.toThrow("Unauthorized");
  });

  it("should throw error when ticket creation fails", async () => {
    const mockUser = {
      id: "user123",
      email: "user@example.com",
      username: "testuser",
    };

    (sessionModule.requireUser as any).mockResolvedValue(mockUser);
    (ticketServiceModule.ticketService.createTicket as any).mockRejectedValue(new Error("Database error"));

    const input = {
      title: "Test Ticket",
      body: "Test description",
      attachments: [],
    };

    await expect(createTicketAction(input)).rejects.toThrow("Database error");
  });
});

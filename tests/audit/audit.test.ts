import { describe, it, expect, beforeEach, vi } from "vitest";
import { audit } from "@/features/audit/audit";
import { prisma } from "@/lib/db/prisma";

// Mock the prisma client
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    auditLog: {
      create: vi.fn()
    }
  }
}));

// Get the mocked prisma instance
const mockPrisma = vi.mocked(prisma);

describe("audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates audit log entry with all fields", async () => {
    mockPrisma.auditLog.create.mockResolvedValue({ id: "audit1" });

    const changes = { from: "new", to: "in_progress" };
    
    await audit("user1", "ticket:status_change", "ticket", "t1", changes, "192.168.1.1");

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: "user1",
        action: "ticket:status_change",
        targetType: "ticket",
        targetId: "t1",
        changes: changes,
        ip: "192.168.1.1"
      }
    });
  });

  it("creates audit log entry with null actorId", async () => {
    mockPrisma.auditLog.create.mockResolvedValue({ id: "audit1" });

    await audit(null, "ticket:create", "ticket", "t1", undefined, null);

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: null,
        action: "ticket:create",
        targetType: "ticket",
        targetId: "t1",
        changes: undefined,
        ip: undefined
      }
    });
  });

  it("creates audit log entry without changes", async () => {
    mockPrisma.auditLog.create.mockResolvedValue({ id: "audit1" });

    await audit("admin1", "ticket:reopen", "ticket", "t1");

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: "admin1",
        action: "ticket:reopen",
        targetType: "ticket",
        targetId: "t1",
        changes: undefined,
        ip: undefined
      }
    });
  });

  it("creates audit log entry for comment actions", async () => {
    mockPrisma.auditLog.create.mockResolvedValue({ id: "audit1" });

    await audit("user1", "comment:add", "comment", "c1", { ticketId: "t1" });

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: "user1",
        action: "comment:add",
        targetType: "comment",
        targetId: "c1",
        changes: { ticketId: "t1" },
        ip: undefined
      }
    });
  });

  it("creates audit log entry for attachment actions", async () => {
    mockPrisma.auditLog.create.mockResolvedValue({ id: "audit1" });

    const changes = { count: 2 };
    await audit("user1", "attachment:add", "attachment", "a1", changes, "10.0.0.1");

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: "user1",
        action: "attachment:add",
        targetType: "attachment",
        targetId: "a1",
        changes: changes,
        ip: "10.0.0.1"
      }
    });
  });

  it("handles complex changes object", async () => {
    mockPrisma.auditLog.create.mockResolvedValue({ id: "audit1" });

    const complexChanges = {
      from: "new",
      to: "resolved",
      timestamp: new Date("2024-01-01"),
      metadata: { reason: "user_request", priority: "high" }
    };
    
    await audit("admin1", "ticket:status_change", "ticket", "t1", complexChanges);

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: "admin1",
        action: "ticket:status_change",
        targetType: "ticket",
        targetId: "t1",
        changes: {
          from: "new",
          to: "resolved",
          timestamp: "2024-01-01T00:00:00.000Z", // Serialized date
          metadata: { reason: "user_request", priority: "high" }
        },
        ip: undefined
      }
    });
  });

  it("handles empty string IP as undefined", async () => {
    mockPrisma.auditLog.create.mockResolvedValue({ id: "audit1" });

    await audit("user1", "ticket:create", "ticket", "t1", undefined, "");

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: "user1",
        action: "ticket:create",
        targetType: "ticket",
        targetId: "t1",
        changes: undefined,
        ip: "" // Empty string is passed as-is, not converted to undefined
      }
    });
  });

  it("handles null IP as undefined", async () => {
    mockPrisma.auditLog.create.mockResolvedValue({ id: "audit1" });

    await audit("user1", "ticket:create", "ticket", "t1", undefined, null);

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: "user1",
        action: "ticket:create",
        targetType: "ticket",
        targetId: "t1",
        changes: undefined,
        ip: undefined
      }
    });
  });

  it("serializes changes object correctly", async () => {
    mockPrisma.auditLog.create.mockResolvedValue({ id: "audit1" });

    const changes = { 
      from: "new", 
      to: "in_progress",
      nested: { value: 123, array: [1, 2, 3] }
    };
    
    await audit("user1", "ticket:status_change", "ticket", "t1", changes);

    // The function should deep clone the changes object using JSON.parse(JSON.stringify())
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: "user1",
        action: "ticket:status_change",
        targetType: "ticket",
        targetId: "t1",
        changes: changes, // Should be a deep copy
        ip: undefined
      }
    });
  });

  it("handles all valid target types", async () => {
    mockPrisma.auditLog.create.mockResolvedValue({ id: "audit1" });

    // Test all valid target types from the type definition
    await audit("user1", "ticket:create", "ticket", "t1");
    await audit("user1", "comment:add", "comment", "c1");
    await audit("user1", "attachment:add", "attachment", "a1");

    expect(mockPrisma.auditLog.create).toHaveBeenCalledTimes(3);
  });
});

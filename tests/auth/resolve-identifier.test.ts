/**
 * @fileoverview tests/api/resolve-identifier.test.ts
 * Tests for /api/resolve-identifier route
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/resolve-identifier/route";
import * as prismaModule from "@/lib/db/prisma";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe("/api/resolve-identifier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return email when identifier is already an email", async () => {
    const request = new Request("http://localhost/api/resolve-identifier", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier: "user@example.com" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ email: "user@example.com" });
  });

  it("should resolve username to email", async () => {
    const mockUser = { email: "user@example.com" };
    (prismaModule.prisma.user.findFirst as any).mockResolvedValue(mockUser);

    const request = new Request("http://localhost/api/resolve-identifier", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier: "testuser" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ email: "user@example.com" });
    expect(prismaModule.prisma.user.findFirst).toHaveBeenCalledWith({
      where: { username: "testuser" },
      select: { email: true },
    });
  });

  it("should return 400 for invalid identifier", async () => {
    const request = new Request("http://localhost/api/resolve-identifier", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier: "" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: "Invalid identifier" });
  });

  it("should return 400 for non-string identifier", async () => {
    const request = new Request("http://localhost/api/resolve-identifier", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier: 123 }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: "Invalid identifier" });
  });

  it("should return 404 when username not found", async () => {
    (prismaModule.prisma.user.findFirst as any).mockResolvedValue(null);

    const request = new Request("http://localhost/api/resolve-identifier", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier: "nonexistent" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toEqual({ error: "User not found" });
  });

  it("should handle database errors", async () => {
    (prismaModule.prisma.user.findFirst as any).mockRejectedValue(new Error("Database error"));

    const request = new Request("http://localhost/api/resolve-identifier", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier: "testuser" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Server error" });
  });

  it("should handle malformed JSON", async () => {
    const request = new Request("http://localhost/api/resolve-identifier", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "invalid json",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Server error" });
  });
});

/**
 * @fileoverview tests/api/attachments-presign.test.ts
 * Tests for /api/attachments/presign route
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/attachments/presign/route";
import * as presignModule from "@/lib/storage/presign";
import * as sessionModule from "@/lib/auth/session";

vi.mock("@/lib/storage/presign", () => ({
  presignUpload: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe("/api/attachments/presign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    (sessionModule.getSession as any).mockResolvedValue(null);

    const request = new Request("http://localhost/api/attachments/presign", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        filename: "test.pdf",
        contentType: "application/pdf",
        size: 1024,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("should return 400 for invalid filename", async () => {
    (sessionModule.getSession as any).mockResolvedValue({
      user: { id: "user123", role: "user" },
    });

    const request = new Request("http://localhost/api/attachments/presign", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        filename: "",
        contentType: "application/pdf",
        size: 1024,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: "Invalid filename" });
  });

  it("should return 400 for invalid file type", async () => {
    (sessionModule.getSession as any).mockResolvedValue({
      user: { id: "user123", role: "user" },
    });

    const request = new Request("http://localhost/api/attachments/presign", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        filename: "test.txt",
        contentType: "text/plain",
        size: 1024,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: "Invalid file type" });
  });

  it("should return 400 for file too large", async () => {
    (sessionModule.getSession as any).mockResolvedValue({
      user: { id: "user123", role: "user" },
    });

    const request = new Request("http://localhost/api/attachments/presign", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        filename: "test.pdf",
        contentType: "application/pdf",
        size: 50 * 1024 * 1024, // 50MB
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: "File too large" });
  });

  it("should return 400 for invalid size", async () => {
    (sessionModule.getSession as any).mockResolvedValue({
      user: { id: "user123", role: "user" },
    });

    const request = new Request("http://localhost/api/attachments/presign", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        filename: "test.pdf",
        contentType: "application/pdf",
        size: -1,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: "File too large" });
  });

  it("should generate presigned URL successfully", async () => {
    const mockSession = {
      user: { id: "user123", role: "user" },
    };
    const mockPresignedUrl = "https://minio.example.com/presigned-url";
    
    (sessionModule.getSession as any).mockResolvedValue(mockSession);
    (presignModule.presignUpload as any).mockResolvedValue(mockPresignedUrl);

    const request = new Request("http://localhost/api/attachments/presign", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        filename: "test.pdf",
        contentType: "application/pdf",
        size: 1024,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty("url", mockPresignedUrl);
    expect(data).toHaveProperty("key");
    expect(data).toHaveProperty("filename", "test.pdf");
    expect(data.key).toMatch(/^u\/user123\/incoming\/[a-f0-9-]+\.pdf$/);
    
    expect(presignModule.presignUpload).toHaveBeenCalledWith(
      expect.stringMatching(/^u\/user123\/incoming\/[a-f0-9-]+\.pdf$/),
      900
    );
  });

  it("should handle presign errors", async () => {
    (sessionModule.getSession as any).mockResolvedValue({
      user: { id: "user123", role: "user" },
    });
    (presignModule.presignUpload as any).mockRejectedValue(new Error("Storage error"));

    const request = new Request("http://localhost/api/attachments/presign", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        filename: "test.pdf",
        contentType: "application/pdf",
        size: 1024,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Server error" });
  });

  it("should handle malformed JSON", async () => {
    (sessionModule.getSession as any).mockResolvedValue({
      user: { id: "user123", role: "user" },
    });

    const request = new Request("http://localhost/api/attachments/presign", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "invalid json",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: "Invalid filename" });
  });
});

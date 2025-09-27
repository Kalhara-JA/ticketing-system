import { describe, it, expect, beforeEach, vi } from "vitest";
import { listUserTickets, listAllTickets, getUserTicketDetail, getAdminTicketDetail } from "@/features/tickets/repositories/ticketRepository";
import { prisma } from "@/lib/db/prisma";

// Mock the prisma client
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    ticket: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn()
    }
  }
}));

// Get the mocked prisma instance
const mockPrisma = vi.mocked(prisma);

describe("ticketRepository", () => {
  const mockTickets = [
    {
      id: "t1",
      title: "Test Ticket 1",
      status: "new",
      priority: "normal",
      createdAt: new Date("2024-01-01"),
      comments: [{ id: "c1" }]
    },
    {
      id: "t2", 
      title: "Test Ticket 2",
      status: "in_progress",
      priority: "high",
      createdAt: new Date("2024-01-02"),
      comments: []
    }
  ];

  const mockUserTickets = mockTickets.map(t => ({
    ...t,
    user: { username: "testuser", email: "test@example.com" }
  }));

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listUserTickets", () => {
    it("returns paginated user tickets with default parameters", async () => {
      mockPrisma.ticket.count.mockResolvedValue(25);
      mockPrisma.ticket.findMany.mockResolvedValue(mockTickets);

      const result = await listUserTickets({ userId: "u1" });

      expect(result.items).toEqual(mockTickets);
      expect(result.totalCount).toBe(25);
      expect(result.totalPages).toBe(2); // 25 items, 20 per page (default) = Math.ceil(25/20) = 2
      expect(result.currentPage).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.hasNextPage).toBe(true);
      expect(result.hasPreviousPage).toBe(false);

      expect(mockPrisma.ticket.count).toHaveBeenCalledWith({
        where: { userId: "u1" }
      });
      expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith({
        where: { userId: "u1" },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: 0,
        take: 20,
        select: {
          id: true, title: true, status: true, priority: true, createdAt: true,
          comments: { select: { id: true }, take: 1 }
        }
      });
    });

    it("handles custom pagination parameters", async () => {
      mockPrisma.ticket.count.mockResolvedValue(50);
      mockPrisma.ticket.findMany.mockResolvedValue(mockTickets);

      const result = await listUserTickets({ 
        userId: "u1", 
        page: 2, 
        pageSize: 10 
      });

      expect(result.currentPage).toBe(2);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBe(5);
      expect(result.hasNextPage).toBe(true);
      expect(result.hasPreviousPage).toBe(true);

      expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith({
        where: { userId: "u1" },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: 10, // (page 2 - 1) * pageSize 10
        take: 10,
        select: expect.any(Object)
      });
    });

    it("filters by search query", async () => {
      mockPrisma.ticket.count.mockResolvedValue(5);
      mockPrisma.ticket.findMany.mockResolvedValue(mockTickets);

      await listUserTickets({ userId: "u1", q: "test query" });

      expect(mockPrisma.ticket.count).toHaveBeenCalledWith({
        where: {
          userId: "u1",
          OR: [
            { title: { contains: "test query", mode: "insensitive" } },
            { body: { contains: "test query", mode: "insensitive" } }
          ]
        }
      });
    });

    it("filters by status", async () => {
      mockPrisma.ticket.count.mockResolvedValue(3);
      mockPrisma.ticket.findMany.mockResolvedValue(mockTickets);

      await listUserTickets({ userId: "u1", status: ["new", "in_progress"] });

      expect(mockPrisma.ticket.count).toHaveBeenCalledWith({
        where: {
          userId: "u1",
          status: { in: ["new", "in_progress"] }
        }
      });
    });

    it("filters by priority", async () => {
      mockPrisma.ticket.count.mockResolvedValue(2);
      mockPrisma.ticket.findMany.mockResolvedValue(mockTickets);

      await listUserTickets({ userId: "u1", priority: ["high", "urgent"] });

      expect(mockPrisma.ticket.count).toHaveBeenCalledWith({
        where: {
          userId: "u1",
          priority: { in: ["high", "urgent"] }
        }
      });
    });

    it("combines multiple filters", async () => {
      mockPrisma.ticket.count.mockResolvedValue(1);
      mockPrisma.ticket.findMany.mockResolvedValue(mockTickets);

      await listUserTickets({ 
        userId: "u1", 
        q: "urgent", 
        status: ["new"], 
        priority: ["high"] 
      });

      expect(mockPrisma.ticket.count).toHaveBeenCalledWith({
        where: {
          userId: "u1",
          OR: [
            { title: { contains: "urgent", mode: "insensitive" } },
            { body: { contains: "urgent", mode: "insensitive" } }
          ],
          status: { in: ["new"] },
          priority: { in: ["high"] }
        }
      });
    });

    it("handles edge case pagination", async () => {
      mockPrisma.ticket.count.mockResolvedValue(0);
      mockPrisma.ticket.findMany.mockResolvedValue([]);

      const result = await listUserTickets({ userId: "u1", page: 0, pageSize: 0 });

      expect(result.currentPage).toBe(1); // Math.max(1, 0)
      expect(result.pageSize).toBe(1); // Math.max(1, Math.min(0, 100))
      expect(result.totalPages).toBe(0);
    });

    it("enforces maximum page size", async () => {
      mockPrisma.ticket.count.mockResolvedValue(1000);
      mockPrisma.ticket.findMany.mockResolvedValue(mockTickets);

      await listUserTickets({ userId: "u1", pageSize: 200 }); // Over max

      expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith({
        where: { userId: "u1" },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: 0,
        take: 100, // Max enforced
        select: expect.any(Object)
      });
    });
  });

  describe("listAllTickets", () => {
    it("returns paginated admin tickets with user info", async () => {
      mockPrisma.ticket.count.mockResolvedValue(15);
      mockPrisma.ticket.findMany.mockResolvedValue(mockUserTickets);

      const result = await listAllTickets({});

      expect(result.items).toEqual(mockUserTickets);
      expect(result.totalCount).toBe(15);
      expect(result.totalPages).toBe(1);
      expect(result.currentPage).toBe(1);
      expect(result.pageSize).toBe(20);

      expect(mockPrisma.ticket.count).toHaveBeenCalledWith({
        where: {}
      });
      expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: 0,
        take: 20,
        select: {
          id: true, title: true, status: true, priority: true, createdAt: true,
          user: { select: { username: true, email: true } }
        }
      });
    });

    it("filters by requester (username/email)", async () => {
      mockPrisma.ticket.count.mockResolvedValue(3);
      mockPrisma.ticket.findMany.mockResolvedValue(mockUserTickets);

      await listAllTickets({ requester: "john" });

      expect(mockPrisma.ticket.count).toHaveBeenCalledWith({
        where: {
          user: {
            OR: [
              { username: { contains: "john", mode: "insensitive" } },
              { email: { contains: "john", mode: "insensitive" } }
            ]
          }
        }
      });
    });

    it("combines admin filters correctly", async () => {
      mockPrisma.ticket.count.mockResolvedValue(2);
      mockPrisma.ticket.findMany.mockResolvedValue(mockUserTickets);

      await listAllTickets({ 
        q: "bug", 
        status: ["new"], 
        priority: ["high"],
        requester: "testuser"
      });

      expect(mockPrisma.ticket.count).toHaveBeenCalledWith({
        where: {
          OR: [
            { title: { contains: "bug", mode: "insensitive" } },
            { body: { contains: "bug", mode: "insensitive" } }
          ],
          status: { in: ["new"] },
          priority: { in: ["high"] },
          user: {
            OR: [
              { username: { contains: "testuser", mode: "insensitive" } },
              { email: { contains: "testuser", mode: "insensitive" } }
            ]
          }
        }
      });
    });

    it("ignores empty requester filter", async () => {
      mockPrisma.ticket.count.mockResolvedValue(10);
      mockPrisma.ticket.findMany.mockResolvedValue(mockUserTickets);

      await listAllTickets({ requester: "" });

      expect(mockPrisma.ticket.count).toHaveBeenCalledWith({
        where: {}
      });
    });
  });

  describe("getUserTicketDetail", () => {
    it("returns user ticket with full details", async () => {
      const mockDetail = {
        id: "t1",
        title: "Test Ticket",
        body: "Ticket body",
        status: "new",
        priority: "normal",
        createdAt: new Date("2024-01-01"),
        resolvedAt: null,
        attachments: [{ id: "a1", filename: "test.pdf" }],
        comments: [
          {
            id: "c1",
            body: "Test comment",
            createdAt: new Date("2024-01-01"),
            deletedAt: null,
            author: { id: "u1", username: "testuser", role: "user" }
          }
        ]
      };
      mockPrisma.ticket.findFirst.mockResolvedValue(mockDetail);

      const result = await getUserTicketDetail("u1", "t1");

      expect(result).toEqual(mockDetail);
      expect(mockPrisma.ticket.findFirst).toHaveBeenCalledWith({
        where: { id: "t1", userId: "u1" },
        select: {
          id: true, title: true, body: true, status: true, priority: true,
          createdAt: true, resolvedAt: true,
          attachments: { select: { id: true, filename: true, uploadedById: true } },
          comments: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true, body: true, createdAt: true, deletedAt: true,
              author: { select: { id: true, username: true, role: true } }
            }
          }
        }
      });
    });

    it("returns null for non-existent ticket", async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue(null);

      const result = await getUserTicketDetail("u1", "nonexistent");

      expect(result).toBeNull();
    });

    it("returns null for ticket belonging to different user", async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue(null);

      const result = await getUserTicketDetail("u1", "t1"); // Ticket belongs to u2

      expect(result).toBeNull();
    });
  });

  describe("getAdminTicketDetail", () => {
    it("returns admin ticket with full details including attachment keys", async () => {
      const mockDetail = {
        id: "t1",
        title: "Test Ticket",
        body: "Ticket body",
        status: "new",
        priority: "normal",
        createdAt: new Date("2024-01-01"),
        user: { username: "testuser", email: "test@example.com" },
        attachments: [
          { 
            id: "a1", 
            filename: "test.pdf", 
            key: "u/u1/incoming/test.pdf",
            size: 1024,
            contentType: "application/pdf",
            createdAt: new Date("2024-01-01")
          }
        ],
        comments: [
          {
            id: "c1",
            body: "Test comment",
            createdAt: new Date("2024-01-01"),
            deletedAt: null,
            author: { id: "u1", username: "testuser", role: "user" }
          }
        ]
      };
      mockPrisma.ticket.findUnique.mockResolvedValue(mockDetail);

      const result = await getAdminTicketDetail("t1");

      expect(result).toEqual(mockDetail);
      expect(mockPrisma.ticket.findUnique).toHaveBeenCalledWith({
        where: { id: "t1" },
        select: {
          id: true, title: true, body: true, status: true, priority: true,
          createdAt: true,
          user: { select: { username: true, email: true } },
          attachments: { 
            select: { 
              id: true, filename: true, key: true, size: true, 
              contentType: true, createdAt: true, uploadedById: true
            } 
          },
          comments: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true, body: true, createdAt: true, deletedAt: true,
              author: { select: { id: true, username: true, role: true } }
            }
          }
        }
      });
    });

    it("returns null for non-existent ticket", async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(null);

      const result = await getAdminTicketDetail("nonexistent");

      expect(result).toBeNull();
    });
  });
});

/**
 * @fileoverview Integration test flow - runs all integration tests sequentially
 * This simulates a real-world integration test scenario where all components
 * work together in a single test environment.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { ticketService } from "@/features/tickets/services/ticketService";
import { commentService } from "@/features/comments/services/commentService";
import { attachmentService } from "@/features/attachments/services/attachmentService";

// Mock email sending to avoid network calls
vi.mock("@/lib/email/resend", () => {
  return {
    resend: { emails: { send: vi.fn(async () => ({ id: "test" })) } },
    EMAIL_FROM: "test@example.com",
    ADMIN_EMAIL: "admin@example.com",
  };
});

describe("Integration Test Flow", () => {
  let userId: string;
  let adminId: string;
  let ticketId: string;

  beforeEach(async () => {
    // Clean up all data before each test
    await prisma.attachment.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.notificationDedup.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.user.deleteMany();

    // Create test users
    userId = `u_${Math.random().toString(36).slice(2)}`;
    adminId = `a_${Math.random().toString(36).slice(2)}`;
    
    await prisma.user.createMany({
      data: [
        { id: userId, name: "Test User", email: `${userId}@example.com`, username: `user_${userId}`, role: "user" },
        { id: adminId, name: "Test Admin", email: `${adminId}@example.com`, username: `admin_${adminId}`, role: "admin" },
      ],
      skipDuplicates: true,
    });
  });

  it("Complete integration flow: create ticket → comment → attachment → status updates → reopen", async () => {
    console.log("🔄 Starting complete integration test flow...");

    // 1. Create a ticket
    console.log("1️⃣ Creating ticket...");
    const ticket = await ticketService.createTicket({
      user: { id: userId, email: `${userId}@example.com`, username: `user_${userId}` },
      title: "Integration Test Ticket",
      body: "This is a test ticket for integration testing",
      attachments: [],
    });
    ticketId = ticket.id;
    expect(ticket.id).toBeTruthy();
    expect(ticket.title).toBe("Integration Test Ticket");
    console.log("✅ Ticket created:", ticket.id);

    // 2. Add a comment
    console.log("2️⃣ Adding comment...");
    const comment = await commentService.add({
      user: { id: userId, role: "user", email: `${userId}@example.com` },
      ticketId: ticket.id,
      body: "This is a test comment",
    });
    expect(comment.id).toBeTruthy();
    console.log("✅ Comment added:", comment.id);
    
    // Check if comment audit log was created
    const userCommentAuditLogs = await prisma.auditLog.findMany({
      where: { targetId: comment.id, action: "comment:add" },
    });
    console.log("🔍 Comment audit logs:", userCommentAuditLogs.length);

    // 3. Add an attachment
    console.log("3️⃣ Adding attachment...");
    const attachment = await attachmentService.add({
      user: { id: userId, role: "user" },
      ticketId: ticket.id,
      files: [{ name: "test.txt", key: `u/${userId}/test.txt`, size: 100, contentType: "text/plain" }],
    });
    expect(attachment.added).toBe(1);
    console.log("✅ Attachment added");

    // 4. Admin updates priority
    console.log("4️⃣ Admin updating priority...");
    const priorityUpdate = await ticketService.updatePriority({
      admin: { id: adminId, role: "admin", email: `${adminId}@example.com`, username: `admin_${adminId}` } as any,
      ticketId: ticket.id,
      priority: "high" as any,
    });
    expect(priorityUpdate.priority).toBe("high");
    console.log("✅ Priority updated to high");

    // 5. Admin updates status to in_progress
    console.log("5️⃣ Admin updating status to in_progress...");
    const statusUpdate1 = await ticketService.updateStatus({
      admin: { id: adminId, role: "admin", email: `${adminId}@example.com`, username: `admin_${adminId}` } as any,
      ticketId: ticket.id,
      status: "in_progress" as any,
    });
    expect(statusUpdate1.status).toBe("in_progress");
    console.log("✅ Status updated to in_progress");

    // 6. Admin adds a comment
    console.log("6️⃣ Admin adding comment...");
    const adminComment = await commentService.add({
      user: { id: adminId, role: "admin", email: `${adminId}@example.com` },
      ticketId: ticket.id,
      body: "Admin response: Working on this issue",
    });
    expect(adminComment.id).toBeTruthy();
    console.log("✅ Admin comment added");
    
    // Check if admin comment audit log was created
    const adminCommentAuditLogs = await prisma.auditLog.findMany({
      where: { targetId: adminComment.id, action: "comment:add" },
    });
    console.log("🔍 Admin comment audit logs:", adminCommentAuditLogs.length);

    // 7. Admin resolves the ticket
    console.log("7️⃣ Admin resolving ticket...");
    const statusUpdate2 = await ticketService.updateStatus({
      admin: { id: adminId, role: "admin", email: `${adminId}@example.com`, username: `admin_${adminId}` } as any,
      ticketId: ticket.id,
      status: "resolved" as any,
    });
    expect(statusUpdate2.status).toBe("resolved");
    console.log("✅ Ticket resolved");

    // 8. Admin closes the ticket
    console.log("8️⃣ Admin closing ticket...");
    const statusUpdate3 = await ticketService.updateStatus({
      admin: { id: adminId, role: "admin", email: `${adminId}@example.com`, username: `admin_${adminId}` } as any,
      ticketId: ticket.id,
      status: "closed" as any,
    });
    expect(statusUpdate3.status).toBe("closed");
    console.log("✅ Ticket closed");

    // 9. Admin reopens the ticket
    console.log("9️⃣ Admin reopening ticket...");
    const reopen1 = await ticketService.reopen({
      actor: { id: adminId, role: "admin", email: `${adminId}@example.com`, username: `admin_${adminId}` } as any,
      ticketId: ticket.id,
    });
    expect(reopen1.status).toBe("reopened");
    console.log("✅ Ticket reopened by admin");

    // 10. Admin resolves again
    console.log("🔟 Admin resolving again...");
    const statusUpdate4 = await ticketService.updateStatus({
      admin: { id: adminId, role: "admin", email: `${adminId}@example.com`, username: `admin_${adminId}` } as any,
      ticketId: ticket.id,
      status: "resolved" as any,
    });
    expect(statusUpdate4.status).toBe("resolved");
    console.log("✅ Ticket resolved again");

    // 11. User reopens the ticket (within window)
    console.log("1️⃣1️⃣ User reopening ticket...");
    const reopen2 = await ticketService.reopen({
      actor: { id: userId, role: "user", email: `${userId}@example.com`, username: `user_${userId}` } as any,
      ticketId: ticket.id,
    });
    expect(reopen2.status).toBe("reopened");
    console.log("✅ Ticket reopened by user");

    // 12. Verify final state
    console.log("1️⃣2️⃣ Verifying final state...");
    const finalTicket = await prisma.ticket.findUnique({
      where: { id: ticket.id },
      include: { 
        attachments: true, 
        comments: { where: { deletedAt: null } },
        user: { select: { email: true, username: true } }
      },
    });

    expect(finalTicket).toBeTruthy();
    expect(finalTicket?.status).toBe("reopened");
    expect(finalTicket?.priority).toBe("high");
    expect(finalTicket?.attachments).toHaveLength(1);
    expect(finalTicket?.comments).toHaveLength(2); // User comment + Admin comment
    expect(finalTicket?.user.email).toBe(`${userId}@example.com`);

    // 13. Verify audit logs
    console.log("1️⃣3️⃣ Verifying audit logs...");
    
    // Get ticket audit logs
    const ticketAuditLogs = await prisma.auditLog.findMany({
      where: { targetId: ticket.id },
      orderBy: { createdAt: "asc" },
    });
    
    // Get comment audit logs
    const commentAuditLogs = await prisma.auditLog.findMany({
      where: { 
        action: "comment:add",
        targetType: "comment"
      },
      orderBy: { createdAt: "asc" },
    });
    
    console.log("📊 Ticket audit logs:", ticketAuditLogs.map(l => ({ action: l.action, actorId: l.actorId })));
    console.log("📊 Comment audit logs:", commentAuditLogs.map(l => ({ action: l.action, actorId: l.actorId })));
    
    // Should have: ticket:create, attachment:add, ticket:priority_change, 
    // ticket:status_change (in_progress), ticket:status_change (resolved),
    // ticket:status_change (closed), ticket:reopen, ticket:status_change (resolved), ticket:reopen
    expect(ticketAuditLogs.length).toBeGreaterThanOrEqual(7);
    
    // Verify key ticket audit actions
    const ticketActions = ticketAuditLogs.map(l => l.action);
    expect(ticketActions).toContain("ticket:create");
    expect(ticketActions).toContain("attachment:add");
    expect(ticketActions).toContain("ticket:priority_change");
    expect(ticketActions.filter(a => a === "ticket:status_change").length).toBeGreaterThanOrEqual(3);
    expect(ticketActions.filter(a => a === "ticket:reopen").length).toBeGreaterThanOrEqual(2);
    
    // Verify comment audit logs exist
    expect(commentAuditLogs.length).toBeGreaterThanOrEqual(2); // User comment + Admin comment
    const commentActions = commentAuditLogs.map(l => l.action);
    expect(commentActions).toContain("comment:add");

    console.log("🎉 Complete integration test flow completed successfully!");
    console.log(`📈 Final stats: ${ticketAuditLogs.length} ticket audit logs, ${commentAuditLogs.length} comment audit logs, ${finalTicket?.comments.length} comments, ${finalTicket?.attachments.length} attachments`);
  });
});
# API Reference - Ticketing System

## 📋 Overview

This document provides comprehensive API documentation for the Internal Service Request (Ticketing) System.

## 🏗️ Architecture

The system uses **Next.js Server Actions** as the primary API layer, with minimal API routes for specific use cases.

### API Structure
```
src/
├── app/api/           # API Routes (minimal)
│   ├── auth/         # Authentication endpoints
│   ├── attachments/  # File upload/download
│   └── resolve-identifier/ # User resolution
└── features/         # Server Actions
    ├── tickets/      # Ticket management
    ├── comments/     # Comment operations
    └── attachments/  # Attachment handling
```

## 🔐 Authentication

### Better-Auth Integration
- **Provider**: Better-Auth
- **Methods**: Username/Email + Password
- **Session Management**: Server-side sessions
- **RBAC**: User and Admin roles

## 🎫 Ticket Management

### Server Actions

#### `createTicketAction`
Creates a new ticket with optional attachments.

**Input Schema:**
```typescript
{
  title: string;           // Required, max 255 chars
  body: string;           // Required, max 5000 chars
  attachments?: Array<{    // Optional, max 5 files
    name: string;
    key: string;          // MinIO key
    size: number;         // Max 10MB per file
    contentType: string;  // pdf, png, jpg only
  }>;
}
```

**Response:**
```typescript
{
  success: boolean;
  ticketId?: string;
  error?: string;
}
```

**Side Effects:**
- ✅ Email notification to admin
- ✅ Audit log entry
- ✅ Attachment validation

#### `updateTicketStatusAction`
Updates ticket status (admin only).

**Input Schema:**
```typescript
{
  ticketId: string;
  status: "new" | "in_progress" | "waiting_on_user" | "resolved" | "closed" | "reopened";
}
```

**Response:**
```typescript
{
  success: boolean;
  error?: string;
}
```

**Side Effects:**
- ✅ Email notification to user
- ✅ Audit log entry
- ✅ Timestamp updates (resolvedAt, closedAt)

#### `updateTicketPriorityAction`
Updates ticket priority (admin only).

**Input Schema:**
```typescript
{
  ticketId: string;
  priority: "low" | "normal" | "high" | "urgent";
}
```

#### `reopenTicketAction`
Reopens a resolved ticket.

**Input Schema:**
```typescript
{
  ticketId: string;
}
```

**Business Rules:**
- ✅ Users: Only within 14 days of resolution
- ✅ Admins: Can reopen anytime
- ✅ Only from "resolved" status (users) or any status (admins)

## 💬 Comment Management

### Server Actions

#### `addCommentAction`
Adds a comment to a ticket.

**Input Schema:**
```typescript
{
  ticketId: string;
  body: string;          // Required, max 2000 chars
}
```

**RBAC Rules:**
- ✅ Users: Can comment on their own tickets
- ✅ Admins: Can comment on any ticket

**Side Effects:**
- ✅ Email notification to other party
- ✅ Audit log entry
- ✅ Notification throttling (1 minute)

#### `deleteCommentAction`
Soft deletes a comment.

**Input Schema:**
```typescript
{
  commentId: string;
}
```

**RBAC Rules:**
- ✅ Comment author: Can delete own comments
- ✅ Admins: Can delete any comment
- ✅ Ticket owner: Can delete any comment on their ticket

## 📎 Attachment Management

> **⚠️ Feature Flag**: Attachment functionality can be disabled via the `ENABLE_ATTACHMENTS` environment variable. When disabled, all attachment-related endpoints return 403 Forbidden and UI elements are hidden.

### Server Actions

#### `addAttachmentAction`
Adds attachments to a ticket.

**Feature Flag Behavior:**
- When `ENABLE_ATTACHMENTS=false`: Throws error "Attachment functionality is currently disabled."
- When `ENABLE_ATTACHMENTS=true` (default): Normal operation

**Input Schema:**
```typescript
{
  ticketId: string;
  files: Array<{
    name: string;
    key: string;         // MinIO key
    size: number;        // Max 10MB
    contentType: string; // pdf, png, jpg only
  }>;
}
```

**Business Rules:**
- ✅ Max 5 attachments per ticket
- ✅ Max 10MB per file
- ✅ Allowed types: PDF, PNG, JPG
- ✅ Key ownership validation

#### `removeAttachmentAction`
Removes an attachment.

**Feature Flag Behavior:**
- When `ENABLE_ATTACHMENTS=false`: Throws error "Attachment functionality is currently disabled."
- When `ENABLE_ATTACHMENTS=true` (default): Normal operation

**Input Schema:**
```typescript
{
  attachmentId: string;
}
```

**RBAC Rules:**
- ✅ Attachment uploader: Can remove own attachments
- ✅ Admins: Can remove any attachment
- ✅ Ticket owner: Can remove any attachment from their ticket

## 🔍 Data Retrieval

### Repository Functions

#### `listUserTickets`
Lists tickets for a specific user with pagination and filtering.

**Parameters:**
```typescript
{
  userId: string;
  q?: string;              // Search query
  status?: string[];       // Filter by status
  priority?: string[];     // Filter by priority
  page?: number;           // Page number (1-based)
  pageSize?: number;       // Items per page (max 100)
}
```

**Response:**
```typescript
{
  items: Ticket[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
```

#### `listAllTickets`
Lists all tickets for admin with additional filtering.

**Parameters:**
```typescript
{
  q?: string;              // Search query
  status?: string[];       // Filter by status
  priority?: string[];     // Filter by priority
  requester?: string;      // Filter by username/email
  page?: number;           // Page number (1-based)
  pageSize?: number;       // Items per page (max 100)
}
```

#### `getUserTicketDetail`
Gets full ticket details for a user.

**Parameters:**
```typescript
{
  userId: string;
  ticketId: string;
}
```

**RBAC**: Users can only access their own tickets.

#### `getAdminTicketDetail`
Gets full ticket details for admin.

**Parameters:**
```typescript
{
  ticketId: string;
}
```

**Includes**: Attachment keys, user information, full comment history.

## 📁 File Storage API

> **⚠️ Feature Flag**: All file storage endpoints are disabled when `ENABLE_ATTACHMENTS=false`. They return HTTP 403 Forbidden with the message "Attachment functionality is currently disabled."

### MinIO Integration

#### `POST /api/attachments/presign`
Generates presigned URLs for file upload.

**Feature Flag Behavior:**
- When `ENABLE_ATTACHMENTS=false`: Returns 403 Forbidden
- When `ENABLE_ATTACHMENTS=true` (default): Normal operation

**Request:**
```typescript
{
  filename: string;
  contentType: string;
  size: number;
}
```

**Response:**
```typescript
{
  uploadUrl: string;
  key: string;
  expiresIn: number;
}
```

#### `GET /api/attachments/[id]`
Downloads an attachment file.

**Feature Flag Behavior:**
- When `ENABLE_ATTACHMENTS=false`: Returns 403 Forbidden
- When `ENABLE_ATTACHMENTS=true` (default): Normal operation

**Headers:**
- `Authorization`: Bearer token or session cookie

**RBAC**: Only ticket owner or admin can download.

## 📧 Email Notifications

### Notification Events

#### Ticket Created
- **Trigger**: New ticket submission
- **Recipient**: Admin
- **Template**: `ticket-created.tsx`

#### Status Changed
- **Trigger**: Ticket status update
- **Recipient**: Ticket owner
- **Template**: `status-changed.tsx`

#### Comment Added
- **Trigger**: New comment
- **Recipient**: Other party (admin ↔ user)
- **Template**: `comment-added.tsx`

#### Ticket Reopened
- **Trigger**: Ticket reopened by user
- **Recipient**: Admin
- **Template**: `ticket-reopened.tsx`

### Throttling
- **Window**: 1 minute per ticket per event type
- **Implementation**: Redis-based caching
- **Purpose**: Prevent notification spam

## 🔍 Search & Filtering

### Search Capabilities
- **Full-text**: Title and body content
- **Case-insensitive**: All searches
- **Partial matching**: Substring search

### Filter Options
- **Status**: Multiple selection supported
- **Priority**: Multiple selection supported
- **Requester**: Username/email partial match (admin only)
- **Date Range**: Creation date filtering (future enhancement)

### Pagination
- **Default**: 20 items per page
- **Maximum**: 100 items per page
- **Navigation**: Previous/Next page indicators
- **Metadata**: Total count, current page, total pages

## 🔒 Security & RBAC

### Role-Based Access Control

#### User Role
- ✅ Create tickets
- ✅ View own tickets
- ✅ Comment on own tickets
- ✅ Reopen own resolved tickets (within 14 days)
- ✅ Upload attachments to own tickets
- ✅ Download own attachments

#### Admin Role
- ✅ All user permissions
- ✅ View all tickets
- ✅ Update ticket status/priority
- ✅ Comment on any ticket
- ✅ Reopen any ticket
- ✅ Download any attachment
- ✅ Delete any comment
- ✅ Remove any attachment

### Security Measures
- ✅ Server-side authorization enforcement
- ✅ Input validation and sanitization
- ✅ File type and size restrictions
- ✅ Attachment key ownership validation
- ✅ SQL injection prevention (Prisma)
- ✅ XSS protection (React/Next.js)

## 📊 Audit Logging

### Audit Events
- `ticket:create` - Ticket creation
- `ticket:status_change` - Status updates
- `ticket:priority_change` - Priority updates
- `ticket:reopen` - Ticket reopening
- `comment:add` - Comment creation
- `comment:delete` - Comment deletion
- `attachment:add` - Attachment upload
- `attachment:remove` - Attachment deletion

### Audit Data
```typescript
{
  actorId: string;        // User who performed action
  action: string;         // Action type
  targetType: string;     // "ticket" | "comment" | "attachment"
  targetId: string;       // ID of affected resource
  changes?: object;       // Before/after state
  ip?: string;           // Request IP address
  createdAt: Date;       // Timestamp
}
```

## 🚨 Error Handling

### Error Types
- **ValidationError**: Input validation failures
- **ForbiddenError**: RBAC violations
- **NotFoundError**: Resource not found
- **BusinessRuleError**: Business logic violations

### Error Response Format
```typescript
{
  success: false;
  error: string;
  code?: string;
  details?: object;
}
```

## 📈 Performance Considerations

### Database Optimization
- ✅ Indexed columns: `status`, `userId`, `createdAt`
- ✅ Full-text search: Title and body content
- ✅ Pagination: Cursor-based for large datasets
- ✅ Query optimization: Selective field loading

### Caching Strategy
- ✅ Session caching: User authentication
- ✅ Notification throttling: Redis-based
- ✅ Static assets: CDN delivery
- ✅ Database queries: Connection pooling

## 🔧 Configuration

### Environment Variables
```bash
# Database
DATABASE_URL="postgresql://..."

# Authentication
BETTER_AUTH_SECRET="..."
BETTER_AUTH_URL="http://localhost:3000"

# File Storage
MINIO_ENDPOINT="localhost"
MINIO_PORT=9000
MINIO_ACCESS_KEY="..."
MINIO_SECRET_KEY="..."
MINIO_BUCKET="attachments"

# Email
RESEND_API_KEY="..."
ADMIN_EMAIL="admin@example.com"
EMAIL_FROM="noreply@example.com"

# Feature Flags
ENABLE_ATTACHMENTS="true"  # Set to "false" to disable attachment functionality

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

*Last updated: September 2025*
*API Version: 1.0*
*Framework: Next.js 15 with Server Actions*

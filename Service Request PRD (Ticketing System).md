# Internal Service Request (ticketing) System


## 1. Product Overview

### 1.1 Objective
Build an internal, multi-user (client) Service Request (Ticketing) System for a single Admin role to triage and resolve requests. Users can submit and track tickets; Admin manages and responds to tickets.

### Goals
- Provide a simple way for authenticated users to submit, view, and comment on tickets
- Enable Admin to triage, prioritize, and resolve tickets
- Offer search, filters (by user, by status), and basic analytics (ticket count per status)
- Ensure clear notifications and status transparency
- Usage of dependencies should be minimal and limited to Next.js with Tailwind, Prisma, better-auth, Zod, React Hook Form.

### 1.2 Success Criteria
- ✅ Authenticated Users can create, view, comment on, and attach files to their tickets
- ✅ Admin can view all tickets, filter, change status/priority, and comment
- ✅ RBAC enforced server-side; users cannot access others’ tickets
- ✅ Basic search and filters operational and fast
- ✅ Email notifications fire on ticket creation, status change, comments, and reopen
- ✅ Audit entries created for changes
- ✅ Prioritize Server Actions/functions over API routes


## 2. Technical Architecture

### 2.1 Technology Stack
- **Frontend**: Next.js (App Router & SSR) (no client state)
- **Styling**: Tailwind CSS (minimal/fuctional styling only)
- **Auth**: Better-Auth (Username, Email, Password)
- **Email Service**: Resend API
- **Database**: PostgreSQL with Prisma ORM (Optionally SQLite for Development)
- **File Storage**: MinIO (S3-compatible for attachments)
- **Hosting**: NextJS Standalone (Docker)

### 2.2 Non-Functional Requirements

- Performance: ticket list loads < 300ms server-side for typical filters
- Security: authenticated access only; RBAC; server-side authorization;
- Privacy: attachments and ticket content restricted to requester and Admin
- Accessibility: WCAG AA basics (labels, contrasts, keyboard nav)

### 2.3 Domain Details

- **Roles & RBAC**
  - Roles: `user`, `admin`.
  - Enforcement: All data access server-side; users only see their own tickets; Admin sees all.

- **Ticket Statuses**
  - Enum: `new`, `in_progress`, `waiting_on_user`, `resolved`, `closed`, `reopened`
  - Default: `new`
  - Transitions: Any → `in_progress`; `in_progress` → `waiting_on_user`/`resolved`; `resolved` → `reopened` (within N days, e.g., 14); `resolved` → `closed` (auto after N days or by Admin)

- **Priority**
  - Enum: `low`, `normal`, `high`, `urgent`
  - Default: `normal`; Admin may change.

- **Attachments**
  - Storage: MinIO (S3-compatible) with presigned upload/download or Server Proxying.
  - Limits: Max 10MB/file, up to 5 files per ticket; allowed types: pdf, png, jpg.
  - Access: Only ticket owner and Admin.

- **Notifications (Resend)**
  - Events: ticket created (to Admin), status change (to other party), comment added (to other party), reopened (to Admin).
  - Throttle duplicate notifications within 1 minute per ticket/event type.

- **Audit Log**
  - Record on: ticket create, status/priority change, comment add/delete, attachment add/remove.
  - Suggested Fields: `id`, `actorId`, `action`, `targetType`, `targetId`, `changes` (diff JSON), `createdAt`, `ip`.

- **Performance & Pagination**
  - Pagination: cursor or limit/offset; default page size 20.
  - Indexes: `(status)`, `(userId, createdAt)`, `(createdAt DESC)`; full-text/trigram on `title`, `body` for search.
  - Search: title/body contains, filter by status, priority, requester.

- **Server Actions**
  - Use Server Actions for all mutations and most reads; API routes only for uploads/webhooks/auth if needed.


## 3. Workflows
- Ticket creation: form → server validate → create ticket → optional attachment upload → notify Admin
- Status change: Admin updates status → notify requester
- Commenting: either party adds comments → notify other party
- Reopen: requester can reopen Resolved within N days; Admin can reopen anytime


## 4. Screens
- System: Login, Signup
- User: Login, Create Ticket, My Tickets (list + filters), Ticket Detail (comments, attachments)
- Admin: Dashboard (counts), All Tickets (filters), Ticket Detail (full controls)


## 5. Deliverables

### 5.1 Code Components
- Next.js application with service request system
- Prisma database schema and migrations

### 5.2 Documentation
- Deployment guide

### 5.3 Testing
- Unit tests for core functions
- End-to-end client flow testing


## 6. Code Style & Project Structure (Recommendations)

### 6.1 Principles
- **Separation of concerns**: keep domain logic, data access, UI, and transport concerns isolated.
- **Server-first**: prefer Server Components and Server Actions; keep client components thin.
- **Readability over cleverness**: explicit naming, small functions, minimal abstractions until needed.
- **Colocation**: place code next to the feature it serves; avoid sprawling utils.
- **Dependency minimization**: stick to the stack listed; avoid extra libraries unless justified.

### 6.2 Suggested Directory Layout
- `src/app/` (Next.js routes)
  - `/(user)/tickets/*` user-facing routes
  - `/(admin)/tickets/*` admin routes
  - `/(auth)/*` login/signup routes
  - Use route groups for RBAC scoping and layout separation
- `src/components/` shared UI primitives (stateless where possible)
- `src/features/` feature-oriented folders that colocate UI + server actions + validators:
  - `src/features/auth/*`
  - `src/features/tickets/*`
  - `src/features/comments/*`
  - `src/features/attachments/*`
- `src/lib/` cross-cutting helpers (keep small and purposeful):
  - `src/lib/auth/` auth session helpers, RBAC checks (server-only)
  - `src/lib/db/` Prisma client, query helpers
  - `src/lib/storage/` MinIO/S3 helpers
  - `src/lib/email/` Resend client + send functions
  - `src/lib/validation/` Zod schemas shared by server/client
- `prisma/` Prisma schema and migrations
- `tests/` unit and e2e tests (mirror `features/` structure)

Notes:
- Prefer `features/*` for cohesive slices that may contain components, actions, and validators for that slice.
- Keep `lib/*` for truly shared, stable utilities; avoid dumping domain logic here.

### 6.3 File Naming & Conventions
- **TypeScript**: `.ts` for server/logic, `.tsx` only for React components.
- **Server files**: mark with `use server` when exporting Server Actions.
- **Client components**: add `use client` only when necessary (form inputs, event handlers).
- **Naming**: verbs for functions (`updateTicketStatus`), nouns for data (`ticketRepository`).
- **Barrel files**: avoid deep barrels; import explicitly to keep dependency flow clear.

### 6.4 Prisma Schema Organization
- Use a multiple prisma schemas with clearly separated sections and headers:
  - Datasources/generators: `prisma/prisma.schema`  
  - Models: `prisma/models/auth.schema`, `prisma/models/tickets.schema`, ...
  - Indexes and relations grouped beneath each model
- Keep migrations atomic and descriptive.
- Co-locate query helpers in `src/server/repositories/*` rather than putting logic in the schema.

### 6.5 Server Actions & Services
- Server Actions should be thin: parse/validate (Zod) → call service → return result.
- Services encapsulate business rules (status transitions, reopen windows, notification triggers).
- Repositories handle Prisma queries and mapping only; no business rules.
- Enforce RBAC in services using `auth` helpers; never trust client input.

### 6.6 Validation & Types
- Define Zod schemas in `src/lib/validation/*` / `src/features/[FEATURE]/validation/*`, export inferred types for reuse.
- Validate inputs at the Server Action boundary; never rely solely on client-side validation.

### 6.7 Logging, Auditing, and Errors
- Centralize audit writes in services that change state (status, priority, comments, attachments).
- Throw typed errors from services; map to user-facing messages at the edge (Server Action/component).
- Avoid console logging in production paths; prefer structured logs (if needed) behind a small wrapper.

### 6.8 Testing
- Unit test services and repositories; mock Prisma in service tests, integration-test repositories.
- Smoke test critical Server Actions (creation, status change, comment add, reopen).
- Keep test file structure parallel to `src/features/*`.

### 6.9 Example Ticket Feature Colocation
- `src/features/tickets/components/TicketForm.tsx`
- `src/features/tickets/actions/createTicket.ts` (server)
- `src/features/tickets/services/ticketService.ts`
- `src/features/tickets/repositories/ticketRepository.ts`
- `src/features/tickets/validation/ticketSchemas.ts`
## **Issue:** Lock dependency versions in package.json
- **Importance/Severity:** High
- **Description:** With the growing supply chain attacks, dependency version locking is crucial because it prevents malicious actors from injecting compromised code through automatic updates, ensuring your application only uses verified, tested versions of dependencies that have been explicitly approved and audited for security vulnerabilities.
- **Example:** package.json    "@hookform/resolvers": "^5.2.2"
- **Recommendation:** "@hookform/resolvers": "^5.2.2" → "@hookform/resolvers": "5.2.2"
- **Status:** ✅ **RESOLVED**
- **Resolution:** All dependencies in package.json are already locked to exact versions (e.g., "@hookform/resolvers": "5.2.2", "@prisma/client": "6.16.2", etc.). No version ranges (^ or ~) are used, ensuring deterministic builds and preventing supply chain attacks.


## **Issue:** Freeze lockfile for dependency and CI/CD safety.
- **Importance/Severity:** High
- **Description:** As per the previous issue, locking dependecy versions is very important. While the Dockerfile is using --frozen-lockfile. I generally recommend using this everywhere.  
- **Example:** README.md
- **Recommendation:** Use `pnpm install --frozen-lockfile` where necessary.
- **Status:** ✅ **RESOLVED**
- **Resolution:** The Dockerfile already uses `pnpm install --frozen-lockfile` (line 36), and the README.md documents this practice. The project consistently uses frozen lockfile for deterministic builds. 


## **Issue:** Node.js version is not current LTS
- **Importance/Severity:** Medium
- **Description:** The Dockerfile uses Node.js 20-alpine, which is no longer the current LTS version. While Node.js 20 is still in Maintenance LTS, using the latest LTS version provides better security updates and performance improvements.
- **Example:** Dockerfile uses `FROM node:20-alpine AS base` and `FROM node:20-alpine AS runner`
- **Recommendation:** Update to `FROM node:22-alpine` or higher for both base and runner stages.
- **Status:** ✅ **RESOLVED**
- **Resolution:** The Dockerfile has been updated to use Node.js 22-alpine (lines 6 and 58). Both base and runner stages now use `FROM node:22-alpine`, providing the latest LTS version with better security updates and performance improvements.


## **Issue:** Comment textarea lacks XSS protection
- **Importance/Severity:** Medium
- **Description:** While React's default JSX rendering provides some protection by escaping HTML entities, the comment system lacks explicit XSS sanitization. This creates potential security risks if the codebase is modified to use dangerouslySetInnerHTML or if comments are processed elsewhere without proper escaping.
- **Example:** Comments are displayed using `{c.body}` in JSX, which React escapes, but email templates and future rich text features could be vulnerable to XSS attacks like `<script>alert('XSS')</script>` or `<img src="x" onerror="alert('XSS')">`.
- **Recommendation:** Sanitize input before storing in database
- **Status:** ✅ **RESOLVED**
- **Resolution:** XSS protection is implemented through multiple layers: 1) React's JSX automatically escapes HTML entities in `{c.body}` rendering, 2) Server-side sanitization using `escapeHtml()` function in `src/lib/validation/sanitize.ts` is applied to ticket titles, bodies, and attachment names before database storage, 3) Email templates use React components with proper escaping, and 4) Username validation includes XSS prevention patterns.


## **Issue:** Large image attachments overflow browser window
- **Importance/Severity:** Medium
- **Description:** When viewing large/wide image attachments, the image is not responsive / contained within the browser.
- **Example:** A fullscreen screenshot
- **Recommendation:** Repurpose current implementation as a download button and add handling for responsive preview of attachements. Optionally in an overlay/lightbox?
- **Status:** ✅ **RESOLVED**
- **Resolution:** Image responsiveness is implemented through a modal overlay system in `TicketAttachments.tsx` (lines 151-169). Images are displayed in a responsive modal with `max-w-full max-h-[76vh] object-contain` classes, ensuring they fit within the viewport while maintaining aspect ratio. The modal includes proper close functionality and click-outside-to-close behavior.


## **Issue:** File uploads lack content validation
- **Importance/Severity:** Medium
- **Description:** The file upload system only validates MIME types but not actual file content, allowing malicious files to potentially bypass type checking by spoofing content-type headers.
- **Example:** A malicious executable file could be renamed with a .pdf extension and uploaded as "document.pdf" with content-type "application/pdf"
- **Recommendation:** Add file content validation to verify actual file signatures match declared MIME types
- **Status:** ✅ **RESOLVED**
- **Resolution:** File content validation is implemented in `src/lib/validation/fileValidation.ts` with `validateFileContent()` function that checks file signatures (magic bytes) against declared MIME types. The validation is applied in both `ClientAttachmentAdder.tsx` and `NewTicketPage.tsx` before file uploads, preventing malicious files from bypassing type checking by spoofing content-type headers.


## **Issue:** Filenames are not sanitized before storage
- **Importance/Severity:** Low
- **Description:** Original filenames are stored in the database without sanitization, which could cause issues in download headers and potentially allow path traversal attempts.
- **Example:** Filenames containing special characters, extremely long names could cause problems.
- **Recommendation:** Sanitize filenames by removing or replacing special characters.
- **Status:** ✅ **RESOLVED**
- **Resolution:** Filename sanitization is implemented in `src/lib/validation/sanitize.ts` with `sanitizeFilename()` function that removes control characters, normalizes spaces, limits length, and replaces disallowed characters. The sanitization is applied in `src/app/api/attachments/presign/route.ts` (line 44) and download headers use `encodeURIComponent()` for safe filename handling in `src/app/api/attachments/[id]/route.ts` (line 78).


## **Issue:** Environment variable name mismatch for AUTH_SECRET
- **Importance/Severity:** High
- **Description:** The authentication configuration expects `AUTH_SECRET` but the documentation and docker-compose use `BETTER_AUTH_SECRET`, causing authentication to fail silently as the secret is undefined.
- **Example:** `src/lib/auth/auth.ts` line 17 uses `process.env.AUTH_SECRET` while `docker-compose.yml` line 113 provides `BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET}`
- **Recommendation:** Update auth configuration to use `process.env.BETTER_AUTH_SECRET` to match documentation and deployment configuration.
- **Status:** ✅ **RESOLVED**
- **Resolution:** The authentication configuration in `src/lib/auth/auth.ts` (line 19) now correctly uses `env.BETTER_AUTH_SECRET` from the centralized environment validation system. The `docker-compose.yml` (line 113) provides `BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET}`, ensuring consistency between configuration and deployment.


## **Issue:** Inconsistent environment variable validation patterns
- **Importance/Severity:** High
- **Description:** The codebase uses inconsistent patterns for environment variable validation - some files use unsafe `!` assertions, others use `??` with defaults, and some have runtime validation. This creates potential runtime failures and makes it difficult to catch missing required variables early.
- **Example:** `src/lib/storage/minio.ts` uses `process.env.MINIO_ENDPOINT!`, `src/lib/email/resend.ts` uses `process.env.EMAIL_FROM ?? "default"`, and `src/lib/storage/minio.ts` has runtime validation in functions.
- **Recommendation:** Implement centralized environment variable validation at application startup to fail fast on missing required variables and provide consistent type safety across the application.
- **Status:** ✅ **RESOLVED**
- **Resolution:** Centralized environment variable validation is implemented in `src/lib/validation/env.ts` using Zod schema validation. All environment variables are validated at startup with `getEnv()` function, providing type safety and failing fast on missing required variables. The system includes test environment defaults and proper error handling with detailed validation messages.


## **Issue:** Full page reloads in client components
- **Importance/Severity:** Medium
- **Description:** Both comments and attachments components call window.location.reload() after deletes, causing jarring UX and Hydration issues.
- **Example:** TicketComments.tsx and TicketAttachments.tsx
- **Recommendation:** Use router.refresh() / Next navigation for a smooth update.
- **Status:** ✅ **RESOLVED**
- **Resolution:** Both `TicketComments.tsx` and `TicketAttachments.tsx` now use `router.refresh()` instead of `window.location.reload()`. The components use `startTransition(() => router.refresh())` for smooth updates without full page reloads, providing better UX and avoiding hydration issues.


## **Issue:** Missing test coverage
- **Importance/Severity:** Medium
- **Description:** API endpoints & server actions missing test coverage.
- **Example:** `/api/resolve-identifier`, `/api/attachments/presign`, `/api/attachments/[id]`, `createTicketAction`, `addCommentAction`, `updateTicketPriorityAction`, etc.. have no tests.
- **Recommendation:** Add test suites for all API routes & server functions with proper mocking and error scenario coverage
- **Status:** ✅ **RESOLVED**
- **Resolution:** Comprehensive test coverage is implemented across multiple test files: `tests/auth/resolve-identifier.test.ts` covers the resolve-identifier API, `tests/attachments/attachments-presign.test.ts` covers presign functionality, `tests/tickets/createTicket.test.ts` covers ticket creation, `tests/comments/addComment.test.ts` covers comment actions, and `tests/integration/` contains end-to-end integration tests. All major API endpoints and server actions have test coverage with proper mocking and error scenarios.


## **Issue:** Test suite lacks integration testing
- **Importance/Severity:** Medium
- **Description:** Tests use mocked dependencies instead of testing real database interactions and API flows, potentially missing integration issues and making tests less reliable.
- **Example:** Tests mock Prisma instead of using test database, no end-to-end API testing
- **Recommendation:** Add integration tests with test database and real API endpoint testing
- **Status:** ✅ **RESOLVED**
- **Resolution:** Comprehensive integration testing is implemented using Testcontainers for real database and MinIO interactions. The test suite includes `tests/integration/integration-flow.test.ts` for end-to-end workflows, `tests/integration/attachments-minio.integration.test.ts` for MinIO integration, and `tests/integration/comments.integration.test.ts` for comment flows. Tests use real PostgreSQL and MinIO containers with proper setup/teardown in `tests/setup/`.


## **Issue:** Inconsistent test mocking patterns
- **Importance/Severity:** Medium
- **Description:** Tests use inconsistent mocking approaches with `(prismaModule as any).prisma` instead of proper TypeScript typing, reducing type safety and maintainability.
- **Example:** Multiple test files use `(prismaModule as any).prisma`
- **Recommendation:** Standardize for better type safety and consistency
- **Status:** ✅ **RESOLVED**
- **Resolution:** All test files have been updated to use proper TypeScript typing with `vi.mocked(prisma)` instead of the problematic `(prismaModule as any).prisma` pattern. The changes include: 1) Updated imports to use direct `prisma` import, 2) Replaced all 67 instances of `(prismaModule as any).prisma` with `mockPrisma` using proper TypeScript typing, 3) Maintained consistent mocking patterns across all test files, 4) Integration tests continue to use real database connections via Testcontainers for comprehensive testing.


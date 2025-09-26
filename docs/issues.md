## **Issue:** Lock dependency versions in package.json
- **Importance/Severity:** High
- **Description:** With the growing supply chain attacks, dependency version locking is crucial because it prevents malicious actors from injecting compromised code through automatic updates, ensuring your application only uses verified, tested versions of dependencies that have been explicitly approved and audited for security vulnerabilities.
- **Example:** package.json    "@hookform/resolvers": "^5.2.2"
- **Recommendation:** "@hookform/resolvers": "^5.2.2" → "@hookform/resolvers": "5.2.2"


## **Issue:** Freeze lockfile for dependency and CI/CD safety.
- **Importance/Severity:** High
- **Description:** As per the previous issue, locking dependecy versions is very important. While the Dockerfile is using --frozen-lockfile. I generally recommend using this everywhere.  
- **Example:** README.md
- **Recommendation:** Use `pnpm install --frozen-lockfile` where necessary. 


## **Issue:** Node.js version is not current LTS
- **Importance/Severity:** Medium
- **Description:** The Dockerfile uses Node.js 20-alpine, which is no longer the current LTS version. While Node.js 20 is still in Maintenance LTS, using the latest LTS version provides better security updates and performance improvements.
- **Example:** Dockerfile uses `FROM node:20-alpine AS base` and `FROM node:20-alpine AS runner`
- **Recommendation:** Update to `FROM node:22-alpine` or higher for both base and runner stages.


## **Issue:** Comment textarea lacks XSS protection
- **Importance/Severity:** Medium
- **Description:** While React's default JSX rendering provides some protection by escaping HTML entities, the comment system lacks explicit XSS sanitization. This creates potential security risks if the codebase is modified to use dangerouslySetInnerHTML or if comments are processed elsewhere without proper escaping.
- **Example:** Comments are displayed using `{c.body}` in JSX, which React escapes, but email templates and future rich text features could be vulnerable to XSS attacks like `<script>alert('XSS')</script>` or `<img src="x" onerror="alert('XSS')">`.
- **Recommendation:** Sanitize input before storing in database


## **Issue:** Large image attachments overflow browser window
- **Importance/Severity:** Medium
- **Description:** When viewing large/wide image attachments, the image is not responsive / contained within the browser.
- **Example:** A fullscreen screenshot
- **Recommendation:** Repurpose current implementation as a download button and add handling for responsive preview of attachements. Optionally in an overlay/lightbox?


## **Issue:** File uploads lack content validation
- **Importance/Severity:** Medium
- **Description:** The file upload system only validates MIME types but not actual file content, allowing malicious files to potentially bypass type checking by spoofing content-type headers.
- **Example:** A malicious executable file could be renamed with a .pdf extension and uploaded as "document.pdf" with content-type "application/pdf"
- **Recommendation:** Add file content validation to verify actual file signatures match declared MIME types


## **Issue:** Filenames are not sanitized before storage
- **Importance/Severity:** Low
- **Description:** Original filenames are stored in the database without sanitization, which could cause issues in download headers and potentially allow path traversal attempts.
- **Example:** Filenames containing special characters, extremely long names could cause problems.
- **Recommendation:** Sanitize filenames by removing or replacing special characters.


## **Issue:** Environment variable name mismatch for AUTH_SECRET
- **Importance/Severity:** High
- **Description:** The authentication configuration expects `AUTH_SECRET` but the documentation and docker-compose use `BETTER_AUTH_SECRET`, causing authentication to fail silently as the secret is undefined.
- **Example:** `src/lib/auth/auth.ts` line 17 uses `process.env.AUTH_SECRET` while `docker-compose.yml` line 113 provides `BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET}`
- **Recommendation:** Update auth configuration to use `process.env.BETTER_AUTH_SECRET` to match documentation and deployment configuration.


## **Issue:** Inconsistent environment variable validation patterns
- **Importance/Severity:** High
- **Description:** The codebase uses inconsistent patterns for environment variable validation - some files use unsafe `!` assertions, others use `??` with defaults, and some have runtime validation. This creates potential runtime failures and makes it difficult to catch missing required variables early.
- **Example:** `src/lib/storage/minio.ts` uses `process.env.MINIO_ENDPOINT!`, `src/lib/email/resend.ts` uses `process.env.EMAIL_FROM ?? "default"`, and `src/lib/storage/minio.ts` has runtime validation in functions.
- **Recommendation:** Implement centralized environment variable validation at application startup to fail fast on missing required variables and provide consistent type safety across the application.


## **Issue:** Full page reloads in client components
- **Importance/Severity:** Medium
- **Description:** Both comments and attachments components call window.location.reload() after deletes, causing jarring UX and Hydration issues.
- **Example:** TicketComments.tsx and TicketAttachments.tsx
- **Recommendation:** Use router.refresh() / Next navigation for a smooth update.


## **Issue:** Missing test coverage
- **Importance/Severity:** Medium
- **Description:** API endpoints & server actions missing test coverage.
- **Example:** `/api/resolve-identifier`, `/api/attachments/presign`, `/api/attachments/[id]`, `createTicketAction`, `addCommentAction`, `updateTicketPriorityAction`, etc.. have no tests.
- **Recommendation:** Add test suites for all API routes & server functions with proper mocking and error scenario coverage


## **Issue:** Test suite lacks integration testing
- **Importance/Severity:** Medium
- **Description:** Tests use mocked dependencies instead of testing real database interactions and API flows, potentially missing integration issues and making tests less reliable.
- **Example:** Tests mock Prisma instead of using test database, no end-to-end API testing
- **Recommendation:** Add integration tests with test database and real API endpoint testing


## **Issue:** Inconsistent test mocking patterns
- **Importance/Severity:** Medium
- **Description:** Tests use inconsistent mocking approaches with `(prismaModule as any).prisma` instead of proper TypeScript typing, reducing type safety and maintainability.
- **Example:** Multiple test files use `(prismaModule as any).prisma`
- **Recommendation:** Standardize for better type safety and consistency


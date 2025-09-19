export const TICKET_STATUSES = [
    "new",
    "in_progress",
    "waiting_on_user",
    "resolved",
    "closed",
    "reopened",
] as const;

export const TICKET_PRIORITIES = ["low", "normal", "high", "urgent"] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const PAGE_SIZE_DEFAULT = 20; // PRD default page size

export const REOPEN_WINDOW_DAYS = 14;   // user can reopen within this many days after "resolved"
export const AUTO_CLOSE_DAYS = 14;      // auto-close if "resolved" for >= this many days

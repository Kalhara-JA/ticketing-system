"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { requireUser } from "@/lib/auth/session";
import { ticketService } from "@/features/tickets/services/ticketService";
import { CreateTicketInput } from "@/lib/validation/ticketSchemas";

export async function createTicketAction(input: z.infer<typeof CreateTicketInput>) {
    const user = await requireUser();
    const data = CreateTicketInput.parse(input);
    const ip = (await headers()).get("x-forwarded-for") ?? null;

    const ticket = await ticketService.createTicket({
        user: { id: user.id, email: user.email, username: user.username },
        title: data.title,
        body: data.body,
        attachments: data.attachments ?? [],
        ip,
    });

    return { id: ticket.id };
}



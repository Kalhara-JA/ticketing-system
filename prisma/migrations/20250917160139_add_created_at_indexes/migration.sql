/*
  Warnings:

  - A unique constraint covering the columns `[createdAt,id]` on the table `Ticket` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Ticket_createdAt_id_key" ON "public"."Ticket"("createdAt", "id");

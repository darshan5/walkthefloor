import { prisma } from "@/lib/prisma";

export async function createTicket(
  organizationId: string,
  userId: string,
  data: { subject: string; category: string; body: string }
) {
  const ticket = await prisma.supportTicket.create({
    data: {
      organizationId,
      userId,
      subject: data.subject,
      category: data.category,
      messages: {
        create: {
          senderId: userId,
          body: data.body,
          isStaff: false,
        },
      },
    },
    include: { messages: true },
  });
  return ticket;
}

export async function getMyTickets(organizationId: string, userId: string) {
  return prisma.supportTicket.findMany({
    where: { organizationId, userId },
    include: {
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getTicketDetail(ticketId: string, userId: string, isStaff: boolean) {
  const ticket = await prisma.supportTicket.findFirst({
    where: isStaff ? { id: ticketId } : { id: ticketId, userId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!ticket) throw new Error("Ticket not found");

  const viewField = isStaff ? "lastViewedByAdmin" : "lastViewedByUser";
  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { [viewField]: new Date() },
  });

  return ticket;
}

export async function addCustomerReply(ticketId: string, userId: string, body: string) {
  const ticket = await prisma.supportTicket.findFirst({
    where: { id: ticketId, userId },
  });
  if (!ticket) throw new Error("Ticket not found");

  const message = await prisma.supportTicketMessage.create({
    data: { ticketId, senderId: userId, body, isStaff: false },
  });

  if (ticket.status === "resolved") {
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: "open" },
    });
  }

  return message;
}

export async function closeMyTicket(ticketId: string, userId: string) {
  const ticket = await prisma.supportTicket.findFirst({
    where: { id: ticketId, userId },
  });
  if (!ticket) throw new Error("Ticket not found");

  return prisma.supportTicket.update({
    where: { id: ticketId },
    data: { status: "closed" },
  });
}

export async function getMyUnreadCount(userId: string) {
  const tickets = await prisma.supportTicket.findMany({
    where: { userId, status: { not: "closed" } },
    select: { id: true, lastViewedByUser: true },
  });

  let count = 0;
  for (const ticket of tickets) {
    if (!ticket.lastViewedByUser) {
      const hasStaffMsg = await prisma.supportTicketMessage.count({
        where: { ticketId: ticket.id, isStaff: true },
      });
      if (hasStaffMsg > 0) count++;
    } else {
      const newStaffMsgs = await prisma.supportTicketMessage.count({
        where: { ticketId: ticket.id, isStaff: true, createdAt: { gt: ticket.lastViewedByUser } },
      });
      if (newStaffMsgs > 0) count++;
    }
  }
  return count;
}

// ── SaaS Admin functions ──

export async function getAllTickets(status?: string) {
  return prisma.supportTicket.findMany({
    where: status ? { status } : {},
    include: {
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
}

export async function addAdminReply(ticketId: string, adminId: string, body: string) {
  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new Error("Ticket not found");

  const message = await prisma.supportTicketMessage.create({
    data: { ticketId, senderId: adminId, body, isStaff: true },
  });

  if (ticket.status === "open") {
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: "in_progress" },
    });
  }

  return message;
}

export async function updateTicketStatus(ticketId: string, status: string) {
  return prisma.supportTicket.update({
    where: { id: ticketId },
    data: { status },
  });
}

export async function updateTicketPriority(ticketId: string, priority: string) {
  return prisma.supportTicket.update({
    where: { id: ticketId },
    data: { priority },
  });
}

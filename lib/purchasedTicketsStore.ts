interface PurchasedTicketRecord {
  tokenId: string;
  eventId: number;
  holder: string;
  createdAt: number;
  paymentId?: string | null;
}

const ticketsByHolder = new Map<string, PurchasedTicketRecord[]>();

let nextMockTokenId = 1_000_000;

export function registerPurchasedTicket(
  holder: string,
  eventId: number,
  paymentId?: string | null
): PurchasedTicketRecord {
  const normalizedHolder = holder.toLowerCase();
  const tokenId = (nextMockTokenId += 1).toString();

  const record: PurchasedTicketRecord = {
    tokenId,
    eventId,
    holder: normalizedHolder,
    createdAt: Date.now(),
    paymentId,
  };

  const existing = ticketsByHolder.get(normalizedHolder) ?? [];
  ticketsByHolder.set(normalizedHolder, [...existing, record]);

  return record;
}

export function getPurchasedTicketsForHolder(
  holder: string
): PurchasedTicketRecord[] {
  const normalizedHolder = holder.toLowerCase();
  return ticketsByHolder.get(normalizedHolder) ?? [];
}

export type { PurchasedTicketRecord };

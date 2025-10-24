import { NextResponse } from "next/server";
import { publicClient } from "@/lib/contracts/client";
import { EVENT_BOOK_ABI, EVENT_BOOK_ADDRESS } from "@/lib/contracts/eventBook";
import { TICKET_ABI } from "@/lib/contracts/ticket";

const TICKET_CONTRACT = process.env.NEXT_PUBLIC_TICKET_CONTRACT_ADDRESS as `0x${string}`;
const BATCH_SIZE = 100;
const MAX_TOKEN_ID = 10000;

async function getTicketOwner(tokenId: bigint, eventId: number): Promise<string | null> {
  try {
    const [tokenEventId, owner] = await Promise.all([
      publicClient.readContract({
        address: TICKET_CONTRACT,
        abi: TICKET_ABI,
        functionName: "ticketToEvent",
        args: [tokenId],
      }) as Promise<bigint>,
      publicClient.readContract({
        address: TICKET_CONTRACT,
        abi: TICKET_ABI,
        functionName: "ownerOf",
        args: [tokenId],
      }) as Promise<`0x${string}`>
    ]);

    if (Number(tokenEventId) === eventId && owner !== '0x0000000000000000000000000000000000000000') {
      return owner.toLowerCase();
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const eventId = Number.parseInt(id);

  if (Number.isNaN(eventId)) {
    return NextResponse.json(
      { success: false, error: "Invalid event ID" },
      { status: 400 }
    );
  }

  if (!TICKET_CONTRACT) {
    return NextResponse.json(
      { success: false, error: "Ticket contract not configured" },
      { status: 500 }
    );
  }

  try {
    const eventData = await publicClient.readContract({
      address: EVENT_BOOK_ADDRESS,
      abi: EVENT_BOOK_ABI,
      functionName: "getEvent",
      args: [BigInt(eventId)],
    }) as readonly [
      string,    // name
      string,    // location
      bigint,    // date
      bigint,    // price
      bigint,    // revenueOwed
      string,    // creator
      bigint,    // ticketsSold
      bigint,    // maxCapacity
      string,    // imageURI
      readonly string[],  // categories
      boolean,   // isPrivate
      boolean,   // whitelistIsLocked
      string     // farcasterURI
    ];

    if (!eventData?.[0]) {
      return NextResponse.json(
        { success: false, error: "Event not found" },
        { status: 404 }
      );
    }

    const ticketsSold = Number(eventData[6]);

    if (ticketsSold === 0) {
      return NextResponse.json({ success: true, attendees: [], count: 0 });
    }

    const attendeeSet = new Set<string>();

    for (let startId = 0; startId < MAX_TOKEN_ID && attendeeSet.size < ticketsSold; startId += BATCH_SIZE) {
      const endId = Math.min(startId + BATCH_SIZE, MAX_TOKEN_ID);
      const tokenIds = Array.from({ length: endId - startId }, (_, i) => BigInt(startId + i));

      const owners = await Promise.all(tokenIds.map(id => getTicketOwner(id, eventId)));

      owners.forEach(owner => {
        if (owner) attendeeSet.add(owner);
      });
    }

    return NextResponse.json({
      success: true,
      attendees: Array.from(attendeeSet),
      count: attendeeSet.size,
    });
  } catch (error) {
    console.error("[events:attendees]", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch attendees",
      },
      { status: 500 }
    );
  }
}

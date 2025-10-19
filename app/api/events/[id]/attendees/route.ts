import { NextResponse } from "next/server";
import { publicClient } from "@/lib/contracts/client";
import { EVENT_BOOK_ABI, EVENT_BOOK_ADDRESS } from "@/lib/contracts/eventBook";
import { TICKET_ABI } from "@/lib/contracts/ticket";

const TICKET_CONTRACT = process.env.NEXT_PUBLIC_TICKET_CONTRACT_ADDRESS as `0x${string}`;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const eventId = parseInt(id);

  if (isNaN(eventId)) {
    return NextResponse.json(
      { success: false, error: "Invalid event ID" },
      { status: 400 }
    );
  }

  if (!TICKET_CONTRACT) {
    return NextResponse.json(
      { success: false, error: "Ticket contract address not configured" },
      { status: 500 }
    );
  }

  try {
    // Get event details to verify it exists and get tickets sold count
    const eventData = await publicClient.readContract({
      address: EVENT_BOOK_ADDRESS,
      abi: EVENT_BOOK_ABI,
      functionName: "events",
      args: [BigInt(eventId)],
    }) as [
      string,  // name
      string,  // location
      bigint,  // date
      bigint,  // price
      bigint,  // revenueOwed
      string,  // creator
      bigint,  // ticketsSold
      bigint,  // maxCapacity
      string,  // imageURI
      boolean, // isPrivate
      boolean  // whitelistIsLocked
    ];

    if (!eventData || !eventData[0]) {
      return NextResponse.json(
        { success: false, error: "Event not found" },
        { status: 404 }
      );
    }

    const ticketsSold = Number(eventData[6]);

    // If no tickets sold, return empty array early
    if (ticketsSold === 0) {
      return NextResponse.json({
        success: true,
        attendees: [],
        count: 0,
      });
    }

    // Use multicall batching for efficiency
    const attendeeAddresses = new Set<string>();
    const BATCH_SIZE = 50;
    const MAX_TOKEN_ID = 10000;

    // Process in batches to find all tickets for this event
    for (let startId = 0; startId < MAX_TOKEN_ID; startId += BATCH_SIZE) {
      const batchPromises = [];

      for (let tokenId = startId; tokenId < startId + BATCH_SIZE && tokenId < MAX_TOKEN_ID; tokenId++) {
        batchPromises.push(
          publicClient.readContract({
            address: TICKET_CONTRACT,
            abi: TICKET_ABI,
            functionName: "ticketToEvent",
            args: [BigInt(tokenId)],
          }).then(async (tokenEventId) => {
            // If this ticket belongs to our event, get its owner
            if (Number(tokenEventId) === eventId) {
              const owner = await publicClient.readContract({
                address: TICKET_CONTRACT,
                abi: TICKET_ABI,
                functionName: "ownerOf",
                args: [BigInt(tokenId)],
              }) as `0x${string}`;

              if (owner && owner !== '0x0000000000000000000000000000000000000000') {
                return owner.toLowerCase();
              }
            }
            return null;
          }).catch(() => null) // Token doesn't exist, skip
        );
      }

      const batchResults = await Promise.all(batchPromises);

      // Add valid addresses to the set
      batchResults.forEach(address => {
        if (address) {
          attendeeAddresses.add(address);
        }
      });

      // Stop early if we've found all tickets
      if (attendeeAddresses.size >= ticketsSold) {
        break;
      }
    }

    const attendees = Array.from(attendeeAddresses);

    return NextResponse.json({
      success: true,
      attendees,
      count: attendees.length,
    });
  } catch (error) {
    console.error("[events:attendees]", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch event attendees",
      },
      { status: 500 }
    );
  }
}

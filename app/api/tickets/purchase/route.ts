import { NextRequest, NextResponse } from "next/server";
import { publicClient } from "@/lib/contracts/client";
import { EVENT_BOOK_ADDRESS, EVENT_BOOK_ABI } from "@/lib/contracts/eventBook";
import { registerPurchasedTicket } from "@/lib/purchasedTicketsStore";
import { generateTicketMetadata } from "@/lib/ticketMetadata";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId, address, paymentId } = body as {
      eventId?: number;
      address?: string;
      paymentId?: string | null;
    };

    if (eventId === undefined || !address) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: eventId, address" },
        { status: 400 }
      );
    }

    if (eventId < 0) {
      return NextResponse.json(
        { success: false, error: "Invalid event ID" },
        { status: 400 }
      );
    }

    const numberOfEvents = (await publicClient.readContract({
      address: EVENT_BOOK_ADDRESS,
      abi: EVENT_BOOK_ABI,
      functionName: "getNumberOfEvents",
    })) as bigint;

    if (eventId >= Number(numberOfEvents)) {
      return NextResponse.json(
        { success: false, error: "Event not found" },
        { status: 404 }
      );
    }

    const eventData = (await publicClient.readContract({
      address: EVENT_BOOK_ADDRESS,
      abi: EVENT_BOOK_ABI,
      functionName: "events",
      args: [BigInt(eventId)],
    })) as [string, string, bigint, bigint, bigint, string, bigint, bigint];

    const [name, location, date] = eventData;

    const record = registerPurchasedTicket(address, eventId, paymentId);

    generateTicketMetadata(
      record.tokenId,
      eventId,
      name,
      location,
      Number(date),
      address
    );

    const eventDate = new Date(Number(date) * 1000);
    const purchaseDate = new Date(record.createdAt);

    const ticket = {
      id: `TKT-${record.tokenId}`,
      tokenId: record.tokenId,
      eventId,
      eventTitle: name,
      date: eventDate.toISOString().split("T")[0],
      time: eventDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      location,
      venue: location,
      ticketType: "General Admission",
      purchaseDate: purchaseDate.toISOString().split("T")[0],
      qrData: `${record.tokenId}-${eventId}-${address}`,
      isValid: Number(date) > Math.floor(Date.now() / 1000),
      status: "owned" as const,
    };

    return NextResponse.json({
      success: true,
      ticket,
      metadataTokenId: record.tokenId,
    });
  } catch (error) {
    console.error("Error recording ticket purchase:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to record ticket purchase",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

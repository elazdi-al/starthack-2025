import { type NextRequest, NextResponse } from 'next/server';
import { publicClient } from '@/lib/contracts/client';
import { EVENT_BOOK_ADDRESS, EVENT_BOOK_ABI } from '@/lib/contracts/eventBook';

export const dynamic = 'force-dynamic';

// GET /api/events/[id] - Get a specific event
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const eventId = Number.parseInt(id);

    if (Number.isNaN(eventId) || eventId < 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid event ID' },
        { status: 400 }
      );
    }

    // Get total number of events to validate ID
    const numberOfEvents = await publicClient.readContract({
      address: EVENT_BOOK_ADDRESS,
      abi: EVENT_BOOK_ABI,
      functionName: 'getNumberOfEvents',
    }) as bigint;

    if (eventId >= Number(numberOfEvents)) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    // Fetch event data
    const eventData = await publicClient.readContract({
      address: EVENT_BOOK_ADDRESS,
      abi: EVENT_BOOK_ABI,
      functionName: 'events',
      args: [BigInt(eventId)],
    }) as [
      string,
      string,
      bigint,
      bigint,
      bigint,
      string,
      bigint,
      bigint,
      string,
      boolean,
      boolean
    ];

    const [
      name,
      location,
      date,
      price,
      _revenueOwed,
      creator,
      ticketsSold,
      maxCapacity,
      imageURI,
      isPrivate,
      whitelistIsLocked,
    ] = eventData;

    const event = {
      id: eventId,
      name,
      location,
      date: Number(date),
      price: price.toString(),
      creator,
      ticketsSold: Number(ticketsSold),
      maxCapacity: Number(maxCapacity),
      imageURI,
      isPrivate,
      whitelistIsLocked,
      isPast: Number(date) < Math.floor(Date.now() / 1000),
      isFull: Number(maxCapacity) > 0 && Number(ticketsSold) >= Number(maxCapacity),
    };

    return NextResponse.json({ 
      success: true, 
      event 
    });

  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch event',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

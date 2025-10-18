import { publicClient } from '@/lib/contracts/client';
import { EVENT_BOOK_ABI, EVENT_BOOK_ADDRESS } from '@/lib/contracts/eventBook';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/events - Get all events
export async function GET() {
  try {
    // Get total number of events
    const numberOfEvents = await publicClient.readContract({
      address: EVENT_BOOK_ADDRESS,
      abi: EVENT_BOOK_ABI,
      functionName: 'getNumberOfEvents',
    }) as bigint;

    const eventCount = Number(numberOfEvents);
    
    // Fetch all events
    const events = await Promise.all(
      Array.from({ length: eventCount }, async (_, index) => {
        const eventData = await publicClient.readContract({
          address: EVENT_BOOK_ADDRESS,
          abi: EVENT_BOOK_ABI,
          functionName: 'events',
          args: [BigInt(index)],
        }) as [string, string, bigint, bigint, bigint, string, bigint, bigint];

        const [name, location, date, price, _revenueOwed, creator, ticketsSold, maxCapacity] = eventData;

        return {
          id: index,
          name,
          location,
          date: Number(date),
          price: price.toString(),
          creator,
          ticketsSold: Number(ticketsSold),
          maxCapacity: Number(maxCapacity),
          // Calculate if event has passed
          isPast: Number(date) < Math.floor(Date.now() / 1000),
        };
      })
    );

    // Sort by date (upcoming first)
    const sortedEvents = events.sort((a, b) => a.date - b.date);

    return NextResponse.json({ 
      success: true, 
      events: sortedEvents,
      count: eventCount 
    });

  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch events',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/events - Create a new event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, location, date, price, maxCapacity } = body;

    // Validation
    if (!name || !location || !date || price === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Convert date to UNIX timestamp if it's not already
    const timestamp = typeof date === 'number' ? date : Math.floor(new Date(date).getTime() / 1000);
    
    // Check if date is in the future
    if (timestamp <= Math.floor(Date.now() / 1000)) {
      return NextResponse.json(
        { success: false, error: 'Event date must be in the future' },
        { status: 400 }
      );
    }

    // Note: The actual transaction needs to be sent from the client-side
    // This endpoint returns the transaction data
    return NextResponse.json({
      success: true,
      message: 'Event creation prepared',
      data: {
        name,
        location,
        timestamp,
        price,
        maxCapacity: maxCapacity || 0,
      }
    });

  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create event',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}


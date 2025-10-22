import { publicClient } from '@/lib/contracts/client';
import { EVENT_BOOK_ABI, EVENT_BOOK_ADDRESS } from '@/lib/contracts/eventBook';
import { type NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/events - Get all events with pagination and search
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Number.parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(Number.parseInt(searchParams.get('limit') || '50', 10), 100); // Max 100 per page
    const search = searchParams.get('search') || '';
    const includeAll = searchParams.get('all') === 'true'; // For client-side caching

    // Get total number of events
    const numberOfEvents = await publicClient.readContract({
      address: EVENT_BOOK_ADDRESS,
      abi: EVENT_BOOK_ABI,
      functionName: 'getNumberOfEvents',
    }) as bigint;

    const eventCount = Number(numberOfEvents);

    // Use multicall to fetch all events in batches (viem handles this automatically)
    const eventContracts = Array.from({ length: eventCount }, (_, index) => ({
      address: EVENT_BOOK_ADDRESS,
      abi: EVENT_BOOK_ABI,
      functionName: 'events' as const,
      args: [BigInt(index)],
    }));

    // Fetch all events using multicall - viem batches these automatically
    const eventResults = await publicClient.multicall({
      contracts: eventContracts,
      allowFailure: false, // Fail if any call fails
    }) as Array<[string, string, bigint, bigint, bigint, string, bigint, bigint, string, boolean, boolean]>;

    // Transform results
    const allEvents = eventResults.map((eventData, index) => {
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

      return {
        id: index,
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
    });

    // Apply search filter if provided
    let filteredEvents = allEvents;
    if (search) {
      const query = search.toLowerCase();
      filteredEvents = allEvents.filter(event =>
        event.name.toLowerCase().includes(query) ||
        event.location.toLowerCase().includes(query)
      );
    }

    // Sort by date (upcoming first)
    const sortedEvents = filteredEvents.sort((a, b) => a.date - b.date);

    // Return all if requested (for initial cache)
    if (includeAll) {
      return NextResponse.json({
        success: true,
        events: sortedEvents,
        count: eventCount,
        total: filteredEvents.length,
        page: 1,
        limit: filteredEvents.length,
        hasMore: false,
      });
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedEvents = sortedEvents.slice(startIndex, endIndex);
    const hasMore = endIndex < sortedEvents.length;

    return NextResponse.json({
      success: true,
      events: paginatedEvents,
      count: eventCount,
      total: filteredEvents.length,
      page,
      limit,
      hasMore,
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

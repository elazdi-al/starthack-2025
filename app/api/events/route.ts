import { publicClient } from '@/lib/contracts/client';
import { EVENT_BOOK_ABI, EVENT_BOOK_ADDRESS } from '@/lib/contracts/eventBook';
import { type NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/events - Get all events with pagination, search, and category filter (on-chain)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Number.parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(Number.parseInt(searchParams.get('limit') || '20', 10), 50); // Max 50 per page (smart contract limit)
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';

    // Calculate offset for pagination (zero-based)
    const offset = (page - 1) * limit;

    // Call the new smart contract function with pagination, search, and category filter
    const result = await publicClient.readContract({
      address: EVENT_BOOK_ADDRESS,
      abi: EVENT_BOOK_ABI,
      functionName: 'getEvents',
      args: [
        BigInt(offset),
        BigInt(limit),
        search,
        category,
        true, // onlyUpcoming = true
      ],
    }) as [
      bigint[], // eventIds
      string[], // names
      string[], // locations
      bigint[], // dates
      bigint[], // prices
      string[], // creators
      bigint[], // ticketsSold
      bigint[], // maxCapacities
      string[], // imageURIs
      boolean[], // isPrivate
      bigint // total
    ];

    const [
      eventIds,
      names,
      locations,
      dates,
      prices,
      creators,
      ticketsSoldArray,
      maxCapacities,
      imageURIs,
      isPrivateArray,
      total,
    ] = result;

    // Transform results
    const events = eventIds.map((_, index) => ({
      id: Number(eventIds[index]),
      name: names[index],
      location: locations[index],
      date: Number(dates[index]),
      price: prices[index].toString(),
      creator: creators[index],
      ticketsSold: Number(ticketsSoldArray[index]),
      maxCapacity: Number(maxCapacities[index]),
      imageURI: imageURIs[index],
      isPrivate: isPrivateArray[index],
      whitelistIsLocked: true, // All upcoming events should have locked whitelist
      isPast: false, // We filtered for upcoming only
      isFull: Number(maxCapacities[index]) > 0 && Number(ticketsSoldArray[index]) >= Number(maxCapacities[index]),
    }));

    const totalCount = Number(total);
    const hasMore = offset + events.length < totalCount;

    return NextResponse.json({
      success: true,
      events,
      count: events.length,
      total: totalCount,
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

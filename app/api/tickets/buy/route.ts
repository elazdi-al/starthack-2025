import {type NextRequest, NextResponse } from 'next/server';
import { publicClient } from '@/lib/contracts/client';
import { EVENT_BOOK_ADDRESS, EVENT_BOOK_ABI } from '@/lib/contracts/eventBook';

export const dynamic = 'force-dynamic';

// POST /api/tickets/buy - Prepare ticket purchase (validation)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId, address } = body;

    if (eventId === undefined || !address) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: eventId and address' },
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

    // Fetch event data to validate purchase
    const eventData = await publicClient.readContract({
      address: EVENT_BOOK_ADDRESS,
      abi: EVENT_BOOK_ABI,
      functionName: 'getEvent',
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

    const [
      name,
      _location,
      date,
      price,
      _revenueOwed,
      _creator,
      ticketsSold,
      maxCapacity,
    ] = eventData;

    // Check if event has passed
    if (Number(date) < Math.floor(Date.now() / 1000)) {
      return NextResponse.json(
        { success: false, error: 'Event has already passed' },
        { status: 400 }
      );
    }

    // Check if event is full
    if (Number(maxCapacity) > 0 && Number(ticketsSold) >= Number(maxCapacity)) {
      return NextResponse.json(
        { success: false, error: 'Event is sold out' },
        { status: 400 }
      );
    }



    // Return transaction data for client-side execution
    return NextResponse.json({
      success: true,
      message: 'Purchase validated',
      data: {
        eventId,
        eventName: name,
        price: price.toString(),
        contractAddress: EVENT_BOOK_ADDRESS,
      }
    });

  } catch (error) {
    console.error('Error validating ticket purchase:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to validate ticket purchase',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

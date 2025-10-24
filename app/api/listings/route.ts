import { publicClient } from '@/lib/contracts/client';
import { EVENT_BOOK_ABI, EVENT_BOOK_ADDRESS } from '@/lib/contracts/eventBook';
import { type NextRequest, NextResponse } from 'next/server';
import { formatUnits } from 'viem';

export const dynamic = 'force-dynamic';

// GET /api/listings - Get paginated listings
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const offset = Number.parseInt(searchParams.get('offset') || '0');
    const limit = Number.parseInt(searchParams.get('limit') || '10');
    const eventId = searchParams.get('eventId');

    // Validate limit (max 50)
    if (limit > 50 || limit < 1) {
      return NextResponse.json(
        { success: false, error: 'Limit must be between 1 and 50' },
        { status: 400 }
      );
    }

    // If eventId is provided, get listings for that specific event
    if (eventId !== null) {
      const result = await publicClient.readContract({
        address: EVENT_BOOK_ADDRESS,
        abi: EVENT_BOOK_ABI,
        functionName: 'getListingsByEvent',
        args: [BigInt(eventId), BigInt(offset), BigInt(limit)],
      }) as [bigint[], `0x${string}`[], bigint[], bigint];

      const [tokenIds, sellers, prices, total] = result;

      // If we have listings, fetch event details using multicall
      if (tokenIds.length > 0) {
        const listingEventId = BigInt(eventId);

        // Fetch event details once (not per listing)
        const eventData = await publicClient.readContract({
          address: EVENT_BOOK_ADDRESS,
          abi: EVENT_BOOK_ABI,
          functionName: 'getEvent',
          args: [listingEventId],
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

        const [name, location, date, originalPrice] = eventData;

        // Map all listings with the same event data
        const listings = tokenIds.map((tokenId, index) => ({
          tokenId: tokenId.toString(),
          seller: sellers[index],
          price: formatUnits(prices[index], 18),
          priceWei: prices[index].toString(),
          eventId: listingEventId.toString(),
          eventName: name,
          eventLocation: location,
          eventDate: Number(date),
          originalPrice: formatUnits(originalPrice, 18),
        }));

        return NextResponse.json({
          success: true,
          listings,
          pagination: {
            offset,
            limit,
            total: Number(total),
            hasMore: offset + limit < Number(total),
          },
        });
      }

      // No listings for this event
      return NextResponse.json({
        success: true,
        listings: [],
        pagination: {
          offset,
          limit,
          total: Number(total),
          hasMore: false,
        },
      });
    }

    // Get all active listings
    const result = await publicClient.readContract({
      address: EVENT_BOOK_ADDRESS,
      abi: EVENT_BOOK_ABI,
      functionName: 'getActiveListings',
      args: [BigInt(offset), BigInt(limit)],
    }) as [bigint[], `0x${string}`[], bigint[], bigint[], string[], bigint[], bigint];

    const [tokenIds, sellers, prices, eventIds, eventNames, eventDates, total] = result;

    // Map the data to a more friendly format
    const listings = tokenIds.map((tokenId, index) => ({
      tokenId: tokenId.toString(),
      seller: sellers[index],
      price: formatUnits(prices[index], 18),
      priceWei: prices[index].toString(),
      eventId: eventIds[index].toString(),
      eventName: eventNames[index],
      eventDate: Number(eventDates[index]),
    }));

    return NextResponse.json({
      success: true,
      listings,
      pagination: {
        offset,
        limit,
        total: Number(total),
        hasMore: offset + limit < Number(total),
      },
    });

  } catch (error) {
    console.error('Error fetching listings:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch listings',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

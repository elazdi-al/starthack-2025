import { publicClient } from '@/lib/contracts/client';
import { EVENT_BOOK_ABI, EVENT_BOOK_ADDRESS } from '@/lib/contracts/eventBook';
import { NextRequest, NextResponse } from 'next/server';
import { formatUnits } from 'viem';

export const dynamic = 'force-dynamic';

// GET /api/listings - Get paginated listings
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const offset = parseInt(searchParams.get('offset') || '0');
    const limit = parseInt(searchParams.get('limit') || '10');
    const eventId = searchParams.get('eventId');

    // Validate limit (max 50)
    if (limit > 50 || limit < 1) {
      return NextResponse.json(
        { success: false, error: 'Limit must be between 1 and 50' },
        { status: 400 }
      );
    }

    let result;

    // If eventId is provided, get listings for that specific event
    if (eventId !== null) {
      result = await publicClient.readContract({
        address: EVENT_BOOK_ADDRESS,
        abi: EVENT_BOOK_ABI,
        functionName: 'getListingsByEvent',
        args: [BigInt(eventId), BigInt(offset), BigInt(limit)],
      }) as [bigint[], `0x${string}`[], bigint[], bigint];

      const [tokenIds, sellers, prices, total] = result;

      // Fetch event details for each listing
      const listings = await Promise.all(
        tokenIds.map(async (tokenId, index) => {
          const listingEventId = BigInt(eventId);
          const eventData = await publicClient.readContract({
            address: EVENT_BOOK_ADDRESS,
            abi: EVENT_BOOK_ABI,
            functionName: 'events',
            args: [listingEventId],
          }) as [string, string, bigint, bigint, bigint, string, bigint, bigint];

          const [name, location, date, originalPrice] = eventData;

          return {
            tokenId: tokenId.toString(),
            seller: sellers[index],
            price: formatUnits(prices[index], 18),
            priceWei: prices[index].toString(),
            eventId: listingEventId.toString(),
            eventName: name,
            eventLocation: location,
            eventDate: Number(date),
            originalPrice: formatUnits(originalPrice, 18),
          };
        })
      );

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
    } else {
      // Get all active listings
      result = await publicClient.readContract({
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
    }

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

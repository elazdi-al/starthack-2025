import { publicClient } from '@/lib/contracts/client';
import { EVENT_BOOK_ABI, EVENT_BOOK_ADDRESS } from '@/lib/contracts/eventBook';
import { TICKET_ABI, TICKET_CONTRACT_ADDRESS } from '@/lib/contracts/ticket';
import { NextRequest, NextResponse } from 'next/server';
import { formatUnits } from 'viem';

export const dynamic = 'force-dynamic';

// GET /api/listings/[id] - Get a specific listing by token ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tokenId = BigInt(id);

    // Get listing details
    const listingData = await publicClient.readContract({
      address: EVENT_BOOK_ADDRESS,
      abi: EVENT_BOOK_ABI,
      functionName: 'getListing',
      args: [tokenId],
    }) as [`0x${string}`, bigint, boolean];

    const [seller, price, active] = listingData;

    if (!active) {
      return NextResponse.json(
        { success: false, error: 'Listing is not active' },
        { status: 404 }
      );
    }

    // Get the event ID from the ticket contract
    const eventId = await publicClient.readContract({
      address: TICKET_CONTRACT_ADDRESS,
      abi: TICKET_ABI,
      functionName: 'ticketToEvent',
      args: [tokenId],
    }) as bigint;

    // Get event details
    const eventData = await publicClient.readContract({
      address: EVENT_BOOK_ADDRESS,
      abi: EVENT_BOOK_ABI,
      functionName: 'events',
      args: [eventId],
    }) as [string, string, bigint, bigint, bigint, string, bigint, bigint];

    const [name, location, date, originalPrice, _revenueOwed, creator, ticketsSold, maxCapacity] = eventData;

    return NextResponse.json({
      success: true,
      listing: {
        tokenId: tokenId.toString(),
        seller,
        price: formatUnits(price, 18),
        priceWei: price.toString(),
        active,
        event: {
          id: eventId.toString(),
          name,
          location,
          date: Number(date),
          originalPrice: formatUnits(originalPrice, 18),
          creator,
          ticketsSold: Number(ticketsSold),
          maxCapacity: Number(maxCapacity),
          isPast: Number(date) < Math.floor(Date.now() / 1000),
        },
      },
    });

  } catch (error) {
    console.error('Error fetching listing:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch listing',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

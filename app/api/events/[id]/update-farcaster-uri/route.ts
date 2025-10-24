import { type NextRequest, NextResponse } from 'next/server';
import { publicClient } from '@/lib/contracts/client';
import { EVENT_BOOK_ADDRESS, EVENT_BOOK_ABI } from '@/lib/contracts/eventBook';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

export const dynamic = 'force-dynamic';

// POST /api/events/[id]/update-farcaster-uri - Update event's farcasterURI
export async function POST(
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

    const body = await request.json();
    const { farcasterURI, creatorAddress } = body;

    if (!farcasterURI || typeof farcasterURI !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid farcasterURI' },
        { status: 400 }
      );
    }

    if (!creatorAddress) {
      return NextResponse.json(
        { success: false, error: 'Missing creator address' },
        { status: 400 }
      );
    }

    // Verify the requester is the event creator
    const eventData = await publicClient.readContract({
      address: EVENT_BOOK_ADDRESS,
      abi: EVENT_BOOK_ABI,
      functionName: 'getEvent',
      args: [BigInt(eventId)],
    }) as [
      string,    // name
      string,    // location
      bigint,    // date
      bigint,    // price
      bigint,    // revenueOwed
      string,    // creator
      bigint,    // ticketsSold
      bigint,    // maxCapacity
      string,    // imageURI
      string[],  // categories
      boolean,   // isPrivate
      boolean,   // whitelistIsLocked
      string     // farcasterURI
    ];

    const creator = eventData[5];

    if (creator.toLowerCase() !== creatorAddress.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: 'Only event creator can update Farcaster URI' },
        { status: 403 }
      );
    }

    // Return success - the actual transaction will be handled by the frontend
    // This endpoint is primarily for validation
    return NextResponse.json({
      success: true,
      message: 'Validation successful',
      eventId,
      farcasterURI,
    });

  } catch (error) {
    console.error('Error updating Farcaster URI:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update Farcaster URI',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

import { type NextRequest, NextResponse } from 'next/server';
import { notifyEventCreator } from '@/lib/notifications';
import { publicClient } from '@/lib/contracts/client';
import { EVENT_BOOK_ADDRESS, EVENT_BOOK_ABI } from '@/lib/contracts/eventBook';
import { farcasterAPI } from '@/lib/api';

export const dynamic = 'force-dynamic';

// POST /api/tickets/notify-creator - Notify event creator after ticket purchase
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId, buyerAddress } = body;

    if (eventId === undefined || !buyerAddress) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: eventId and buyerAddress' },
        { status: 400 }
      );
    }

    // Get event details to find the creator
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

    const [name, , , , , creator] = eventData;

    // Try to get buyer's Farcaster profile for a nice display name
    let buyerInfo = `${buyerAddress.slice(0, 6)}...${buyerAddress.slice(-4)}`;
    try {
      const buyerProfileResponse = await farcasterAPI.getUserByAddress(buyerAddress);
      if (buyerProfileResponse.success && buyerProfileResponse.user) {
        const profile = buyerProfileResponse.user;
        buyerInfo = profile.display_name || profile.username || buyerInfo;
      }
    } catch (error) {
      console.log('Could not fetch buyer Farcaster profile:', error);
      // Continue with shortened address
    }

    // Send notification to event creator
    const result = await notifyEventCreator({
      creatorAddress: creator,
      eventName: name,
      buyerInfo,
      eventId,
    });

    if (result.state === 'success') {
      return NextResponse.json({
        success: true,
        message: 'Creator notification sent',
      });
    } else if (result.state === 'no_token') {
      // Creator hasn't enabled notifications, but that's okay
      return NextResponse.json({
        success: true,
        message: 'Creator has not enabled notifications',
      });
    } else {
      console.error('Failed to send notification:', result);
      return NextResponse.json({
        success: false,
        error: 'Failed to send notification',
        details: result.state === 'error' ? result.error : result.state,
      });
    }

  } catch (error) {
    console.error('Error notifying event creator:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to notify event creator',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

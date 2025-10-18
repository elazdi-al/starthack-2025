import { type NextRequest, NextResponse } from 'next/server';
import { publicClient } from '@/lib/contracts/client';
import { TICKET_CONTRACT_ADDRESS, TICKET_ABI } from '@/lib/contracts/ticket';
import { EVENT_BOOK_ADDRESS, EVENT_BOOK_ABI } from '@/lib/contracts/eventBook';

export const dynamic = 'force-dynamic';

// POST /api/tickets/verify - Verify a ticket for event entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { qrData, eventId, eventOwner } = body;

    if (!qrData || eventId === undefined || !eventOwner) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: qrData, eventId, eventOwner' },
        { status: 400 }
      );
    }

    // Parse QR data format: tokenId-eventId-holder-eventName
    const parts = qrData.split('-');
    if (parts.length < 3) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid QR code format',
          valid: false 
        },
        { status: 400 }
      );
    }

    const tokenId = parts[0];
    const ticketEventId = parts[1];
    const originalHolder = parts[2];

    // Verify this is the correct event
    if (ticketEventId !== eventId.toString()) {
      return NextResponse.json({
        success: true,
        valid: false,
        error: 'Wrong event',
        message: 'This ticket is for a different event',
        details: {
          tokenId,
          expectedEventId: eventId,
          actualEventId: ticketEventId,
        }
      });
    }

    // Check if token exists and get current owner
    let currentOwner: string;
    try {
      currentOwner = await publicClient.readContract({
        address: TICKET_CONTRACT_ADDRESS,
        abi: TICKET_ABI,
        functionName: 'ownerOf',
        args: [BigInt(tokenId)],
      }) as string;
    } catch (error) {
      return NextResponse.json({
        success: true,
        valid: false,
        error: 'Ticket not found',
        message: 'This ticket does not exist on the blockchain',
        details: { tokenId }
      });
    }

    // Verify ticket is for this event
    const ticketEventIdOnChain = await publicClient.readContract({
      address: TICKET_CONTRACT_ADDRESS,
      abi: TICKET_ABI,
      functionName: 'ticketToEvent',
      args: [BigInt(tokenId)],
    }) as bigint;

    if (ticketEventIdOnChain.toString() !== eventId.toString()) {
      return NextResponse.json({
        success: true,
        valid: false,
        error: 'Event mismatch',
        message: 'Ticket does not belong to this event',
        details: {
          tokenId,
          expectedEventId: eventId,
          actualEventId: ticketEventIdOnChain.toString(),
        }
      });
    }

    // Get event details to verify ownership
    const eventData = await publicClient.readContract({
      address: EVENT_BOOK_ADDRESS,
      abi: EVENT_BOOK_ABI,
      functionName: 'events',
      args: [BigInt(eventId)],
    }) as [
      string, // name
      string, // location
      bigint, // date
      bigint, // price
      bigint, // revenueOwed
      string, // creator
      bigint, // ticketsSold
      bigint, // maxCapacity
      string, // imageURI
      boolean, // isPrivate
      boolean  // whitelistIsLocked
    ];

    const eventCreator = eventData[5];

    // Verify the scanner is the event owner
    if (eventCreator.toLowerCase() !== eventOwner.toLowerCase()) {
      return NextResponse.json({
        success: true,
        valid: false,
        error: 'Unauthorized',
        message: 'You are not the owner of this event',
        details: {
          eventCreator,
          providedOwner: eventOwner,
        }
      });
    }

    // All checks passed - ticket is valid
    return NextResponse.json({
      success: true,
      valid: true,
      message: 'Ticket is valid for entry',
      details: {
        tokenId,
        eventId: ticketEventIdOnChain.toString(),
        eventName: eventData[0],
        currentOwner,
        originalHolder,
        ownerChanged: currentOwner.toLowerCase() !== originalHolder.toLowerCase(),
      }
    });

  } catch (error) {
    console.error('Error verifying ticket:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to verify ticket',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}


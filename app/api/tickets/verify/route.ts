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
          valid: false,
          message: 'QR code is not a valid ticket format'
        },
        { status: 400 }
      );
    }

    const tokenId = parts[0];
    const ticketEventId = parts[1];
    const originalHolder = parts[2];

    // STEP 1: Verify ticket is for the correct event (QR data check)
    if (ticketEventId !== eventId.toString()) {
      return NextResponse.json({
        success: true,
        valid: false,
        error: 'Wrong event',
        message: `This ticket is for Event #${ticketEventId}, not Event #${eventId}`,
        details: {
          tokenId,
          expectedEventId: eventId,
          actualEventId: ticketEventId,
        }
      });
    }

    // STEP 2: Get event details FIRST to verify scanner is the event owner
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
    const eventName = eventData[0];
    const eventDate = Number(eventData[2]);

    // STEP 3: Verify the scanner is the event owner 
    if (eventCreator.toLowerCase() !== eventOwner.toLowerCase()) {
      return NextResponse.json({
        success: true,
        valid: false,
        error: 'Unauthorized scanner',
        message: 'Only the event owner can scan tickets for this event',
        details: {
          eventId,
          eventName,
          eventCreator: `${eventCreator.slice(0, 6)}...${eventCreator.slice(-4)}`,
          providedOwner: `${eventOwner.slice(0, 6)}...${eventOwner.slice(-4)}`,
        }
      });
    }

    // STEP 4: Check if ticket exists on blockchain and get current owner
    let currentOwner: string;
    try {
      currentOwner = await publicClient.readContract({
        address: TICKET_CONTRACT_ADDRESS,
        abi: TICKET_ABI,
        functionName: 'ownerOf',
        args: [BigInt(tokenId)],
      }) as string;
    } catch {
      return NextResponse.json({
        success: true,
        valid: false,
        error: 'Ticket not found',
        message: 'This ticket NFT does not exist or has been burned',
        details: {
          tokenId,
          eventId,
          eventName
        }
      });
    }

    // STEP 5: Verify ticket belongs to THIS event on blockchain
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
        error: 'Event mismatch on blockchain',
        message: `Ticket #${tokenId} is registered for Event #${ticketEventIdOnChain}, not Event #${eventId}`,
        details: {
          tokenId,
          expectedEventId: eventId,
          actualEventId: ticketEventIdOnChain.toString(),
          eventName,
        }
      });
    }

    // STEP 6: Check if event has already passed
    const now = Math.floor(Date.now() / 1000);
    if (eventDate < now) {
      return NextResponse.json({
        success: true,
        valid: false,
        error: 'Event has passed',
        message: 'This event has already ended',
        details: {
          tokenId,
          eventId,
          eventName,
          eventDate,
          currentTime: now,
        }
      });
    }

    // ALL CHECKS PASSED - Ticket is valid for entry
    const ownerChanged = currentOwner.toLowerCase() !== originalHolder.toLowerCase();
    
    return NextResponse.json({
      success: true,
      valid: true,
      message: ownerChanged 
        ? '✓ Valid ticket (resold)' 
        : '✓ Valid ticket - Allow entry',
      details: {
        tokenId,
        eventId: ticketEventIdOnChain.toString(),
        eventName,
        currentOwner,
        originalHolder,
        ownerChanged,
        verifiedChecks: [
          '✓ Ticket exists on blockchain',
          '✓ Belongs to this event',
          '✓ Scanner is event owner',
          '✓ Event has not passed',
          ownerChanged ? '⚠ Ticket was resold' : '✓ Original holder'
        ]
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


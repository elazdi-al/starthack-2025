import { NextRequest, NextResponse } from 'next/server';
import { generateTicketMetadata } from '@/lib/ticketMetadata';
import { publicClient } from '@/lib/contracts/client';
import { EVENT_BOOK_ADDRESS, EVENT_BOOK_ABI } from '@/lib/contracts/eventBook';

export const dynamic = 'force-dynamic';

// POST /api/tickets/metadata/create - Create metadata after ticket purchase
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tokenId, eventId, holder } = body;

    if (tokenId === undefined || eventId === undefined || !holder) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: tokenId, eventId, holder' },
        { status: 400 }
      );
    }

    // Fetch event details from blockchain
    const eventData = await publicClient.readContract({
      address: EVENT_BOOK_ADDRESS,
      abi: EVENT_BOOK_ABI,
      functionName: 'events',
      args: [BigInt(eventId)],
    }) as [
      string,
      string,
      bigint,
      bigint,
      bigint,
      string,
      bigint,
      bigint,
      string,
      boolean,
      boolean
    ];

    const [name, location, date] = eventData;

    // Generate and save metadata
    const metadata = generateTicketMetadata(
      tokenId.toString(),
      eventId,
      name,
      location,
      Number(date),
      holder
    );

    // Return metadata URL that can be used as tokenURI
    const metadataUrl = `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/tickets/metadata/${tokenId}`;

    return NextResponse.json({
      success: true,
      message: 'Metadata created successfully',
      metadata,
      metadataUrl,
    });

  } catch (error) {
    console.error('Error creating ticket metadata:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create metadata',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

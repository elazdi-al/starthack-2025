import { NextRequest, NextResponse } from 'next/server';
import { getTicketMetadata, generateNFTMetadata } from '@/lib/ticketMetadata';

export const dynamic = 'force-dynamic';

// GET /api/tickets/metadata/[tokenId] - Get NFT metadata for a specific token
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tokenId: string }> }
) {
  try {
    const { tokenId } = await context.params;

    const metadata = getTicketMetadata(tokenId);

    if (!metadata) {
      return NextResponse.json(
        { 
          name: `Ticket #${tokenId}`,
          description: 'Event Ticket',
          image: `https://api.dicebear.com/7.x/shapes/svg?seed=${tokenId}`
        },
        { status: 200 }
      );
    }

    // Return OpenSea-compatible JSON metadata
    const nftMetadata = generateNFTMetadata(metadata);
    
    return new NextResponse(nftMetadata, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('Error fetching ticket metadata:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metadata' },
      { status: 500 }
    );
  }
}


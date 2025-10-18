import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// In-memory marketplace store (shared with main marketplace route)
// In production, this should be in a database
const marketplaceListings = new Map<string, {
  ticketId: string;
  eventId: number;
  seller: string;
  price: string;
  eventName: string;
  date: string;
  location: string;
  ticketType: string;
  listedAt: number;
}>();

// DELETE /api/marketplace/[id] - Cancel a listing
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const seller = searchParams.get('seller');

    if (!seller) {
      return NextResponse.json(
        { success: false, error: 'Seller address is required' },
        { status: 400 }
      );
    }

    // Check if listing exists
    const listing = marketplaceListings.get(id);

    if (!listing) {
      return NextResponse.json(
        { success: false, error: 'Listing not found' },
        { status: 404 }
      );
    }

    // Verify the requester is the seller
    if (listing.seller.toLowerCase() !== seller.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: 'Only the seller can cancel this listing' },
        { status: 403 }
      );
    }

    // Remove listing
    marketplaceListings.delete(id);

    return NextResponse.json({
      success: true,
      message: 'Listing cancelled successfully',
    });

  } catch (error: any) {
    console.error('Error cancelling listing:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to cancel listing',
        message: error.message 
      },
      { status: 500 }
    );
  }
}

// GET /api/marketplace/[id] - Get a specific listing
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const listing = marketplaceListings.get(id);

    if (!listing) {
      return NextResponse.json(
        { success: false, error: 'Listing not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      listing: {
        id,
        eventId: listing.eventId,
        eventTitle: listing.eventName,
        date: listing.date,
        location: listing.location,
        ticketType: listing.ticketType,
        price: listing.price,
        sellerAddress: listing.seller,
        listedAt: listing.listedAt,
      }
    });

  } catch (error: any) {
    console.error('Error fetching listing:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch listing',
        message: error.message 
      },
      { status: 500 }
    );
  }
}


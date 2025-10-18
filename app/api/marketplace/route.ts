import { NextRequest, NextResponse } from 'next/server';
import { publicClient } from '@/lib/contracts/client';
import { EVENT_BOOK_ADDRESS, EVENT_BOOK_ABI } from '@/lib/contracts/eventBook';

export const dynamic = 'force-dynamic';

// In-memory marketplace store (in production, use a database)
// Structure: { ticketId: { eventId, seller, price, eventName, date, location, ticketType, listedAt } }
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

// GET /api/marketplace - Get all marketplace listings
export async function GET() {
  try {
    // Convert map to array and validate listings
    const listings = [];
    
    for (const [ticketId, listing] of marketplaceListings.entries()) {
      // Verify seller still owns the ticket
      const hasTicket = await publicClient.readContract({
        address: EVENT_BOOK_ADDRESS,
        abi: EVENT_BOOK_ABI,
        functionName: 'hasTicket',
        args: [BigInt(listing.eventId), listing.seller as `0x${string}`],
      }) as boolean;

      // Only include if seller still owns the ticket
      if (hasTicket) {
        // Get current event data to check if event hasn't passed
        const eventData = await publicClient.readContract({
          address: EVENT_BOOK_ADDRESS,
          abi: EVENT_BOOK_ABI,
          functionName: 'events',
          args: [BigInt(listing.eventId)],
        }) as [string, string, bigint, bigint, bigint, string, bigint, bigint];

        const [, , date, , , , ,] = eventData;
        const eventHasPassed = Number(date) < Math.floor(Date.now() / 1000);

        if (!eventHasPassed) {
          listings.push({
            id: ticketId,
            eventId: listing.eventId,
            eventTitle: listing.eventName,
            date: listing.date,
            location: listing.location,
            ticketType: listing.ticketType,
            price: listing.price,
            sellerAddress: listing.seller,
            listedAt: listing.listedAt,
          });
        } else {
          // Remove expired listings
          marketplaceListings.delete(ticketId);
        }
      } else {
        // Remove invalid listings (seller no longer owns ticket)
        marketplaceListings.delete(ticketId);
      }
    }

    // Sort by listing date (newest first)
    listings.sort((a, b) => b.listedAt - a.listedAt);

    return NextResponse.json({ 
      success: true, 
      listings,
      count: listings.length
    });

  } catch (error) {
    console.error('Error fetching marketplace listings:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch marketplace listings',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/marketplace - Create a new listing
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ticketId, eventId, seller, price } = body;

    if (!ticketId || eventId === undefined || !seller || !price) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify seller owns the ticket
    const hasTicket = await publicClient.readContract({
      address: EVENT_BOOK_ADDRESS,
      abi: EVENT_BOOK_ABI,
      functionName: 'hasTicket',
      args: [BigInt(eventId), seller as `0x${string}`],
    }) as boolean;

    if (!hasTicket) {
      return NextResponse.json(
        { success: false, error: 'Seller does not own this ticket' },
        { status: 403 }
      );
    }

    // Get event data
    const eventData = await publicClient.readContract({
      address: EVENT_BOOK_ADDRESS,
      abi: EVENT_BOOK_ABI,
      functionName: 'events',
      args: [BigInt(eventId)],
    }) as [string, string, bigint, bigint, bigint, string, bigint, bigint];

    const [name, location, date, , , , ,] = eventData;

    // Check if event hasn't passed
    if (Number(date) < Math.floor(Date.now() / 1000)) {
      return NextResponse.json(
        { success: false, error: 'Cannot list tickets for past events' },
        { status: 400 }
      );
    }

    // Create listing
    const listing = {
      ticketId,
      eventId,
      seller,
      price,
      eventName: name,
      date: new Date(Number(date) * 1000).toISOString().split('T')[0],
      location,
      ticketType: 'General Admission',
      listedAt: Date.now(),
    };

    marketplaceListings.set(ticketId, listing);

    return NextResponse.json({
      success: true,
      message: 'Listing created successfully',
      listing: {
        id: ticketId,
        eventId,
        price,
        listedAt: listing.listedAt,
      }
    });

  } catch (error) {
    console.error('Error creating marketplace listing:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create listing',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}


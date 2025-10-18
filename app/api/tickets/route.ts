import { NextRequest, NextResponse } from 'next/server';
import { publicClient } from '@/lib/contracts/client';
import { EVENT_BOOK_ADDRESS, EVENT_BOOK_ABI } from '@/lib/contracts/eventBook';

export const dynamic = 'force-dynamic';

// GET /api/tickets?address=0x... - Get all tickets for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { success: false, error: 'Address parameter is required' },
        { status: 400 }
      );
    }

    // Get total number of events
    const numberOfEvents = await publicClient.readContract({
      address: EVENT_BOOK_ADDRESS,
      abi: EVENT_BOOK_ABI,
      functionName: 'getNumberOfEvents',
    }) as bigint;

    const eventCount = Number(numberOfEvents);
    
    // Check ticket ownership for all events
    const tickets = await Promise.all(
      Array.from({ length: eventCount }, async (_, index) => {
        // Check if user has a ticket for this event
        const hasTicket = await publicClient.readContract({
          address: EVENT_BOOK_ADDRESS,
          abi: EVENT_BOOK_ABI,
          functionName: 'hasTicket',
          args: [BigInt(index), address as `0x${string}`],
        }) as boolean;

        if (!hasTicket) return null;

        // If user has a ticket, fetch event details
        const eventData = await publicClient.readContract({
          address: EVENT_BOOK_ADDRESS,
          abi: EVENT_BOOK_ABI,
          functionName: 'events',
          args: [BigInt(index)],
        }) as [string, string, bigint, bigint, bigint, string, bigint, bigint];

        const [name, location, date, price, revenueOwed, creator, ticketsSold, maxCapacity] = eventData;

        return {
          id: `TKT-${index}-${address.slice(2, 8)}`,
          eventId: index,
          eventTitle: name,
          date: new Date(Number(date) * 1000).toISOString().split('T')[0], // YYYY-MM-DD
          time: new Date(Number(date) * 1000).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
          }),
          location: location,
          venue: location,
          ticketType: 'General Admission',
          purchaseDate: new Date().toISOString().split('T')[0], // Mock purchase date
          qrData: `${index}-${address}-${name}`,
          isValid: Number(date) > Math.floor(Date.now() / 1000), // Event hasn't passed
          status: 'owned' as const,
        };
      })
    );

    // Filter out null values (events where user doesn't have tickets)
    const userTickets = tickets.filter(ticket => ticket !== null);

    return NextResponse.json({ 
      success: true, 
      tickets: userTickets,
      count: userTickets.length
    });

  } catch (error: any) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch tickets',
        message: error.message 
      },
      { status: 500 }
    );
  }
}


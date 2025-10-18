import { NextRequest, NextResponse } from 'next/server';
import { publicClient } from '@/lib/contracts/client';
import { EVENT_BOOK_ADDRESS, EVENT_BOOK_ABI } from '@/lib/contracts/eventBook';
import { TICKET_CONTRACT_ADDRESS, TICKET_ABI } from '@/lib/contracts/ticket';
import { getTicketMetadata } from '@/lib/ticketMetadata';
import { getPurchasedTicketsForHolder } from '@/lib/purchasedTicketsStore';

export const dynamic = 'force-dynamic';

// GET /api/tickets?address=0x... - Get all tickets (NFTs) for a user
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

    // Get the latest block to query events from
    const latestBlock = await publicClient.getBlockNumber();
    const fromBlock = latestBlock > 100000 ? BigInt(latestBlock) - BigInt(100000) : BigInt(0);

    // Get all Transfer events to this address (minted or transferred tickets)
    const transferLogs = await publicClient.getLogs({
      address: TICKET_CONTRACT_ADDRESS,
      event: {
        type: 'event',
        name: 'Transfer',
        inputs: [
          { type: 'address', indexed: true, name: 'from' },
          { type: 'address', indexed: true, name: 'to' },
          { type: 'uint256', indexed: true, name: 'tokenId' },
        ],
      },
      args: {
        to: address as `0x${string}`,
      },
      fromBlock,
      toBlock: 'latest',
    });

    // Get unique token IDs
    const tokenIds = [...new Set(transferLogs.map(log => log.args.tokenId))].filter(Boolean);

    if (tokenIds.length === 0) {
      return NextResponse.json({ 
        success: true, 
        tickets: [],
        count: 0
      });
    }

    // For each token, verify current ownership and get details
    const userTickets = await Promise.all(
      tokenIds.map(async (tokenId) => {
        if (!tokenId) return null;

        try {
          // Verify current owner (ticket might have been transferred)
          const owner = await publicClient.readContract({
            address: TICKET_CONTRACT_ADDRESS,
            abi: TICKET_ABI,
            functionName: 'ownerOf',
            args: [tokenId],
          }) as string;

          if (owner.toLowerCase() !== address.toLowerCase()) {
            return null; // Token was transferred away
          }

          // Get the event ID for this ticket
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

          const [name, location, date] = eventData;

          // Get metadata if it exists
          const metadata = getTicketMetadata(tokenId.toString());
          
          const eventDate = Number(date);
          const now = Math.floor(Date.now() / 1000);

          return {
            id: `TKT-${tokenId}`,
            tokenId: tokenId.toString(),
            eventId: Number(eventId),
            eventTitle: name,
            date: new Date(eventDate * 1000).toISOString().split('T')[0],
            time: new Date(eventDate * 1000).toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: false 
            }),
            location: location,
            venue: location,
            ticketType: metadata?.ticketType || 'General Admission',
            purchaseDate: metadata?.purchaseDate 
              ? new Date(metadata.purchaseDate * 1000).toISOString().split('T')[0]
              : new Date().toISOString().split('T')[0],
            qrData: metadata?.qrData || `${tokenId}-${eventId}-${name}`,
            isValid: eventDate > now,
            status: 'owned' as const,
          };
        } catch (err) {
          console.error(`Error processing token ${tokenId}:`, err);
          return null;
        }
      })
    );

    const validTickets = userTickets.filter(
      (ticket): ticket is NonNullable<typeof ticket> => ticket !== null
    );

    const storedPurchases = getPurchasedTicketsForHolder(address);
    const storedTickets = storedPurchases.map((purchase) => {
      const metadata = getTicketMetadata(purchase.tokenId);
      const eventDate = metadata
        ? new Date(metadata.eventDate * 1000)
        : null;
      const purchaseDate = new Date(purchase.createdAt);

      return {
        id: `TKT-${purchase.tokenId}`,
        tokenId: purchase.tokenId,
        eventId: purchase.eventId,
        eventTitle: metadata?.eventName ?? `Event #${purchase.eventId}`,
        date: eventDate
          ? eventDate.toISOString().split('T')[0]
          : purchaseDate.toISOString().split('T')[0],
        time: eventDate
          ? eventDate.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            })
          : '00:00',
        location: metadata?.eventLocation ?? 'TBA',
        venue: metadata?.eventVenue ?? metadata?.eventLocation ?? 'TBA',
        ticketType: metadata?.ticketType ?? 'General Admission',
        purchaseDate: purchaseDate.toISOString().split('T')[0],
        qrData:
          metadata?.qrData ??
          `${purchase.tokenId}-${purchase.eventId}-${address}`,
        isValid: metadata
          ? metadata.eventDate > Math.floor(Date.now() / 1000)
          : true,
        status: 'owned' as const,
      };
    });

    const combinedTickets = [...validTickets, ...storedTickets];
    const uniqueTickets = combinedTickets.filter(
      (ticket, index, arr) =>
        arr.findIndex((candidate) => candidate?.id === ticket?.id) === index
    );

    return NextResponse.json({
      success: true,
      tickets: uniqueTickets,
      count: uniqueTickets.length,
    });

  } catch (error) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch tickets',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

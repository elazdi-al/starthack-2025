import { type NextRequest, NextResponse } from 'next/server';
import { publicClient } from '@/lib/contracts/client';
import { EVENT_BOOK_ADDRESS, EVENT_BOOK_ABI } from '@/lib/contracts/eventBook';
import { TICKET_CONTRACT_ADDRESS, TICKET_ABI } from '@/lib/contracts/ticket';
import { formatUnits } from 'viem';

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

    const normalizedAddress = address as `0x${string}`;

    const tokenIdSet = new Set<bigint>();

    try {
      const ticketIdsFromContract = await publicClient.readContract({
        address: EVENT_BOOK_ADDRESS,
        abi: EVENT_BOOK_ABI,
        functionName: 'getUserTickets',
        args: [normalizedAddress],
      }) as bigint[];

      for (const tokenId of ticketIdsFromContract) {
        if (typeof tokenId === 'bigint' && tokenId > BigInt(0)) {
          tokenIdSet.add(tokenId);
        }
      }
    } catch (error) {
      console.warn('getUserTickets unavailable, falling back to log scan:', error);
    }

    if (tokenIdSet.size === 0) {
      try {
        const latestBlock = await publicClient.getBlockNumber();
        const fromBlock = latestBlock > 100000 ? BigInt(latestBlock) - BigInt(100000) : BigInt(0);

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
            to: normalizedAddress,
          },
          fromBlock,
          toBlock: 'latest',
        });

        for (const log of transferLogs) {
          const tokenId = log.args.tokenId;
          if (typeof tokenId === 'bigint') {
            tokenIdSet.add(tokenId);
          }
        }
      } catch (blockchainError) {
        console.warn('Failed to fetch transfer logs for tickets:', blockchainError);
      }
    }

    const tokenIds = Array.from(tokenIdSet);

    if (tokenIds.length === 0) {
      return NextResponse.json({
        success: true,
        tickets: [],
        count: 0,
      });
    }

    const userTickets = await Promise.all(
      tokenIds.map(async (tokenId) => {
        try {
          const owner = await publicClient.readContract({
            address: TICKET_CONTRACT_ADDRESS,
            abi: TICKET_ABI,
            functionName: 'ownerOf',
            args: [tokenId],
          }) as string;

          if (owner.toLowerCase() !== address.toLowerCase()) {
            return null;
          }

          const eventId = await publicClient.readContract({
            address: TICKET_CONTRACT_ADDRESS,
            abi: TICKET_ABI,
            functionName: 'ticketToEvent',
            args: [tokenId],
          }) as bigint;

          const eventData = await publicClient.readContract({
            address: EVENT_BOOK_ADDRESS,
            abi: EVENT_BOOK_ABI,
            functionName: 'events',
            args: [eventId],
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

          // Fetch purchase time from blockchain, fallback to mint block timestamp
          let purchaseTime: bigint = BigInt(0);
          try {
            purchaseTime = await publicClient.readContract({
              address: TICKET_CONTRACT_ADDRESS,
              abi: TICKET_ABI,
              functionName: 'ticketPurchaseTime',
              args: [tokenId],
            }) as bigint;
          } catch {
            try {
              const mintLogs = await publicClient.getLogs({
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
                  tokenId,
                },
                fromBlock: BigInt(0),
                toBlock: 'latest',
              });

              const mintLog = mintLogs.find(
                (log) =>
                  log.args.from?.toLowerCase() === '0x0000000000000000000000000000000000000000' &&
                  typeof log.blockNumber === 'bigint',
              );

              if (mintLog?.blockNumber !== undefined) {
                const block = await publicClient.getBlock({ blockNumber: mintLog.blockNumber });
                if (block.timestamp !== undefined) {
                  purchaseTime = block.timestamp;
                }
              }
            } catch (fallbackError) {
              console.warn(`Unable to determine purchase time for token ${tokenId}:`, fallbackError);
            }
          }

          const eventDate = Number(date);
          const now = Math.floor(Date.now() / 1000);

          let status: 'owned' | 'listed' | 'sold' = 'owned';
          let listingPrice: string | undefined;

          try {
            const listingData = await publicClient.readContract({
              address: EVENT_BOOK_ADDRESS,
              abi: EVENT_BOOK_ABI,
              functionName: 'getListing',
              args: [tokenId],
            }) as [string, bigint, boolean];

            const [seller, price, active] = listingData;
            if (
              active &&
              seller.toLowerCase() === normalizedAddress.toLowerCase()
            ) {
              status = 'listed';
              listingPrice = formatUnits(price, 18);
            }
          } catch (listingError) {
            console.warn(`Failed to fetch listing details for token ${tokenId}:`, listingError);
          }

          return {
            id: `TKT-${tokenId}`,
            tokenId: tokenId.toString(),
            eventId: Number(eventId),
            eventTitle: name,
            date: new Date(eventDate * 1000).toISOString().split('T')[0],
            time: new Date(eventDate * 1000).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }),
            location,
            venue: location,
            ticketType: 'General Admission', // Stored on-chain in NFT metadata
            purchaseDate: purchaseTime > BigInt(0)
              ? new Date(Number(purchaseTime) * 1000).toISOString().split('T')[0]
              : new Date().toISOString().split('T')[0],
            qrData: `${tokenId}-${eventId}-${address}-${name}`, // Generated dynamically
            isValid: eventDate > now,
            status,
            listingPrice,
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

    return NextResponse.json({
      success: true,
      tickets: validTickets,
      count: validTickets.length,
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

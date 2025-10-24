import { publicClient } from '@/lib/contracts/client';
import { EVENT_BOOK_ABI, EVENT_BOOK_ADDRESS } from '@/lib/contracts/eventBook';
import { type NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/leaderboard - Get leaderboard with top N users
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number.parseInt(searchParams.get('limit') || '10', 10), 100);

    // Call smart contract to get leaderboard
    const result = await publicClient.readContract({
      address: EVENT_BOOK_ADDRESS,
      abi: EVENT_BOOK_ABI,
      functionName: 'getLeaderboard',
      args: [BigInt(limit)],
    }) as [string[], bigint[], bigint];

    const [users, eventCounts, _total] = result;

    // Filter out empty slots (address(0))
    const validUsers = users.filter((address) => address !== '0x0000000000000000000000000000000000000000');
    const validCounts = eventCounts.slice(0, validUsers.length);

    // Fetch Farcaster profiles for all valid users (in parallel)
    const profilePromises = validUsers.map(async (address) => {
      try {
        // Note: This is a server-side call, we need to fetch from Neynar API directly
        // For now, we'll return null and let the frontend handle it
        return { address, profile: null as { username?: string; displayName?: string; pfpUrl?: string } | null };
      } catch (error) {
        console.error(`Error fetching profile for ${address}:`, error);
        return { address, profile: null as { username?: string; displayName?: string; pfpUrl?: string } | null };
      }
    });

    const profiles = await Promise.all(profilePromises);

    // Transform results (only valid entries)
    const leaderboard = validUsers.map((address, index) => ({
      address,
      eventsJoined: Number(validCounts[index]),
      rank: index + 1,
      username: profiles[index]?.profile?.username || null,
      displayName: profiles[index]?.profile?.displayName || null,
      pfpUrl: profiles[index]?.profile?.pfpUrl || null,
    }));

    return NextResponse.json({
      success: true,
      leaderboard,
      total: validUsers.length, // Return actual number of users, not 10
    });

  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch leaderboard',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

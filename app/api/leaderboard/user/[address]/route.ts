import { publicClient } from '@/lib/contracts/client';
import { EVENT_BOOK_ABI, EVENT_BOOK_ADDRESS } from '@/lib/contracts/eventBook';
import { type NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/leaderboard/user/[address] - Get user's overall statistics
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;

    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { success: false, error: 'Invalid address' },
        { status: 400 }
      );
    }

    // Call smart contract to get user stats
    const result = await publicClient.readContract({
      address: EVENT_BOOK_ADDRESS,
      abi: EVENT_BOOK_ABI,
      functionName: 'getUserStats',
      args: [address as `0x${string}`],
    }) as [bigint, bigint];

    const [totalEvents, monthlyEvents] = result;

    // Get user's leaderboard position directly
    const positionResult = await publicClient.readContract({
      address: EVENT_BOOK_ADDRESS,
      abi: EVENT_BOOK_ABI,
      functionName: 'getUserLeaderboardPosition',
      args: [address as `0x${string}`],
    }) as [boolean, bigint];

    const [isInLeaderboard, rankBigInt] = positionResult;

    // Rank is 1-10 if in leaderboard, 0 if not
    const rank = isInLeaderboard ? Number(rankBigInt) : null;

    return NextResponse.json({
      success: true,
      stats: {
        totalEvents: Number(totalEvents),
        monthlyEvents: Number(monthlyEvents),
        rank,
      },
    });

  } catch (error) {
    console.error('Error fetching user stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch user stats',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

import { publicClient } from '@/lib/contracts/client';
import { EVENT_BOOK_ABI, EVENT_BOOK_ADDRESS } from '@/lib/contracts/eventBook';
import { type NextRequest, NextResponse } from 'next/server';
import { getBadgeLevel, getBadgeProgress } from '@/lib/utils/badges';

export const dynamic = 'force-dynamic';

// POST /api/leaderboard/user/[address]/categories - Get user's category statistics
export async function POST(
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

    const body = await request.json();
    const { categories } = body;

    if (!Array.isArray(categories) || categories.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Categories array is required' },
        { status: 400 }
      );
    }

    // Call smart contract to get user category stats
    const result = await publicClient.readContract({
      address: EVENT_BOOK_ADDRESS,
      abi: EVENT_BOOK_ABI,
      functionName: 'getUserCategoryStats',
      args: [address as `0x${string}`, categories],
    }) as bigint[];

    console.log('getUserCategoryStats - Address:', address);
    console.log('getUserCategoryStats - Categories:', categories);
    console.log('getUserCategoryStats - Raw result:', result);

    // Transform results with badge information
    const categoryStats = categories.map((category, index) => {
      const eventsJoined = Number(result[index]);
      const badgeLevel = getBadgeLevel(eventsJoined);
      const progress = getBadgeProgress(eventsJoined);

      console.log(`Category: ${category}, Events: ${eventsJoined}, Badge: ${badgeLevel}`);

      return {
        category,
        eventsJoined,
        badgeLevel,
        progress: {
          current: progress.current,
          nextLevel: progress.nextLevelInfo?.minEvents || 0,
          percentage: progress.percentage,
        },
      };
    });

    return NextResponse.json({
      success: true,
      categoryStats,
    });

  } catch (error) {
    console.error('Error fetching user category stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch user category stats',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

import { type NextRequest, NextResponse } from 'next/server';
import { publicClient } from '@/lib/contracts/client';
import { formatEther } from 'viem';

export const dynamic = 'force-dynamic';

// GET /api/wallet/balance?address=0x... - Get wallet balance
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

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { success: false, error: 'Invalid Ethereum address format' },
        { status: 400 }
      );
    }

    // Get balance from blockchain
    const balanceInWei = await publicClient.getBalance({
      address: address as `0x${string}`,
    });

    const balanceInEth = formatEther(balanceInWei);

    return NextResponse.json({ 
      success: true, 
      balance: {
        wei: balanceInWei.toString(),
        eth: balanceInEth,
        formatted: `${parseFloat(balanceInEth).toFixed(4)} ETH`,
      }
    });

  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch wallet balance',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}


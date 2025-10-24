import { type NextRequest, NextResponse } from 'next/server';
import { fidAddressMapping } from '@/lib/store/notificationStore';

export const dynamic = 'force-dynamic';

// POST /api/user/map-fid - Map a user's FID to their wallet address
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fid, address } = body;

    if (!fid || !address) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: fid and address' },
        { status: 400 }
      );
    }

    // Validate FID is a number
    const fidNumber = typeof fid === 'number' ? fid : Number.parseInt(fid, 10);
    if (Number.isNaN(fidNumber)) {
      return NextResponse.json(
        { success: false, error: 'Invalid FID format' },
        { status: 400 }
      );
    }

    // Validate address format (basic check)
    if (typeof address !== 'string' || !address.startsWith('0x') || address.length !== 42) {
      return NextResponse.json(
        { success: false, error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    // Store the mapping
    await fidAddressMapping.setMapping(fidNumber, address);

    console.log(`Mapped FID ${fidNumber} to address ${address}`);

    return NextResponse.json({
      success: true,
      message: 'FID to address mapping saved',
    });

  } catch (error) {
    console.error('Error mapping FID to address:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to map FID to address',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// POST /api/marketplace/buy - Process marketplace purchase
// Note: This is a validation endpoint. Actual payment is handled via Base Pay on client-side
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { listingId, buyer, paymentId } = body;

    if (!listingId || !buyer) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: listingId and buyer' },
        { status: 400 }
      );
    }

    // In a production app, you would:
    // 1. Verify payment was received (check Base Pay payment status)
    // 2. Transfer ticket ownership in the database or contract
    // 3. Remove listing from marketplace
    // 4. Notify seller
    // 5. Send ticket to buyer

    // For now, return success assuming payment was handled client-side
    return NextResponse.json({
      success: true,
      message: 'Purchase processed successfully',
      data: {
        listingId,
        buyer,
        paymentId,
      }
    });

  } catch (error: any) {
    console.error('Error processing marketplace purchase:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process purchase',
        message: error.message 
      },
      { status: 500 }
    );
  }
}


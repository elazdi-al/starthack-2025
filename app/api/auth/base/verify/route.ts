import { type NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { validateAndConsumeNonce } from '@/lib/nonceStore';

const isTestnet = process.env.NEXT_PUBLIC_CHAIN_ENV === 'testnet';
const chain = isTestnet ? baseSepolia : base;

const client = createPublicClient({
  chain,
  transport: http()
});

export async function POST(request: NextRequest) {
  try {
    const { address, message, signature } = await request.json();
    
    // Validate required fields
    if (!address || !message || !signature) {
      return NextResponse.json(
        { error: 'Missing required fields: address, message, signature' },
        { status: 400 }
      );
    }

    // Extract nonce from the SIWE message
    // The message should contain a line like "Nonce: <nonce>"
    const nonceMatch = message.match(/Nonce:\s*([a-f0-9]+)/i);
    if (!nonceMatch) {
      return NextResponse.json(
        { error: 'Invalid message format: missing nonce' },
        { status: 400 }
      );
    }

    const nonce = nonceMatch[1];
    
    // Validate and consume the nonce (prevents replay attacks)
    if (!validateAndConsumeNonce(nonce)) {
      return NextResponse.json(
        { error: 'Invalid or expired nonce' },
        { status: 401 }
      );
    }

    // Verify the signature
    const valid = await client.verifyMessage({ 
      address: address as `0x${string}`, 
      message, 
      signature: signature as `0x${string}`
    });

    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Create session / JWT
    // TODO: Implement your session management here
    // For now, we'll just return success with the address
    
    return NextResponse.json({ 
      ok: true,
      address,
      authenticated: true 
    });

  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      {       status: 500 }
    );
  }
}


import { createNonce } from '@/lib/nonceStore';
import { NextResponse } from "next/server";

export async function GET() {
  // Generate a fresh nonce
  const nonce = crypto.randomUUID().replace(/-/g, '');
  
  // Store the nonce as "issued" (not yet used)
  createNonce(nonce);
  
  return NextResponse.json({ nonce });
}


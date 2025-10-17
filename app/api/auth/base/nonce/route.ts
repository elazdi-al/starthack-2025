import { NextResponse } from "next/server";
import crypto from 'crypto';
import { createNonce } from '@/lib/nonceStore';

export async function GET() {
  // Generate a fresh nonce
  const nonce = crypto.randomUUID().replace(/-/g, '');
  
  // Store the nonce as "issued" (not yet used)
  createNonce(nonce);
  
  return NextResponse.json({ nonce });
}


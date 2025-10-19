import { useMutation } from "@tanstack/react-query";

export interface VerificationResult {
  success: boolean;
  valid: boolean;
  error?: string;
  message: string;
  details?: {
    tokenId: string;
    eventId: string;
    eventName?: string;
    currentOwner?: string;
    originalHolder?: string;
    ownerChanged?: boolean;
    verifiedChecks?: string[];
  };
}

interface VerifyTicketParams {
  qrData: string;
  eventId: string;
  eventOwner: string;
}

async function verifyTicket(params: VerifyTicketParams): Promise<VerificationResult> {
  const response = await fetch("/api/tickets/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  } as never);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to verify ticket");
  }

  return await response.json();
}

export function useTicketVerification() {
  return useMutation({
    mutationFn: verifyTicket,
    retry: false,
  });
}

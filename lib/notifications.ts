// Notification service for sending Base app notifications
import { notificationDB } from "@/lib/store/notificationStore";

interface SendNotificationRequest {
  notificationId: string;
  title: string;
  body: string;
  targetUrl: string;
  tokens: string[];
}

interface SendNotificationResponse {
  result: {
    successfulTokens: string[];
    invalidTokens: string[];
    rateLimitedTokens: string[];
  };
}

export type SendNotificationResult =
  | { state: "success" }
  | { state: "no_token" }
  | { state: "rate_limit" }
  | { state: "error"; error: unknown };

/**
 * Send a notification to a user via their FID
 */
export async function sendMiniAppNotification({
  fid,
  appFid,
  title,
  body,
  targetUrl,
}: {
  fid: number;
  appFid: number;
  title: string;
  body: string;
  targetUrl?: string;
}): Promise<SendNotificationResult> {
  const notificationDetails = await notificationDB.getUserNotificationDetails(
    fid,
    appFid
  );

  if (!notificationDetails) {
    console.log(`No notification token found for FID ${fid}`);
    return { state: "no_token" };
  }

  const appUrl = targetUrl || process.env.NEXT_PUBLIC_URL || "https://starthack-2025-iota.vercel.app";

  try {
    const response = await fetch(notificationDetails.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        notificationId: crypto.randomUUID(),
        title,
        body,
        targetUrl: appUrl,
        tokens: [notificationDetails.token],
      } satisfies SendNotificationRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Notification API error (${response.status}):`, errorText);
      return { state: "error", error: errorText };
    }

    const responseJson = await response.json() as SendNotificationResponse;

    if (responseJson.result.rateLimitedTokens.length > 0) {
      console.log(`Rate limited for FID ${fid}`);
      return { state: "rate_limit" };
    }

    if (responseJson.result.invalidTokens.length > 0) {
      console.log(`Invalid token for FID ${fid}, removing from database`);
      await notificationDB.deleteUserNotificationDetails(fid, appFid);
      return { state: "error", error: "Invalid token" };
    }

    console.log(`Notification sent successfully to FID ${fid}`);
    return { state: "success" };
  } catch (error) {
    console.error("Error sending notification:", error);
    return { state: "error", error };
  }
}

/**
 * Send a notification to an event creator when someone purchases a ticket
 */
export async function notifyEventCreator({
  creatorAddress,
  eventName,
  buyerInfo,
  eventId,
}: {
  creatorAddress: string;
  eventName: string;
  buyerInfo?: string;
  eventId: number;
}): Promise<SendNotificationResult> {
  const BASE_APP_FID = 309857; // Base app FID

  const notificationDetails = await notificationDB.getNotificationDetailsByAddress(
    creatorAddress,
    BASE_APP_FID
  );

  if (!notificationDetails) {
    console.log(`No notification token found for creator address ${creatorAddress}`);
    return { state: "no_token" };
  }

  const appUrl = process.env.NEXT_PUBLIC_URL || "https://starthack-2025-iota.vercel.app";
  const targetUrl = `${appUrl}/event/${eventId}`;

  const buyerDisplay = buyerInfo || "Someone";

  try {
    const response = await fetch(notificationDetails.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        notificationId: crypto.randomUUID(),
        title: `New Ticket Sold! 🎉`,
        body: `${buyerDisplay} just joined "${eventName}"`,
        targetUrl,
        tokens: [notificationDetails.token],
      } satisfies SendNotificationRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Notification API error (${response.status}):`, errorText);
      return { state: "error", error: errorText };
    }

    const responseJson = await response.json() as SendNotificationResponse;

    if (responseJson.result.rateLimitedTokens.length > 0) {
      console.log(`Rate limited for creator ${creatorAddress}`);
      return { state: "rate_limit" };
    }

    if (responseJson.result.invalidTokens.length > 0) {
      console.log(`Invalid token for creator ${creatorAddress}`);
      // We can't delete by address directly, so just log it
      return { state: "error", error: "Invalid token" };
    }

    console.log(`Event creator notification sent to ${creatorAddress}`);
    return { state: "success" };
  } catch (error) {
    console.error("Error sending creator notification:", error);
    return { state: "error", error };
  }
}

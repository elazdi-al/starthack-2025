import { type NextRequest, NextResponse } from "next/server";
import {
  parseWebhookEvent,
  verifyAppKeyWithNeynar,
} from "@farcaster/miniapp-node";
import { notificationDB } from "@/lib/store/notificationStore";
import { sendMiniAppNotification } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  try {
    const requestJson = await request.json();

    // Parse and verify the webhook event
    let data;
    try {
      data = await parseWebhookEvent(requestJson, verifyAppKeyWithNeynar);
      // Events are signed by the app key of a user with a JSON Farcaster Signature.
    } catch (e: unknown) {
      console.error("Webhook verification failed:", e);
      return NextResponse.json(
        {
          success: false,
          error: "Invalid webhook signature",
          message: e instanceof Error ? e.message : "Unknown error"
        },
        { status: 401 }
      );
    }

    // Extract webhook data
    const fid = data.fid;
    const appFid = data.appFid; // The FID of the client app that the user added the Mini App to
    const event = data.event;

    console.log(`Received webhook event: ${event.event} from FID ${fid} (App FID: ${appFid})`);

    // Handle different event types
    switch (event.event) {
      case "miniapp_added":
        // Save notification details if provided
        if (event.notificationDetails) {
          notificationDB.setUserNotificationDetails(
            fid,
            appFid,
            event.notificationDetails
          );

          console.log(`Notifications enabled for FID ${fid} on app ${appFid}`);

          // Send welcome notification
          await sendMiniAppNotification({
            fid,
            appFid,
            title: "Welcome to Stars! ⭐",
            body: "Get notified when someone joins your events",
          });
        }
        break;

      case "miniapp_removed":
        // Delete notification details
        const removedMiniapp = notificationDB.deleteUserNotificationDetails(fid, appFid);
        console.log(
          `Mini app removed for FID ${fid} on app ${appFid}. Deleted: ${removedMiniapp}`
        );
        break;

      case "notifications_enabled":
        // Save new notification details
        notificationDB.setUserNotificationDetails(
          fid,
          appFid,
          event.notificationDetails
        );

        console.log(`Notifications re-enabled for FID ${fid} on app ${appFid}`);

        // Send confirmation notification
        await sendMiniAppNotification({
          fid,
          appFid,
          title: "Notifications Enabled 🔔",
          body: "You'll now receive updates about your events",
        });
        break;

      case "notifications_disabled":
        // Delete notification details
        const removed = notificationDB.deleteUserNotificationDetails(fid, appFid);
        console.log(
          `Notifications disabled for FID ${fid} on app ${appFid}. Deleted: ${removed}`
        );
        break;

      default:
        console.log(`Unknown event type: ${(event as { event: string }).event}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

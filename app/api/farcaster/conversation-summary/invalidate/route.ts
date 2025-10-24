import { NextResponse } from "next/server";
import { invalidateConversationSummary } from "@/lib/redis";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventIdParam = searchParams.get("eventId");

  if (!eventIdParam) {
    return NextResponse.json(
      { success: false, error: "Missing eventId parameter" },
      { status: 400 }
    );
  }

  const eventId = parseInt(eventIdParam, 10);
  if (isNaN(eventId)) {
    return NextResponse.json(
      { success: false, error: "Invalid eventId parameter" },
      { status: 400 }
    );
  }

  try {
    await invalidateConversationSummary(eventId);
    console.log(`[conversation-summary] Cache invalidated for event ${eventId}`);

    return NextResponse.json(
      {
        success: true,
        message: `Cache invalidated for event ${eventId}`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[conversation-summary] Failed to invalidate cache:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to invalidate cache",
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { saveEventImage } from "@/lib/eventMetadata";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { eventId, imageCid, imageUrl } = body ?? {};

    if (typeof eventId !== "number" || Number.isNaN(eventId) || eventId < 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid or missing eventId.",
        },
        { status: 400 }
      );
    }

    if (!imageCid || typeof imageCid !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Missing imageCid.",
        },
        { status: 400 }
      );
    }

    if (!imageUrl || typeof imageUrl !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Missing imageUrl.",
        },
        { status: 400 }
      );
    }

    saveEventImage({
      eventId,
      imageCid,
      imageUrl,
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Failed to persist event image metadata:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Unable to save event image metadata.",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

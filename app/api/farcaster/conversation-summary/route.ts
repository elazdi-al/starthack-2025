import { NextResponse } from "next/server";
import {
  getCachedConversationSummary,
  setCachedConversationSummary,
} from "@/lib/redis";

const NEYNAR_ENDPOINT =
  "https://api.neynar.com/v2/farcaster/cast/conversation/summary/";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const castHash = searchParams.get("castHash");
  const eventIdParam = searchParams.get("eventId");

  if (!castHash) {
    return NextResponse.json(
      { success: false, error: "Missing castHash parameter" },
      { status: 400 }
    );
  }

  if (!eventIdParam) {
    return NextResponse.json(
      { success: false, error: "Missing eventId parameter" },
      { status: 400 }
    );
  }

  const eventId = Number.parseInt(eventIdParam, 10);
  if (Number.isNaN(eventId)) {
    return NextResponse.json(
      { success: false, error: "Invalid eventId parameter" },
      { status: 400 }
    );
  }

  // Check cache first
  const cached = await getCachedConversationSummary(eventId);
  if (cached) {
    console.log(`[conversation-summary] Cache hit for event ${eventId}`);
    return NextResponse.json(
      {
        success: true,
        summary: {
          text: cached.text,
          participants: cached.participants,
          mentioned_profiles: cached.mentioned_profiles,
        },
        cached: true,
        cachedAt: cached.cachedAt,
      },
      { status: 200 }
    );
  }

  console.log(`[conversation-summary] Cache miss for event ${eventId}, fetching from API`);


  const apiKey = process.env.NEYNAR_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: "Neynar API key is not configured" },
      { status: 500 }
    );
  }

  // Build the query parameters
  const params = new URLSearchParams({
    identifier: castHash,
    limit: "50",
    prompt:
      "This is a summary of reviews and comments for an event. Please provide a clean, concise, and clear paragraph-style summary of the event's reviews, focusing on overall sentiment, key themes, and notable feedback.",
  });

  const endpoint = `${NEYNAR_ENDPOINT}?${params.toString()}`;

  try {
    const response = await fetch(endpoint, {
      headers: {
        accept: "application/json",
        "x-api-key": apiKey,
      },
      // Cache for 2 minutes to avoid excessive API calls
      next: { revalidate: 120 },
    } as never);

    if (response.status === 404) {
      return NextResponse.json(
        { success: true, summary: null },
        { status: 200 }
      );
    }

    if (!response.ok) {
      const errorBody = await safeParseJSON(response);
      console.error(
        "[farcaster:conversation-summary] API error:",
        response.status,
        errorBody
      );
      return NextResponse.json(
        {
          success: false,
          error:
            errorBody?.error?.message ??
            errorBody?.message ??
            `Neynar request failed with status ${response.status}`,
          details: errorBody,
        },
        { status: response.status }
      );
    }

    const body = await response.json();

    // Cache the summary
    if (body.summary) {
      await setCachedConversationSummary(eventId, {
        text: body.summary.text,
        participants: body.summary.participants || [],
        mentioned_profiles: body.summary.mentioned_profiles || [],
      });
    }

    return NextResponse.json(
      {
        success: true,
        summary: body.summary,
        cached: false,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[farcaster:conversation-summary]", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error while fetching conversation summary",
      },
      { status: 500 }
    );
  }
}

async function safeParseJSON(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

import { NextResponse } from "next/server";

const NEYNAR_ENDPOINT = "https://api.neynar.com/v2/farcaster/cast/conversation";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const castUrl = searchParams.get("castUrl");

  if (!castUrl) {
    return NextResponse.json(
      { success: false, error: "Missing castUrl parameter" },
      { status: 400 },
    );
  }

  const apiKey = process.env.NEYNAR_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: "Neynar API key is not configured" },
      { status: 500 },
    );
  }

  // Build the query parameters
  // The castUrl should be a cast hash from Farcaster
  const params = new URLSearchParams({
    identifier: castUrl,
    type: "hash", // Changed from "url" to "hash" since we're passing cast hashes
    reply_depth: "2",
    include_chronological_parent_casts: "false",
    limit: "50",
  });

  const endpoint = `${NEYNAR_ENDPOINT}?${params.toString()}`;

  try {
    const response = await fetch(endpoint, {
      headers: {
        accept: "application/json",
        "x-api-key": apiKey,
      },
      // Cache for 30 seconds to avoid excessive API calls
      next: { revalidate: 30 },
    } as never);

    if (response.status === 404) {
      return NextResponse.json(
        { success: true, conversation: null, comments: [] },
        { status: 200 },
      );
    }

    if (!response.ok) {
      const errorBody = await safeParseJSON(response);
      console.error(
        "[farcaster:comments] API error:",
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
        { status: response.status },
      );
    }

    const body = await response.json();

    // Extract comments from the conversation
    const comments = body.conversation?.cast?.direct_replies || [];

    return NextResponse.json(
      {
        success: true,
        conversation: body.conversation,
        comments,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[farcaster:comments]", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error while fetching comments",
      },
      { status: 500 },
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

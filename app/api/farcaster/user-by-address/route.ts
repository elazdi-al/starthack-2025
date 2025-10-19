import { NextResponse } from "next/server";

const NEYNAR_ENDPOINT =
  "https://api.neynar.com/v2/farcaster/user/bulk-by-address/";

const _REQUIRED_ADDRESS_TYPE = "eth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");
  

  if (!address) {
    return NextResponse.json(
      { success: false, error: "Missing address parameter" },
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

  const endpoint = `${NEYNAR_ENDPOINT}?addresses=${encodeURIComponent(
    address,
  )}`;

  try {
    const response = await fetch(endpoint, {
      headers: {
        accept: "application/json",
        "api_key": apiKey,
        "Api-Key": apiKey,
      },
      // Cached briefly to avoid hammering Neynar on quick navigations
      next: { revalidate: 30 },
    } as never);
    if (response.status === 404) {
      // No linked Farcaster account for this address
      return NextResponse.json(
        { success: true, user: null, source: "neynar" },
        { status: 200 },
      );
    }

    if (!response.ok) {
      const errorBody = await safeParseJSON(response);
      return NextResponse.json(
        {
          success: false,
          error:
            errorBody?.error?.message ??
            errorBody?.message ??
            `Neynar request failed with status ${response.status}`,
        },
        { status: response.status },
      );
    } 

    const body = await response.json();
    const key = Object.keys(body)[0];
   const user = body[key][0];
    return NextResponse.json(
      {
        success: true,
        user,
        source: "neynar",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[farcaster:user-by-address]", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error while contacting Neynar",
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

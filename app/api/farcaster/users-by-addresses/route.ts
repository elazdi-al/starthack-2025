import { NextResponse } from "next/server";

const NEYNAR_ENDPOINT =
  "https://api.neynar.com/v2/farcaster/user/bulk-by-address/";

const REQUIRED_ADDRESS_TYPE = "eth";
const MAX_ADDRESSES_PER_REQUEST = 350; // Neynar's limit

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { addresses } = body;

    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid addresses array" },
        { status: 400 },
      );
    }

    if (addresses.length > MAX_ADDRESSES_PER_REQUEST) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many addresses. Maximum ${MAX_ADDRESSES_PER_REQUEST} addresses per request`,
        },
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

    // Join addresses with commas for the bulk endpoint
    const addressesParam = addresses
      .map((addr) => encodeURIComponent(addr))
      .join(",");
    const endpoint = `${NEYNAR_ENDPOINT}?addresses=${addressesParam}`;

    const response = await fetch(endpoint, {
      headers: {
        accept: "application/json",
        "api_key": apiKey,
        "Api-Key": apiKey,
      },
      // Cached briefly to avoid hammering Neynar on quick navigations
      next: { revalidate: 30 },
    });

    if (response.status === 404) {
      // No linked Farcaster accounts for these addresses
      return NextResponse.json(
        { success: true, users: {}, source: "neynar" },
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

    const data = await response.json();

    // Neynar returns an object with addresses as keys and arrays of users as values
    // Transform this into a more usable format
    const usersMap: Record<string, any> = {};

    for (const [address, users] of Object.entries(data)) {
      if (Array.isArray(users) && users.length > 0) {
        usersMap[address.toLowerCase()] = users[0]; // Take the first user for each address
      } else {
        usersMap[address.toLowerCase()] = null;
      }
    }

    return NextResponse.json(
      {
        success: true,
        users: usersMap,
        source: "neynar",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[farcaster:users-by-addresses]", error);
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

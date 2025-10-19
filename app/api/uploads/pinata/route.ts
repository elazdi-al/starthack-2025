import { NextResponse } from "next/server";

const PINATA_UPLOAD_URL = "https://uploads.pinata.cloud/v3/files";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const token = process.env.PINATA_API_KEY;
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "PINATA_API_KEY environment variable is not configured.",
        },
        { status: 500 }
      );
    }

    const incomingForm = await request.formData();
    const file = incomingForm.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: "File is required.",
        },
        { status: 400 }
      );
    }

    const uploadForm = new FormData();
    uploadForm.append("file", file, file.name);
    uploadForm.append("network", "public")

    const pinataResponse = await fetch(PINATA_UPLOAD_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: uploadForm,
    } as never);

    const responseBody = await pinataResponse.json().catch(() => null);

    if (!pinataResponse.ok) {
      console.error("Pinata upload failed:", responseBody ?? pinataResponse.statusText);
      return NextResponse.json(
        {
          success: false,
          error: "Unable to upload image to Pinata.",
          status: pinataResponse.status,
          details: responseBody,
        },
        { status: 502 }
      );
    }

    const cid =
      responseBody?.data?.cid ??
      responseBody?.cid ??
      responseBody?.IpfsHash ??
      null;

    if (!cid) {
      console.error("Pinata response missing CID:", responseBody);
      return NextResponse.json(
        {
          success: false,
          error: "Pinata response did not include a CID.",
          details: responseBody,
        },
        { status: 502 }
      );
    }

    const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;

    return NextResponse.json({
      success: true,
      data: {
        cid,
        url: gatewayUrl,
      },
    });
  } catch (error) {
    console.error("Unexpected error uploading to Pinata:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Unexpected error uploading to Pinata.",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

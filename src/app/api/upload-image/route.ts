import { NextRequest, NextResponse } from "next/server";
import { normalizeImageUrl } from "@/lib/assetMetadata";

// Uploads seller photos to IPFS through Pinata.
// The Pinata JWT stays server-side. The browser sends the image data to this
// route, and this route handles the actual IPFS upload.
//
// Pinata's current Files API accepts multipart/form-data at:
//   POST https://uploads.pinata.cloud/v3/files
// with the file in the `file` form field and `Authorization: Bearer <JWT>`.
// The returned CID is converted to a public IPFS gateway URL for display.

const PINATA_JWT = process.env.PINATA_JWT;

export async function POST(req: NextRequest) {
  try {
    if (!PINATA_JWT) {
      return NextResponse.json(
        { error: "PINATA_JWT is not configured on the server." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { imageBase64, fileName, mimeType } = body as {
      imageBase64?: string;
      fileName?: string;
      mimeType?: string;
    };

    if (!imageBase64) {
      return NextResponse.json(
        { error: "imageBase64 is required." },
        { status: 400 }
      );
    }

    // The frontend currently sends FileReader.readAsDataURL() output.
    // Strip the data URI prefix before decoding the binary image.
    const matches = imageBase64.match(/^data:([^;]+);base64,(.+)$/s);
    const detectedMimeType = matches?.[1] || mimeType || "image/jpeg";
    const rawBase64 = matches?.[2] || imageBase64;

    const buffer = Buffer.from(rawBase64, "base64");
    if (!buffer.length) {
      return NextResponse.json(
        { error: "The supplied image data is empty or invalid." },
        { status: 400 }
      );
    }

    // Avoid trusting arbitrary path information from the browser.
    const safeFileName = (fileName || `propchain-${Date.now()}.jpg`)
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .slice(0, 120);

    const file = new File([buffer], safeFileName, {
      type: detectedMimeType,
    });

    const form = new FormData();
    form.append("file", file);

    const response = await fetch("https://uploads.pinata.cloud/v3/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: form,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Pinata API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const cid = data?.data?.cid ?? data?.cid;

    if (!cid || typeof cid !== "string") {
      throw new Error(`Unexpected Pinata response shape: ${JSON.stringify(data)}`);
    }

    const url = normalizeImageUrl(`ipfs://${cid}`);

    return NextResponse.json({
      cid,
      url,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Image upload failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

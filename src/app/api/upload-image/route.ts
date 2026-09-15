import { NextRequest, NextResponse } from "next/server";
import { normalizeImageUrl } from "@/lib/assetMetadata";

// Uploads a real image to IPFS via ipfs.ninja, so listings can have a real
// photo instead of just the illustrated placeholder thumbnails. The API
// key stays server-side — the browser sends the image data to this route,
// this route sends it on to ipfs.ninja.
//
// Built against ipfs.ninja's official documented endpoint (confirmed
// directly from ipfs.ninja/docs/overview and ipfs.ninja/docs/api/car-import,
// Sep 2026):
//   POST https://api.ipfs.ninja/upload/new
//   Headers: X-Api-Key, Content-Type: application/json
//   Body: { content: "<raw base64, no data: prefix>" } for binary files
//   Response: { cid, sizeMB, uris: { ipfs, url } }
//
// REAL BUG FOUND (confirmed via a live upload's stored metadata, not just
// docs-reading): the gateway URL is nested at `uris.url`, not a top-level
// `url` field. This route originally read `data.url`, which never existed
// in a real response — every single upload silently fell through to the
// `https://ipfs.io/ipfs/${cid}` fallback below instead of ever using
// ipfs.ninja's own gateway. ipfs.ninja's dedicated gateway is tied to the
// account (no shared-anonymous-traffic rate limiting the way a public
// gateway like ipfs.io has), so this fix should be a real reliability
// improvement, not just a correctness one.

const IPFS_NINJA_API_KEY = process.env.IPFS_NINJA_API_KEY;

export async function POST(req: NextRequest) {
  try {
    if (!IPFS_NINJA_API_KEY) {
      return NextResponse.json(
        { error: "IPFS_NINJA_API_KEY is not configured on the server." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { imageBase64 } = body as { imageBase64?: string };

    if (!imageBase64) {
      return NextResponse.json({ error: "imageBase64 is required." }, { status: 400 });
    }

    // ipfs.ninja's `content` field expects the raw base64 string for
    // binary files, not a data: URI — strip the "data:image/...;base64,"
    // prefix if present, since browser FileReader.readAsDataURL() includes it.
    const rawBase64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;

    const response = await fetch("https://api.ipfs.ninja/upload/new", {
      method: "POST",
      headers: {
        "X-Api-Key": IPFS_NINJA_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: rawBase64 }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`ipfs.ninja API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    if (!data.cid) {
      throw new Error(`Unexpected ipfs.ninja response shape: ${JSON.stringify(data)}`);
    }

    return NextResponse.json({
      cid: data.cid,
      // Prefer ipfs.ninja's own documented field (uris.url) — their
      // dedicated gateway, tied to this account. Falls back to a flat
      // `url` in case their API shape ever changes back, and finally to
      // constructing an ipfs.io link ourselves as a last resort if neither
      // is present. normalizeImageUrl() still runs regardless, in case any
      // of these come back as a raw ipfs:// URI instead of https.
      url: normalizeImageUrl(data.uris?.url ?? data.url ?? `https://ipfs.io/ipfs/${data.cid}`),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Image upload failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";

// This route re-fetches IPFS images server-side and streams them back to
// the browser. Keeping a strict gateway allowlist prevents this endpoint
// from becoming an arbitrary URL proxy.
//
// ALLOWED_HOSTS is a strict allowlist, not a general-purpose proxy — this
// only ever fetches from the same IPFS gateways AssetThumbnail already
// tries directly (src/components/AssetThumbnail.tsx), so it can't be used
// to fetch arbitrary attacker-supplied URLs.
const ALLOWED_HOSTS = ["ipfs.io", "ipfs.4everland.io", "dweb.link"];

export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get("url");
  if (!target) {
    return NextResponse.json({ error: "Missing url parameter." }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return NextResponse.json({ error: "Invalid url parameter." }, { status: 400 });
  }

  if (parsed.protocol !== "https:" || !ALLOWED_HOSTS.includes(parsed.hostname)) {
    return NextResponse.json({ error: "Host not allowed." }, { status: 400 });
  }

  try {
    const upstream = await fetch(parsed.toString());
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream gateway returned ${upstream.status}.` },
        { status: upstream.status }
      );
    }
    const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
    const bytes = await upstream.arrayBuffer();
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": contentType,
        // Images are content-addressed (the CID is a hash of the bytes) —
        // this exact URL can never point to different content, so caching
        // aggressively is safe.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Proxy fetch failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

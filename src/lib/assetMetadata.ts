/**
 * Encodes NFT metadata as a `data:` URI instead of pinning to IPFS. This is
 * a real, standard technique (used by many on-chain NFT projects for
 * lightweight metadata) — no external pinning service or API key needed,
 * and the metadata is fully retrievable by any client that resolves
 * tokenURI(), same as a real IPFS gateway would provide.
 *
 * Real photos DO now have real storage — via ipfs.ninja (see
 * /api/upload-image/route.ts) — the image itself gets uploaded there, and
 * only the resulting IPFS URL is embedded here as `imageUrl`, which keeps
 * the on-chain data: URI small and cheap regardless of photo size.
 */
export interface AssetMetadata {
  name: string;
  description: string;
  location: string;
  assetType: string;
  imageUrl?: string; // kept for backward compatibility with tokens minted before multi-image support
  imageUrls?: string[]; // real photos, in display order — preferred over imageUrl going forward
  attributes: { trait_type: string; value: string }[];
  // Shared across every token minted from the same "N identical units"
  // listing action (see /list's handleMint) — groups siblings together for
  // display and lets "supply" become a real, decrementing count of how
  // many of that batch's tokens are still Active, instead of a cosmetic
  // number on one token. Undefined for single-unit listings and any token
  // minted before this existed.
  batchId?: string;
  // True only for assets minted via /admin/mint — the operator's own
  // personal confirmation that this seller is a real organization/agent,
  // on top of (not instead of) the standard AI document verification every
  // listing goes through. Undefined/false for anything minted via /list,
  // and for any token minted before this field existed.
  verifiedOrg?: boolean;
}

export function encodeMetadataDataUri(metadata: AssetMetadata): string {
  const json = JSON.stringify(metadata);
  // base64-encode so the URI is safe to pass as a Solidity string argument
  // without worrying about quote/special-character escaping issues.
  const base64 = typeof window !== "undefined" ? btoa(unescape(encodeURIComponent(json))) : Buffer.from(json, "utf-8").toString("base64");
  return `data:application/json;base64,${base64}`;
}

export function decodeMetadataDataUri(uri: string): AssetMetadata | null {
  if (!uri.startsWith("data:application/json;base64,")) return null;
  try {
    const base64 = uri.replace("data:application/json;base64,", "");
    const json =
      typeof window !== "undefined"
        ? decodeURIComponent(escape(atob(base64)))
        : Buffer.from(base64, "base64").toString("utf-8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// Normalizes an image URL for browser display. The real bug behind
// "some real listings show blank image areas": /api/upload-image's
// fallback (`data.url ?? gateway-fallback`) trusts whatever `url` field
// ipfs.ninja's response happens to include, and several IPFS pinning
// services return that as an `ipfs://<cid>` URI rather than an https
// gateway link. `ipfs://` is not a scheme browsers know how to fetch —
// an <img src="ipfs://..."> just renders blank, no error surfaced. This
// strips that scheme and rewrites to a public gateway URL. Already-https
// URLs pass through untouched. Applied both at upload time (so new
// mints store a clean URL) and at read time here (so tokens already
// minted with a raw ipfs:// URL baked into their on-chain metadata still
// display correctly, since that metadata itself can't be edited after
// the fact).
export function normalizeImageUrl(url: string): string {
  const trimmed = url.trim();
  if (/^ipfs:\/\//i.test(trimmed)) {
    // Some tools double up as ipfs://ipfs/<cid> — strip either form down
    // to the bare path (cid, optionally with a /filename suffix).
    const path = trimmed.replace(/^ipfs:\/\/(ipfs\/)?/i, "");
    // ipfs.ninja's own gateway, not the public ipfs.io one — every image
    // this project uploads is pinned there (see /api/upload-image), and a
    // dedicated gateway tied to the account doesn't share ipfs.io's
    // anonymous-traffic rate limiting (confirmed via a real 429 during
    // testing). AssetThumbnail additionally retries public gateways if
    // this one ever fails, so this is a preference, not a hard dependency.
    return `https://ipfs.ninja/ipfs/${path}`;
  }
  return trimmed;
}

// Normalizes old single-image tokens (imageUrl) and new multi-image tokens
// (imageUrls) into one array, so display components only need to handle
// one shape. Returns an empty array if the token has no real photos.
export function getMetadataImageUrls(metadata: AssetMetadata | null): string[] {
  if (!metadata) return [];
  if (metadata.imageUrls && metadata.imageUrls.length > 0) {
    return metadata.imageUrls.map(normalizeImageUrl);
  }
  if (metadata.imageUrl) return [normalizeImageUrl(metadata.imageUrl)];
  return [];
}

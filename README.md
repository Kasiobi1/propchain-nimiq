PropChain
PropChain is a marketplace for tokenizing real-world assets (houses, land,
phones, gadgets, cars) as NFTs. A seller uploads proof of ownership, an AI
verification pipeline checks the document before anything can be minted,
and approved assets can be listed, bought, offered on, or moved through an
escrow hold on-chain.

This app was originally built for an X Layer RWA hackathon and has also
been migrated to run as a Nimiq Pay Mini App, with contracts
redeployed to Base (Nimiq Pay's Ethereum provider does not currently
support X Layer).

Stack
Next.js 16 / React / TypeScript / Tailwind
viem — direct calls against the wallet provider Nimiq Pay injects
(`window.ethereum`, standard EIP-1193), no wagmi/RainbowKit

@nimiq/mini-app-sdk for Mini App initialization
Groq (vision + reasoning models) for AI document verification
ipfs.ninja for real asset image uploads
Solidity contracts (AssetNFT, Marketplace, EscrowHold) on Base Sepolia —
see the separate propchain-contracts repo



How it works
Seller submits an asset with proof-of-ownership documents.
/api/verify runs a two-stage Groq pipeline: OCR/extraction, then a
structured pass/fail/warning judgment across four categories (seller
   info, asset info, document consistency, anomalies). A verdict of
   review with no failing checks and at least 3 of 4 passing is
   auto-approved; genuine failures or multiple warnings still require
   manual follow-up.

An approved verdict is signed into a verification token bound to the
seller's wallet address.

/api/mint-listing checks that token before minting an AssetNFT
token to the seller.

The seller lists the asset on Marketplace, where it can be bought
outright, offered on, or moved through EscrowHold for a timed
   inspection window before funds release.

Wallet layer
The wallet connection code (`src/lib/nimiqWallet.ts`) talks directly to
whatever EIP-1193 provider is injected — Nimiq Pay's provider in
production, MetaMask or similar during local development. There's no
wallet-picker UI: Nimiq Pay already provides exactly one wallet, and
requesting accounts triggers its own native confirmation dialog.

Known limitations
EscrowHold.lockFunds() requires the seller to have approved the
EscrowHold contract specifically, separately from the Marketplace
  approval — not yet wired into the mint/list flow's UI.

The AI verification pipeline does not include the video-transcript
matching step originally scoped; only document OCR, consistency
  reasoning, and an optional basic selfie/document face comparison are
  implemented. The selfie check is a general vision-model comparison, not
  a dedicated liveness/anti-spoofing API — see the comment in
  src/app/api/verify/route.ts for the full caveat.

useRealListings.ts and useProfileData.ts scan token IDs one by one
via multicall rather than using a bulk enumeration function or indexer
 ## Deploy on Vercel : https://propchain-nimiq-sand.vercel.app/



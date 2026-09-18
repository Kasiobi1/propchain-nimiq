PropChain

An AI-verified real-world-asset (RWA) marketplace, rebuilt as a Nimiq Pay Mini App.

PropChain lets people list, verify, and trade real-world assets — phones, land, cars, gadgets — with the same trustlessness as trading an NFT. A seller uploads proof of ownership, an AI verification step checks the document before anything is minted, and the asset becomes an on-chain listing with real photos and a transparent transfer history.

🔗 Live: propchain-nimiq-sand.vercel.app

How it works
List — a seller uploads a photo and proof of ownership for their asset.
Verify — the document is checked by an AI verification step (Groq) before minting is allowed.
Mint — once approved, the asset is minted as an NFT, with the listing photo pinned to IPFS (Pinata) so metadata isn't a placeholder.
Sell — the asset is listed on the on-chain marketplace.
Buy — buyers purchase outright, or use Hold & Inspect: pay now, inspect the item in person, and get refunded (minus a small fee) if it's not as described within the window.
Built with Nimiq Pay

Wallet connect runs entirely through the Nimiq Pay Mini App SDK (@nimiq/mini-app-sdk) — no separate wallet extension or seed phrase entry. Nimiq Pay Mini Apps currently support Ethereum Sepolia as their EVM testnet, so the contract suite is deployed there, with client-side reads going through a direct RPC connection for reliable on-chain state rather than relying solely on the wallet's own injected provider.

Tech stack
Frontend: Next.js 16 (App Router), TypeScript, Tailwind v4
Contracts: Solidity, Hardhat, deployed to Ethereum Sepolia
Wallet: Nimiq Pay Mini App SDK
On-chain reads/writes: viem
AI document verification: Groq
Image storage: Pinata (IPFS)
Hosting: Vercel
Contracts (Ethereum Sepolia)
Contract	Address
AssetNFT	0xD5d32dc748eDBf5AA57d1159f8DbFA49dE105b54
Marketplace	0x829904b059f9C99d9D749b25ae182a1805607326
EscrowHold	0x7E87907C9f453FB2461f8AEaae0164b0093B1fb3


Environment variables

Create a .env.local with:

GROQ_API_KEY=
VERIFIER_PRIVATE_KEY=
PINATA_JWT=
VERIFICATION_TOKEN_SECRET=
SEPOLIA_RPC_URL=
NEXT_PUBLIC_SEPOLIA_RPC_URL=

SEPOLIA_RPC_URL and NEXT_PUBLIC_SEPOLIA_RPC_URL should point to the same RPC endpoint (Alchemy or similar) — both are needed because client-side reads use a direct RPC connection rather than the connected wallet's own.

Project structure
src/
  app/            # Next.js App Router pages + API routes
    api/          # verify, mint-listing, upload-image, image-proxy, etc.
    listing/      # individual asset listing pages
    browse/       # marketplace browse view
    list/         # create-a-listing flow
    admin/        # operator minting tools
  components/     # UI components (thumbnails, carousels, wallet button, etc.)
  lib/            # contract ABIs, chain config, metadata helpers, hooks
Status

Working end-to-end: wallet connect inside Nimiq Pay, AI document verification, minting, marketplace listing, and buying. Built originally for an X Layer hackathon, migrated to Ethereum Sepolia for Nimiq Pay Mini App compatibility, and submitted to the Nimiq Hackathon.
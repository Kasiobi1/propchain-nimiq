// Deployed to Ethereum Sepolia (chain ID 11155111) as part of the Nimiq Pay
// Mini App migration. Originally deployed to Base Sepolia, but Nimiq Pay's
// Mini Apps only expose plain Ethereum Sepolia as a supported EVM testnet
// (Base itself is supported as a mainnet, not its own L2 testnet), so this
// was redeployed to Ethereum Sepolia to be reachable from real Nimiq Pay.
// Contracts reconstructed from ABIs (see propchain-contracts/) after the
// earlier X Layer -> Base Sepolia -> Ethereum Sepolia migration path.
export const CONTRACT_ADDRESSES = {
  assetNFT: "0xD5d32dc748eDBf5AA57d1159f8DbFA49dE105b54",
  marketplace: "0x829904b059f9C99d9D749b25ae182a1805607326",
  escrowHold: "0x7E87907C9f453FB2461f8AEaae0164b0093B1fb3",
} as const;

export const SEPOLIA_CHAIN_ID: number = 11155111;
export const BASE_SEPOLIA_CHAIN_ID: number = 84532;
export const BASE_MAINNET_CHAIN_ID: number = 8453;

// Active chain for the app — Ethereum Sepolia, since it's the testnet
// Nimiq Pay actually supports. Swap to BASE_MAINNET_CHAIN_ID once ready for
// real funds on Base. Kept as a single source of truth so hooks/routes
// don't need per-file edits when switching.
export const ACTIVE_CHAIN_ID: number = SEPOLIA_CHAIN_ID;

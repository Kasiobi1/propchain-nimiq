// Deployed to Base Sepolia (chain ID 84532) as part of the Nimiq Pay Mini
// App migration — Nimiq Pay's Ethereum provider currently supports
// Ethereum Mainnet, Polygon, Arbitrum One, Optimism, Base, BNB Smart
// Chain, and Sepolia; X Layer is not in that list, so the original X
// Layer testnet contracts (chain ID 1952) were reconstructed from their
// ABIs (see propchain-contracts/) and redeployed here.
//
// PLACEHOLDER ADDRESSES — replace with the real output of
// `npx hardhat run script/deploy.js --network baseSepolia` in the
// propchain-contracts repo before using this against real transactions.
export const CONTRACT_ADDRESSES = {
  assetNFT: "0x7e9fbA952be652BD67e49F5FfBC57bdD84fc30c6",
  marketplace: "0xc12ED9316A66a8e405072621EEc6A7a7CE014cfC",
  escrowHold: "0x127802Ac07B5F0C1E5E4E77D69526a647De45B87",
} as const;

export const BASE_SEPOLIA_CHAIN_ID: number = 84532;
export const BASE_MAINNET_CHAIN_ID: number = 8453;

// Active chain for the app — swap to BASE_MAINNET_CHAIN_ID once ready for
// real funds. Kept as a single source of truth so hooks/routes don't need
// per-file edits when switching.
export const ACTIVE_CHAIN_ID: number = BASE_SEPOLIA_CHAIN_ID;

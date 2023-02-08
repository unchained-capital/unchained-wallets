export interface DeviceError extends Error {
  message: string;
}

/*
 * TODO: These are types that should be coming from unchained-bitcoin
 */

// this one COULD come from unchained-bitcoin except the relevant
// file isn't typescript and so the conversions don't seem to work
export type BitcoinNetwork = "mainnet" | "testnet" | "signet" | "regtest";

export interface KeyDerivation {
  bip32Path: string;
  fingerprint: string;
}

export interface TxInput {
  // this one is messy in the way it's used
  // and so we'll need to better define it as typescript
  // conversion gets propagated
  multisig: unknown;
  transactionHex: string;
  index: number;
}

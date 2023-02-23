export interface DeviceError extends Error {
  message: string;
}

// TODO: These are types that should be coming from unchained-bitcoin

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

// really should be interchangeable with KeyDerivations
// but unfortunately there are inconsistent property names
// in different contexts
export interface WalletConfigKeyDerivation {
  xfp: string;
  bip32Path: string;
  xpub: string;
}

// P2TR not able to be used anywhere yet but technicall a valid multisig
// address type.
// TODO: should this be in unchained-bitcoin long term?
export type MultisigAddressType = "P2SH" | "P2WSH" | "P2SH-P2WSH" | "P2TR";
export interface MultisigWalletConfig {
  name: string;
  requiredSigners: number;
  // shouldn't be necessary as it can be
  // inferred from the extendedPublicKeys
  // but still exists in most cases
  totalSigners?: number;
  addressType: MultisigAddressType;
  extendedPublicKeys: WalletConfigKeyDerivation[];
  network: BitcoinNetwork;
}

export interface BraidDetails {
  network: BitcoinNetwork;
  addressType: MultisigAddressType;
  extendedPublicKeys: {
    path: string;
    index: number;
    depth: number;
    chaincode: string;
    pubkey: string;
    parentFingerprint: number;
    version: string;
    rootFingerprint: string;
    base58String: string;
  }[];
  requiredSigners: number;
  index: number;
}

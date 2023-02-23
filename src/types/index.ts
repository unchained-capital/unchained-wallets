import { MultisigAddressType, BitcoinNetwork } from "unchained-bitcoin";

export interface DeviceError extends Error {
  message: string;
}

// TODO: could this be in unchained-bitcoin?
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

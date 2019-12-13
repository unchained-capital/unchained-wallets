import {UnsupportedInteraction} from "./interaction";
import {TrezorGetMetadata, TrezorExportPublicKey, TrezorExportExtendedPublicKey, TrezorSignMultisigTransaction} from "./trezor";
import {LedgerGetMetadata, LedgerExportPublicKey, LedgerExportExtendedPublicKey, LedgerSignMultisigTransaction} from "./ledger";

export const TREZOR = 'trezor';
export const LEDGER = 'ledger';
export const HERMIT = 'hermit';

export function HardwareWalletGetMetadata({walletType}) {
  switch (walletType) {
  case TREZOR:
    return new TrezorGetMetadata();
  case LEDGER:
    return new LedgerGetMetadata();
  default:
    return new UnsupportedInteraction({failureCode: "unsupported", failureText: "This wallet does not return a version."});
  }
}


export function HardwareWalletExportPublicKey({walletType, network, bip32Path}) {
  switch (walletType) {
  case TREZOR:
    return new TrezorExportPublicKey({network, bip32Path});
  case LEDGER:
    return new LedgerExportPublicKey({bip32Path});
  default:
    return new UnsupportedInteraction({network, failureCode: "unsupported", failureText: "This wallet is not supported when exporting public keys."});
  }
}

export function HardwareWalletExportExtendedPublicKey({walletType, network, bip32Path}) {
  switch (walletType) {
  case TREZOR:
    return new TrezorExportExtendedPublicKey({network, bip32Path});
  case LEDGER:
    return new LedgerExportExtendedPublicKey({bip32Path});
  default:
    return new UnsupportedInteraction({network, failureCode: "unsupported", failureText: "This wallet is not supported when exporting extended public keys."});
  }
}

export function HardwareWalletSignMultisigTransaction({walletType, network, inputs, outputs, bip32Paths}) {
  switch (walletType) {
  case TREZOR:
    return new TrezorSignMultisigTransaction({network, inputs, outputs, bip32Paths});
  case LEDGER:
    return new LedgerSignMultisigTransaction({network, inputs, outputs, bip32Paths});
  default:
    return new UnsupportedInteraction({network, failureCode: "unsupported", failureText: "This wallet is not supported when signing multisig transactions."});
  }
}


export * from "./interaction";
export * from "./trezor";
export * from "./ledger";
export * from "./hermit";

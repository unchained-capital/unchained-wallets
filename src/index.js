import {UnsupportedInteraction} from "./interaction";
import {TrezorExportPublicKey, TrezorExportExtendedPublicKey, TrezorSignMultisigTransaction} from "./trezor";
import {LedgerExportPublicKey, LedgerExportExtendedPublicKey, LedgerSignMultisigTransaction} from "./ledger";

export const TREZOR = 'trezor';
export const LEDGER = 'ledger';
export const HERMIT = 'hermit';

export function HardwareWalletExportPublicKey({walletType, network, bip32Path, bip32Paths}) {
  switch (walletType) {
  case TREZOR:
    return new TrezorExportPublicKey({network, bip32Path, bip32Paths});
  case LEDGER:
    return new LedgerExportPublicKey({network, bip32Path, bip32Paths});
  default:
    return new UnsupportedInteraction({network, failureCode: "unsupported", failureText: "This wallet is not supported when exporting public keys."});
  }
}

export function HardwareWalletExportExtendedPublicKey({walletType, network, bip32Path}) {
  switch (walletType) {
  case TREZOR:
    return new TrezorExportExtendedPublicKey({network, bip32Path});
  case LEDGER:
    return new LedgerExportExtendedPublicKey({network, bip32Path});
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

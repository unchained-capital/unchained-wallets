import {version} from "../package.json";
import {UnsupportedInteraction} from "./interaction";
import {TREZOR, TrezorGetMetadata, TrezorExportPublicKey, TrezorExportExtendedPublicKey, TrezorConfirmMultisigAddress, TrezorSignMultisigTransaction} from "./trezor";
import {LEDGER, LedgerGetMetadata, LedgerExportPublicKey, LedgerExportExtendedPublicKey, LedgerSignMultisigTransaction} from "./ledger";
import {HERMIT, HermitExportPublicKey, HermitExportExtendedPublicKey, HermitSignTransaction} from "./hermit";

export const VERSION = version;

export const HARDWARE_WALLETS = [TREZOR, LEDGER];
export const QR_CODE_WALLETS = [HERMIT];

export function GetMetadata({walletType}) {
  switch (walletType) {
  case TREZOR:
    return new TrezorGetMetadata();
  case LEDGER:
    return new LedgerGetMetadata();
  default:
    return new UnsupportedInteraction({failureCode: "unsupported", failureText: "This wallet does not return a version."});
  }
}

export function ExportPublicKey({walletType, network, bip32Path}) {
  switch (walletType) {
  case TREZOR:
    return new TrezorExportPublicKey({network, bip32Path});
  case LEDGER:
    return new LedgerExportPublicKey({bip32Path});
  case HERMIT:
    return new HermitExportPublicKey({bip32Path});
  default:
    return new UnsupportedInteraction({network, failureCode: "unsupported", failureText: "This wallet is not supported when exporting public keys."});
  }
}

export function ExportExtendedPublicKey({walletType, network, bip32Path}) {
  switch (walletType) {
  case TREZOR:
    return new TrezorExportExtendedPublicKey({network, bip32Path});
  case LEDGER:
    return new LedgerExportExtendedPublicKey({bip32Path});
  case HERMIT:
    return new HermitExportExtendedPublicKey({bip32Path});
  default:
    return new UnsupportedInteraction({network, failureCode: "unsupported", failureText: "This wallet is not supported when exporting extended public keys."});
  }
}

export function ConfirmMultisigAddress({walletType, network, bip32Path, multisig}) {
  switch (walletType) {
  case TREZOR:
    return new TrezorConfirmMultisigAddress({walletType, network, bip32Path, multisig});
  default:
    return new UnsupportedInteraction({failureCode: "unsupported", failureText: "This wallet does not confirm multisig addresses."});
  }
}

export function SignMultisigTransaction({walletType, network, inputs, outputs, bip32Paths}) {
  switch (walletType) {
  case TREZOR:
    return new TrezorSignMultisigTransaction({network, inputs, outputs, bip32Paths});
  case LEDGER:
    return new LedgerSignMultisigTransaction({network, inputs, outputs, bip32Paths});
  case HERMIT:
    return new HermitSignTransaction({inputs, outputs, bip32Paths});
  default:
    return new UnsupportedInteraction({network, failureCode: "unsupported", failureText: "This wallet is not supported when signing multisig transactions."});
  }
}

export * from "./interaction";
export * from "./trezor";
export * from "./ledger";
export * from "./hermit";

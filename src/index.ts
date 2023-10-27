// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { version } from "../package.json";
import { UNSUPPORTED, UnsupportedInteraction } from "./interaction";
import {
  COLDCARD,
  ColdcardExportPublicKey,
  ColdcardExportExtendedPublicKey,
  ColdcardSignMultisigTransaction,
  ColdcardMultisigWalletConfig,
} from "./coldcard";
import {
  CUSTOM,
  CustomExportExtendedPublicKey,
  CustomSignMultisigTransaction,
} from "./custom";
import {
  HERMIT,
  HermitExportExtendedPublicKey,
  HermitSignMultisigTransaction,
} from "./hermit";
import {
  LEDGER,
  LEDGER_V2,
  LedgerGetMetadata,
  LedgerExportPublicKey,
  LedgerExportExtendedPublicKey,
  LedgerSignMultisigTransaction,
  LedgerSignMessage,
  LedgerConfirmMultisigAddress,
  LedgerRegisterWalletPolicy,
  LedgerV2SignMultisigTransaction,
} from "./ledger";
import {
  TREZOR,
  TrezorGetMetadata,
  TrezorExportPublicKey,
  TrezorExportExtendedPublicKey,
  TrezorSignMultisigTransaction,
  TrezorConfirmMultisigAddress,
  TrezorSignMessage,
} from "./trezor";
import { MultisigWalletConfig, TxInput } from "./types";
import { braidDetailsToWalletConfig } from "./policy";
import { unsignedMultisigPSBT, BraidDetails, Network } from "unchained-bitcoin";

/**
 * Current unchained-wallets version.
 */
export const VERSION: string = version;

export const MULTISIG_ROOT = "m/45'";

/**
 * Keystores which support direct interactions.
 */
export const DIRECT_KEYSTORES = {
  TREZOR,
  LEDGER,
  LEDGER_V2,
} as const;

/**
 * Keystores which support indirect interactions.
 */
export const INDIRECT_KEYSTORES = {
  HERMIT,
  COLDCARD,
  CUSTOM,
} as const;

/**
 * Supported keystores.
 */
export const KEYSTORES = {
  ...DIRECT_KEYSTORES,
  ...INDIRECT_KEYSTORES,
} as const;

type KEYSTORE_KEYS = keyof typeof KEYSTORES;
export type KEYSTORE_TYPES = (typeof KEYSTORES)[KEYSTORE_KEYS];

/**
 * Return an interaction class for obtaining metadata from the given
 * `keystore`.
 *
 * **Supported keystores:** Trezor, Ledger
 *
 * @example
 * import {GetMetadata, TREZOR} from "unchained-wallets";
 * // Works similarly for Ledger.
 * const interaction = GetMetadata({keystore: TREZOR});
 * const metadata = await interaction.run();
 */
export function GetMetadata({ keystore }: { keystore: KEYSTORE_TYPES }) {
  switch (keystore) {
    case LEDGER:
      return new LedgerGetMetadata();
    case TREZOR:
      return new TrezorGetMetadata();
    default:
      return new UnsupportedInteraction({
        code: "unsupported",
        text: "This keystore does not return a version.",
      });
  }
}

/**
 * Return an interaction class for exporting a public key from the
 * given `keystore` for the given `bip32Path` and `network`.
 *
 * **Supported keystores:** Trezor, Ledger, Hermit
 *
 * @example
 * import {MAINNET} from "unchained-bitcoin";
 * import {ExportPublicKey, TREZOR, HERMIT} from "unchained-wallets";
 * // Works similarly for Ledger
 * const interaction = ExportPublicKey({keystore: TREZOR, network: MAINNET, bip32Path: "m/45'/0'/0'/0/0"});
 * const publicKey = await interaction.run();
 */
export function ExportPublicKey({
  keystore,
  network,
  bip32Path,
  includeXFP,
}: {
  keystore: KEYSTORE_TYPES;
  network: Network;
  bip32Path: string;
  includeXFP: boolean;
}) {
  switch (keystore) {
    case COLDCARD:
      return new ColdcardExportPublicKey({
        network,
        bip32Path,
      });
    case LEDGER:
      return new LedgerExportPublicKey({
        bip32Path,
        includeXFP,
      });
    case TREZOR:
      return new TrezorExportPublicKey({
        network,
        bip32Path,
        includeXFP,
      });
    default:
      return new UnsupportedInteraction({
        code: "unsupported",
        text: "This keystore is not supported when exporting public keys.",
      });
  }
}

/**
 * Return an interaction class for signing a message by the given `keystore`
 * for the given `bip32Path`.
 *
 * **Supported keystores:** Ledger, Trezor
 */
export function SignMessage({
  keystore,
  bip32Path,
  message,
}: {
  keystore: KEYSTORE_TYPES;
  bip32Path: string;
  message: string;
}) {
  switch (keystore) {
    case LEDGER:
      return new LedgerSignMessage({
        bip32Path,
        message,
      });
    case TREZOR:
      return new TrezorSignMessage({
        bip32Path,
        message,
      });
    default:
      return new UnsupportedInteraction({
        code: "unsupported",
        text: "This keystore is not supported when signing a message.",
      });
  }
}

/**
 * Return an interaction class for exporting an extended public key
 * from the given `keystore` for the given `bip32Path` and `network`.
 *
 * **Supported keystores:** Trezor, Hermit, Ledger
 *
 * @example
 * import {MAINNET} from "unchained-bitcoin";
 * import {ExportExtendedPublicKey, TREZOR, HERMIT} from "unchained-wallets";
 * // Works similarly for Ledger
 * const interaction = ExportExtendedPublicKey({keystore: TREZOR, network: MAINNET, bip32Path: "m/45'/0'/0'/0/0"});
 * const xpub = await interaction.run();
 */
export function ExportExtendedPublicKey({
  keystore,
  network,
  bip32Path,
  includeXFP,
}: {
  keystore: KEYSTORE_TYPES;
  network: Network;
  bip32Path: string;
  includeXFP: boolean;
}) {
  switch (keystore) {
    case COLDCARD:
      return new ColdcardExportExtendedPublicKey({
        bip32Path,
        network,
      });
    case CUSTOM:
      return new CustomExportExtendedPublicKey({
        bip32Path,
        network,
      });
    case HERMIT:
      return new HermitExportExtendedPublicKey({
        bip32Path,
      });
    case LEDGER:
      return new LedgerExportExtendedPublicKey({
        bip32Path,
        network,
        includeXFP,
      });
    case TREZOR:
      return new TrezorExportExtendedPublicKey({
        bip32Path,
        network,
        includeXFP,
      });
    default:
      return new UnsupportedInteraction({
        code: "unsupported",
        text: "This keystore is not supported when exporting extended public keys.",
      });
  }
}

/**
 * Return an interaction class for signing a multisig transaction with
 * the given `keystore`.
 *
 * The inputs are objects which have `txid`, `index`, and a `multisig`
 * object, the last which is a `Multisig` object from
 * `unchained-bitcoin`.
 *
 * The outputs are objects which have `address` and `amountSats` (an
 * integer).
 *
 * `bip32Paths` is an array of BIP32 paths for the public keys on this
 * device, one for each input.
 *
 * **Supported keystores:** Trezor, Ledger, Hermit
 *
 * @example
 * import {
 *   generateMultisigFromHex, TESTNET, P2SH,
 * } from "unchained-bitcoin";
 * import {SignMultisigTransaction, TREZOR} from "unchained-wallets";
 * const redeemScript = "5...ae";
 * const inputs = [
 *   {
 *     txid: "8d276c76b3550b145e44d35c5833bae175e0351b4a5c57dc1740387e78f57b11",
 *     index: 1,
 *     multisig: generateMultisigFromHex(TESTNET, P2SH, redeemScript),
 *     amountSats: '1234000'
 *   },
 *   // other inputs...
 * ];
 * const outputs = [
 *   {
 *     amountSats: '1299659',
 *     address: "2NGHod7V2TAAXC1iUdNmc6R8UUd4TVTuBmp"
 *   },
 *   // other outputs...
 * ];
 * const interaction = SignMultisigTransaction({
 *   keystore: TREZOR, // works the same for Ledger
 *   network: TESTNET,
 *   inputs,
 *   outputs,
 *   bip32Paths: ["m/45'/0'/0'/0", // add more, 1 per input],
 * });
 * const signature = await interaction.run();
 * console.log(signatures);
 * // ["ababab...", // 1 per input]
 *
 */
export interface SignMultisigTransactionArgs {
  keystore: KEYSTORE_TYPES;
  network: Network;
  inputs?: TxInput[];
  outputs?: object[];
  bip32Paths?: string[];
  psbt: string;
  keyDetails: { xfp: string; path: string };
  returnSignatureArray?: boolean;
  walletConfig: MultisigWalletConfig;
  policyHmac?: string;
  progressCallback?: () => void;
}
export function SignMultisigTransaction({
  keystore,
  network,
  inputs,
  outputs,
  bip32Paths,
  psbt,
  keyDetails,
  returnSignatureArray = false,
  walletConfig,
  policyHmac,
  progressCallback,
}: SignMultisigTransactionArgs) {
  switch (keystore) {
    case COLDCARD:
      return new ColdcardSignMultisigTransaction({
        network,
        inputs,
        outputs,
        bip32Paths,
        psbt,
      });
    case CUSTOM:
      return new CustomSignMultisigTransaction({
        network,
        inputs,
        outputs,
        bip32Paths,
        psbt,
      });
    case HERMIT:
      return new HermitSignMultisigTransaction({
        psbt,
        returnSignatureArray,
      });
    case LEDGER: {
      let _psbt = psbt;
      if (!_psbt)
        _psbt = unsignedMultisigPSBT(network, inputs, outputs).data.toBase64();
      return new LedgerSignMultisigTransaction({
        network,
        inputs,
        outputs,
        bip32Paths,
        psbt: _psbt,
        keyDetails,
        returnSignatureArray,
        v2Options: {
          ...walletConfig,
          policyHmac,
          psbt: _psbt,
          progressCallback,
          returnSignatureArray,
        },
      });
    }
    case LEDGER_V2:
      // if we can know for sure which version of the app
      // we're going to be interacting with then we
      // can return this interaction explicitly without
      // waiting for catching failures and using fallbacks
      // as in the above with v2Options
      return new LedgerV2SignMultisigTransaction({
        ...walletConfig,
        policyHmac,
        psbt,
        progressCallback,
        returnSignatureArray,
      });
    case TREZOR:
      return new TrezorSignMultisigTransaction({
        network,
        inputs,
        outputs,
        bip32Paths,
        psbt,
        keyDetails,
        returnSignatureArray,
      });
    default:
      return new UnsupportedInteraction({
        code: "unsupported",
        text: "This keystore is not supported when signing multisig transactions.",
      });
  }
}

/**
 * Return an interaction class for confirming a multisig address with
 * the given `keystore`.
 *
 * The `multisig` parameter is a `Multisig` object from
 * `unchained-bitcoin`.
 *
 * `bip32Path` is the BIP32 path for the publiic key in the address on
 * this device.
 *
 * `publicKey` optional, is the public key expected to be at `bip32Path`.
 *
 * **Supported keystores:** Trezor, Ledger
 *
 * @example
 * import {
 *   generateMultisigFromHex, TESTNET, P2SH,
 * } from "unchained-bitcoin";
 * import {
 *   ConfirmMultisigAddress,
 *   multisigPublicKeys,
 *   trezorPublicKey,
 *   TREZOR} from "unchained-wallets";
 * const redeemScript = "5...ae";
 * const multisig = generateMultisigFromHex(TESTNET, P2SH, redeemScript);
 * const interaction = ConfirmMultisigAddress({
 *   keystore: TREZOR,
 *   network: TESTNET,
 *   multisig,
 *   bip32Path: "m/45'/1'/0'/0/0",
 * });
 * await interaction.run();
 *
 * With publicKey:
 * const redeemScript = "5...ae";
 * const multisig = generateMultisigFromHex(TESTNET, P2SH, redeemScript);
 * const publicKey = trezorPublicKey(multisigPublicKeys(this.multisig)[2])
 * const interaction = ConfirmMultisigAddress({
 *   keystore: TREZOR,
 *   publicKey,
 *   network: TESTNET,
 *   multisig,
 *   bip32Path: "m/45'/1'/0'/0/0",
 * });
 * await interaction.run();
 *
 *
 */
export function ConfirmMultisigAddress({
  keystore,
  network,
  bip32Path,
  multisig,
  publicKey,
  name,
  policyHmac,
  walletConfig,
}: {
  keystore: KEYSTORE_TYPES;
  network: Network;
  bip32Path: string;
  multisig: any;
  publicKey?: string;
  name?: string;
  policyHmac?: string;
  walletConfig?: any;
}) {
  switch (keystore) {
    case TREZOR:
      return new TrezorConfirmMultisigAddress({
        network,
        bip32Path,
        multisig,
        publicKey,
      });
    case LEDGER: {
      // TODO: clean this up. The reason for this is that
      // we're expecting this malleable object `multisig` that
      // gets passed in but really these interactions should
      // just get a braid or something derived from it.
      const braidDetails: BraidDetails = JSON.parse(multisig.braidDetails);
      const _walletConfig =
        walletConfig || braidDetailsToWalletConfig(braidDetails);
      return new LedgerConfirmMultisigAddress({
        // this is for the name of the wallet the address being confirmed is from
        name,
        ..._walletConfig,
        expected: multisig.address,
        bip32Path,
        policyHmac,
      });
    }
    default:
      return new UnsupportedInteraction({
        code: UNSUPPORTED,
        text: "This keystore is not supported when confirming multisig addresses.",
      });
  }
}

/**
 * Return a class for registering a wallet policy.
 * **Supported keystores:** Ledger
 */
// TODO: superfluous with the ConfigAdapter?
// This name sounds better, but ConfigAdapter can cover Coldcard too
export function RegisterWalletPolicy({
  keystore,
  policyHmac,
  verify = false,
  ...walletConfig
}: {
  keystore: KEYSTORE_TYPES;
  policyHmac?: string;
  verify: boolean;
} & MultisigWalletConfig) {
  switch (keystore) {
    case LEDGER:
      return new LedgerRegisterWalletPolicy({
        ...walletConfig,
        policyHmac,
        verify,
      });
    default:
      return new UnsupportedInteraction({
        code: "unsupported",
        text: "This keystore is not supported when translating external spend configuration files.",
      });
  }
}

/**
 * Return a class for creating a multisig config file for a
 * given keystore or coordinator.
 */
export function ConfigAdapter({
  KEYSTORE,
  jsonConfig,
  policyHmac,
}: {
  KEYSTORE: KEYSTORE_TYPES;
  jsonConfig: string | MultisigWalletConfig;
  policyHmac?: string;
}) {
  switch (KEYSTORE) {
    case COLDCARD:
      return new ColdcardMultisigWalletConfig({
        jsonConfig,
      });
    case LEDGER: {
      let walletConfig: MultisigWalletConfig;
      if (typeof jsonConfig === "string") {
        walletConfig = JSON.parse(jsonConfig);
      } else {
        walletConfig = jsonConfig;
      }

      return new LedgerRegisterWalletPolicy({ ...walletConfig, policyHmac });
    }
    default:
      return new UnsupportedInteraction({
        code: "unsupported",
        text: "This keystore is not supported when translating external spend configuration files.",
      });
  }
}

export * from "./interaction";
export * from "./bcur";
export * from "./coldcard";
export * from "./custom";
export * from "./hermit";
export * from "./ledger";
export * from "./trezor";
export * from "./policy";

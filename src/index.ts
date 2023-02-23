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
import { BraidDetails, MultisigWalletConfig } from "./types";
import { braidDetailsToWalletConfig } from "./policy";

/**
 * Current unchained-wallets version.
 *
 * @type {string}
 */
export const VERSION = version;

export const MULTISIG_ROOT = "m/45'";

/**
 * Enumeration of keystores which support direct interactions.
 *
 * @constant
 * @enum {string}
 * @default
 */
export const DIRECT_KEYSTORES = {
  TREZOR,
  LEDGER,
};

/**
 * Enumeration of keystores which support indirect interactions.
 *
 * @constant
 * @enum {string}
 * @default
 */
export const INDIRECT_KEYSTORES = {
  HERMIT,
  COLDCARD,
  CUSTOM,
};

/**
 * Enumeration of supported keystores.
 *
 * @type {string[]}
 */
export const KEYSTORES = {
  ...DIRECT_KEYSTORES,
  ...INDIRECT_KEYSTORES,
} as const;

type KEYSTORE_KEYS = keyof typeof KEYSTORES;
type KEYSTORE_TYPES = (typeof KEYSTORES)[KEYSTORE_KEYS];

/**
 * Return an interaction class for obtaining metadata from the given
 * `keystore`.
 *
 * **Supported keystores:** Trezor, Ledger
 *
 * @param {Object} options - options argument
 * @param {KEYSTORES} options.keystore - keystore to use
 * @return {module:interaction.KeystoreInteraction} keystore-specific interaction instance
 * @example
 * import {GetMetadata, TREZOR} from "unchained-wallets";
 * // Works similarly for Ledger.
 * const interaction = GetMetadata({keystore: TREZOR});
 * const metadata = await interaction.run();
 */
export function GetMetadata({ keystore }) {
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
 * @param {Object} options - options argument
 * @param {KEYSTORES} options.keystore - keystore to use
 * @param {string} options.network - bitcoin network
 * @param {string} options.bip32Path - the BIP32 path of the HD node of the public key
 * @param {string} options.includeXFP - also return root fingerprint
 * @return {module:interaction.KeystoreInteraction} keystore-specific interaction instance
 * @example
 * import {MAINNET} from "unchained-bitcoin";
 * import {ExportPublicKey, TREZOR, HERMIT} from "unchained-wallets";
 * // Works similarly for Ledger
 * const interaction = ExportPublicKey({keystore: TREZOR, network: MAINNET, bip32Path: "m/45'/0'/0'/0/0"});
 * const publicKey = await interaction.run();
 */
export function ExportPublicKey({ keystore, network, bip32Path, includeXFP }) {
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
 *
 * @param {Object} options - options argument
 * @param {KEYSTORES} options.keystore - keystore to use
 * @param {string} options.bip32Path - the BIP32 path of the HD node of the public key
 * @param {string} options.message - the message to be signed (in hex)
 * @return {module:interaction.KeystoreInteraction} keystore-specific interaction instance
 */
export function SignMessage({ keystore, bip32Path, message }) {
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
 *
 * @param {Object} options - options argument
 * @param {KEYSTORES} options.keystore - keystore to use
 * @param {string} options.network - bitcoin network
 * @param {string} options.bip32Path - the BIP32 path of the HD node of the extended public key
 * @param {string} options.includeXFP - also return root fingerprint
 * @return {module:interaction.KeystoreInteraction} keystore-specific interaction instance
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
 *
 * @param {Object} options - options argument
 * @param {KEYSTORES} options.keystore - keystore to use
 * @param {string} options.network - bitcoin network
 * @param {object[]} options.inputs - transaction inputs
 * @param {object[]} options.outputs - transaction outputs
 * @param {string[]} options.bip32Paths - the BIP32 paths on this device corresponding to a public key in each input
 * @param {string} [options.psbt] - the unsigned_psbt
 * @param {object} [options.keyDetails] - Signing Key Fingerprint + Bip32 Root
 * @param {boolean} [options.returnSignatureArray] - return an array of signatures instead of a signed PSBT (useful for test suite)
 * @return {module:interaction.KeystoreInteraction} keystore-specific interaction instance
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
}) {
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
    case LEDGER:
      return new LedgerSignMultisigTransaction({
        network,
        inputs,
        outputs,
        bip32Paths,
        psbt,
        keyDetails,
        returnSignatureArray,
        v2Options: {
          ...walletConfig,
          policyHmac,
          psbt,
          progressCallback,
        },
      });
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
 * @param {Object} options - options argument
 * @param {KEYSTORES} options.keystore - keystore to use
 * @param {string} options.network - bitcoin network
 * @param {object} options.multisig - `Multisig` object representing the address
 * @param {string} options.bip32Path - the BIP32 path on this device containing a public key from the address
 * @param {string} options.publicKey - optional, the public key expected to be at the given BIP32 path
 * @param {string} [options.addressIndex] - required if doing a ledger interaction, index on braid of the address to confirm
 * @param {string} [options.policyHmac] - optional. for ledger if none is provided then a registration interaction will be performed
 * @return {module:interaction.KeystoreInteraction} keystore-specific interaction instance
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
  addressIndex,
  policyHmac,
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
      const walletConfig = braidDetailsToWalletConfig(braidDetails);
      return new LedgerConfirmMultisigAddress({
        ...walletConfig,
        expected: multisig.address,
        // this is for the name of the wallet the address being confirmed is from
        name,
        braidIndex: Number(braidDetails.index),
        addressIndex,
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
 * @param {string} keystore - keystore to use
 * @param {string} name - name of the wallet
 * @param {Braid} braid - multisig wallet configuration. wallet can be deduced from braid
 * @param {string} [policyHmac] - optionally pass in an existing policy hmac
 * @param {boolean} [verify] - if a policyHmac is passed and verify is true
 * then the registration will take place and the result compared
 * @returns {ColdcardMultisigWalletConfig|UnsupportedInteraction} - A class that can translate to shape of
 * config to match the specified keystore/coordinator requirements
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
 *
 * @param {string} KEYSTORE - keystore to use
 * @param {string} jsonConfig - JSON wallet configuration file e.g. from Caravan
 * @returns {ColdcardMultisigWalletConfig|UnsupportedInteraction} - A class that can translate to shape of
 * config to match the specified keystore/coordinator requirements
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

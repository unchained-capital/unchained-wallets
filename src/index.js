import {version} from "../package.json";
import {UnsupportedInteraction} from "./interaction";
import {
  TREZOR,
  TrezorGetMetadata,
  TrezorExportPublicKey,
  TrezorExportExtendedPublicKey,
  TrezorSignMultisigTransaction,
  TrezorConfirmMultisigAddress,
} from "./trezor";
import {
  LEDGER,
  LedgerGetMetadata,
  LedgerExportPublicKey,
  LedgerExportExtendedPublicKey,
  LedgerSignMultisigTransaction,
} from "./ledger";
import {
  HERMIT,
  HermitExportPublicKey,
  HermitExportExtendedPublicKey,
  HermitSignTransaction
} from "./hermit";
import {
  COLDCARD,
  ColdcardExportPublicKey,
  ColdcardExportExtendedPublicKey,
  ColdcardSignMultisigTransaction,
  generateColdcardConfig,
} from './coldcard';

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
};

/**
 * Enumeration of supported keystores.
 *
 * @type {string[]}
 */
export const KEYSTORES = {
  ...DIRECT_KEYSTORES,
  ...INDIRECT_KEYSTORES,
};


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
export function GetMetadata({keystore}) {
  switch (keystore) {
    case TREZOR:
      return new TrezorGetMetadata();
    case LEDGER:
      return new LedgerGetMetadata();
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
export function ExportPublicKey({
                                  keystore,
                                  network,
                                  bip32Path,
                                  includeXFP,
                                }) {
  switch (keystore) {
    case TREZOR:
      return new TrezorExportPublicKey({
        network,
        bip32Path,
        includeXFP,
      });
    case LEDGER:
      return new LedgerExportPublicKey({
        bip32Path,
        includeXFP,
      });
    case COLDCARD:
      return new ColdcardExportPublicKey({
        network,
        bip32Path,
        includeXFP,
      });
    case HERMIT:
      return new HermitExportPublicKey({
        bip32Path
      });
    default:
      return new UnsupportedInteraction({
        code: "unsupported",
        text: "This keystore is not supported when exporting public keys.",
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
    case TREZOR:
      return new TrezorExportExtendedPublicKey({
        bip32Path,
        network,
        includeXFP
      });
    case HERMIT:
      return new HermitExportExtendedPublicKey({
        bip32Path
      });
    case COLDCARD:
      return new ColdcardExportExtendedPublicKey({
        bip32Path,
        network,
        includeXFP
      });
    case LEDGER:
      return new LedgerExportExtendedPublicKey({
        bip32Path,
        network,
        includeXFP
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
export function SignMultisigTransaction({keystore, network, inputs, outputs, bip32Paths, psbt}) {
  switch (keystore) {
    case TREZOR:
      return new TrezorSignMultisigTransaction({
        network,
        inputs,
        outputs,
        bip32Paths,
      });
    case LEDGER:
      return new LedgerSignMultisigTransaction({
        network,
        inputs,
        outputs,
        bip32Paths,
      });
    case HERMIT:
      return new HermitSignTransaction({
        inputs,
        outputs,
        bip32Paths,
      });
    case COLDCARD:
      return new ColdcardSignMultisigTransaction({
        network,
        inputs,
        outputs,
        bip32Paths,
        psbt,
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
 * **Supported keystores:** Trezor
 *
 * @param {Object} options - options argument
 * @param {KEYSTORES} options.keystore - keystore to use
 * @param {string} options.network - bitcoin network
 * @param {object} options.multisig - `Multisig` object representing the address
 * @param {string} options.bip32Path - the BIP32 path on this device containing a public key from the address
 * @param {string} options.publicKey - optional, the public key expected to be at the given BIP32 path
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
export function ConfirmMultisigAddress({keystore, network, bip32Path, multisig, publicKey}) {
  switch (keystore) {
    case TREZOR:
      return new TrezorConfirmMultisigAddress({
        network,
        bip32Path,
        multisig,
        publicKey,
      });
    default:
      return new UnsupportedInteraction({
        code: "unsupported",
        text: "This keystore is not supported when confirming multisig addresses.",
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
export function ConfigAdapter({ KEYSTORE, jsonConfig }) {
  switch (KEYSTORE) {
    case COLDCARD:
      return generateColdcardConfig(jsonConfig);
    default:
      return new UnsupportedInteraction({
        code: "unsupported",
        text: "This keystore is not supported when translating external spend configuration files.",
      });
  }
}

export * from "./interaction";
export * from "./trezor";
export * from "./ledger";
export * from "./hermit";
export * from "./coldcard";
export * from "./config";

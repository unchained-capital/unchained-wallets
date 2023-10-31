/* eslint-disable max-lines*/

/**
 * Provides classes for interacting with Trezor hardware wallets.
 *
 * The base class provided is `TrezorInteraction` which wraps calls to [`TrezorConnect`]{@link https://github.com/trezor/connect}.  New interactions should subclass `TrezorInteraction`.
 *
 * Many Trezor calls require knowing the bitcoin network.  This
 * library uses the API defined by `unchained-bitcoin` to label
 * bitcoin networks, and this is the value expected in several off the
 * constructors for classes in this module.
 *
 * The value of the `network` is mapped internally to
 * `this.trezorCoin`.  This value is useful to subclasses implementing
 * the `params()` method as many TrezorConnect methods require the
 * `coin` parameter.
 *
 * The following API classes are implemented:
 *
 * * TrezorGetMetadata
 * * TrezorExportPublicKey
 * * TrezorExportExtendedPublicKey
 * * TrezorSignMultisigTransaction
 * * TrezorConfirmMultisigAddress
 *
 * @module trezor
 */
import BigNumber from "bignumber.js";
import {
  MAINNET,
  bip32PathToSequence,
  multisigAddress,
  multisigPublicKeys,
  multisigRequiredSigners,
  multisigAddressType,
  P2SH,
  P2SH_P2WSH,
  P2WSH,
  networkData,
  validateBIP32Path,
  fingerprintToFixedLengthHex,
  translatePSBT,
  addSignaturesToPSBT,
} from "unchained-bitcoin";
import { ECPair, payments } from "bitcoinjs-lib";

import {
  DirectKeystoreInteraction,
  PENDING,
  ACTIVE,
  INFO,
  ERROR,
} from "./interaction";
import { MULTISIG_ROOT } from "./index";

/**
 * Constant defining Trezor interactions.
 *
 * @type {string}
 * @default trezor
 */
export const TREZOR = "trezor";

import TrezorConnect from "@trezor/connect-web";

const ADDRESS_SCRIPT_TYPES = {
  [P2SH]: "SPENDMULTISIG",
  [P2SH_P2WSH]: "SPENDP2SHWITNESS",
  [P2WSH]: "SPENDWITNESS",
};

/**
 * Constant representing the action of pushing the left button on a
 * Trezor device.
 *
 * @type {string}
 * @default 'trezor_left_button'
 */
export const TREZOR_LEFT_BUTTON = "trezor_left_button";

/**
 * Constant representing the action of pushing the right button on a
 * Trezor device.
 *
 * @type {string}
 * @default 'trezor_right_button'
 */
export const TREZOR_RIGHT_BUTTON = "trezor_right_button";

/**
 * Constant representing the action of pushing both buttons on a
 * Trezor device.
 *
 * @type {string}
 * @default 'trezor_both_buttons'
 */
export const TREZOR_BOTH_BUTTONS = "trezor_both_buttons";

/**
 * Constant representing the action of pushing and holding the Confirm
 * button on a Trezor model T device.
 *
 * @type {string}
 * @default 'trezor_push_and_hold_button'
 */
export const TREZOR_PUSH_AND_HOLD_BUTTON = "trezor_push_and_hold_button";

// eslint-disable-next-line no-process-env
const env_variables = { ...process.env }; // Accessing directly does not appear to work, let's make a copy

const ENV_TREZOR_CONNECT_URL =
  env_variables.TREZOR_CONNECT_URL ||
  env_variables.REACT_APP_TREZOR_CONNECT_UR ||
  env_variables.VITE_TREZOR_CONNECT_URL;
const ENV_TREZOR_BLOCKBOOK_URL =
  env_variables.TREZOR_BLOCKBOOK_URL ||
  env_variables.REACT_APP_TREZOR_BLOCKBOOK_URL ||
  env_variables.VITE_TREZOR_BLOCKBOOK_URL;

const TREZOR_CONNECT_URL =
  ENV_TREZOR_CONNECT_URL || `https://${window.location.hostname}:8088/`;
const TREZOR_BLOCKBOOK_URL =
  ENV_TREZOR_BLOCKBOOK_URL || `http://${window.location.hostname}:3035/`;

const TREZOR_DEV =
  env_variables.TREZOR_DEV ||
  env_variables.REACT_APP_TREZOR_DEV ||
  env_variables.VITE_TREZOR_DEV;
try {
  if (TREZOR_DEV)
    TrezorConnect.init({
      connectSrc: TREZOR_CONNECT_URL,
      lazyLoad: true, // this param prevents iframe injection until a TrezorConnect.method is called
      manifest: {
        email: "help@unchained-capital.com",
        appUrl: "https://github.com/unchained-capital/unchained-wallets",
      },
    });
  else
    TrezorConnect.manifest({
      email: "help@unchained-capital.com",
      appUrl: "https://github.com/unchained-capital/unchained-wallets",
    });
} catch (e) {
  // We hit this if we run this code outside of a browser, for example
  // during unit testing.
  if (env_variables.NODE_ENV !== "test") {
    console.error("Unable to call TrezorConnect.manifest.");
  }
}

/**
 * Base class for interactions with Trezor hardware wallets.
 *
 * Assumes we are using TrezorConnect to talk to the device.
 *
 * Subclasses *must* implement a method `this.connectParams` which
 * returns a 2-element array.  The first element of this array should
 * be a `TrezorConnect` method to use (e.g. -
 * `TrezorConnect.getAddress`).  The second element of this array
 * should be the parameters to pass to the given `TrezorConnect`
 * method.
 *
 * Errors thrown when calling TrezorConnect are not caught, so users
 * of this class (and its subclasses) should use `try...catch` as
 * always.
 *
 * Unsuccessful responses (the request succeeded but the Trezor device
 * returned an error message) are intercepted and thrown as errors.
 * This allows upstream `try...catch` blocks to intercept errors &
 * failures uniformly.
 *
 * Subclasses *may* implement the `parse(payload)` method which
 * accepts the response payload object and returns the relevant data.
 *
 * Subclasses will also want to implement a `messages()` method to
 * manipulate the messages returned to the user for each interaction.
 *
 * @extends {module:interaction.DirectKeystoreInteraction}
 * @example
 * import {TrezorInteraction} from "unchained-wallets";
 * // Simple subclass
 *
 * class SimpleTrezorInteraction extends TrezorInteraction {
 *
 *   constructor({network, param}) {
 *     super({network});
 *     this.param =  param;
 *   }
 *
 *   connectParams() {
 *     return [
 *       TrezorConnect.doSomething, // Not a real TrezorConnect function...
 *       {
 *         // Many Trezor methods require the `coin` parameter.  The
 *         // value of `this.trezorCoin` is set appropriately based on the
 *         // `network` provided in the constructor.
 *         coin: this.trezorCoin,
 *
 *         // Pass whatever arguments are required
 *         // by the TrezorConnect function being called.
 *         param: this.param,
 *         // ...
 *       }
 *     ];
 *   }
 *
 *   parsePayload(payload) {
 *     return payload.someValue;
 *   }
 *
 * }
 * // usage
 * import {MAINNET} from "unchained-bitcoin";
 * const interaction = new SimpleTrezorInteraction({network: MAINNET, param: "foo"});
 * const result = await interaction.run();
 * console.log(result); // someValue from payload
 */
export class TrezorInteraction extends DirectKeystoreInteraction {
  /**
   * Trezor interactions require knowing the bitcoin network they are
   * for.
   *
   * @param {object} options - options argument
   * @param {string} options.network - bitcoin network
   */
  constructor({ network }) {
    super();
    this.network = network;
    this.trezorCoin = trezorCoin(network);
  }

  /**
   * Default messages are added asking the user to plug in their
   * Trezor device (`device.connect`) and about the TrezorConnect
   * popups (`trezor.connect.generic`).
   *
   * Subclasses should override this method and add their own messages
   * (don't forget to call `super()`).
   *
   * @returns {module:interaction.Message[]} messages for this interaction
   */
  messages() {
    const messages = super.messages();

    messages.push({
      version: "One",
      state: PENDING,
      level: INFO,
      text: "Make sure your Trezor device is plugged in.",
      code: "device.connect",
    });

    messages.push({
      version: "T",
      state: PENDING,
      level: INFO,
      text: "Make sure your Trezor device is plugged in and unlocked.",
      code: "device.connect",
    });

    messages.push({
      state: ACTIVE,
      level: INFO,
      text: "Your browser should now open a new window to Trezor Connect. Ensure you have enabled popups for this site.",
      code: "trezor.connect.generic",
    });

    return messages;
  }

  /**
   * Awaits the call of `this.method`, passing in the output of
   * `this.params()`.
   *
   * If the call returns but is unsuccessful (`result.success`) is
   * false, will throw the returned error message.  If some other
   * error is thrown, it will not be caught.
   *
   * Otherwise it returns the result of passing `result.payload` to
   * `this.parsePayload`.
   *
   * @returns {Promise} handles the work of calling TrezorConnect
   */
  async run() {
    const [method, params] = this.connectParams();

    if (TREZOR_DEV && method === TrezorConnect.signTransaction) {
      await TrezorConnect.blockchainSetCustomBackend({
        coin: "Regtest",
        blockchainLink: {
          type: "blockbook",
          url: [TREZOR_BLOCKBOOK_URL],
        },
      });
    }

    const result = await method(params);
    if (!result.success) {
      throw new Error(result.payload.error);
    }
    return this.parsePayload(result.payload);
  }

  /**
   * Override this method in a subclass to return a 2-element array.
   *
   * The first element should be a functin to call, typically a
   * `TrezorConnect` method, e.g. `TrezorConnect.getAddress`.
   *
   * The second element should be the parameters to pass to this
   * function.
   *
   * By default, the function passed just throws an error.
   *
   * @returns {Array<function,Object>} the TrezorConnect parameters
   */
  connectParams() {
    return [
      () => {
        throw new Error(
          "Override the `connectParams` method on a subclass of TrezorInteraction."
        );
      },
      {},
    ];
  }

  /**
   * Override this method in a subclass to parse the payload of a
   * successful response from the device.
   *
   * By default, the entire payload is returned.
   *
   * @param {Object} payload - the raw payload from the device response
   * @returns {Object} - relevant or formatted data built from the raw payload
   */
  parsePayload(payload) {
    return payload;
  }
}

/**
 * Returns metadata about Trezor device.
 *
 * Includes model name, device label, firmware version, &
 * PIN/passphrase enablement.
 *
 * @extends {module:trezor.TrezorInteraction}
 * @example
 * import {TrezorGetMetadata} from "unchained-wallets";
 * const interaction = new TrezorGetMetadata();
 * const result = await interaction.run();
 * console.log(result);
 * {
 *   spec: "Model 1 v1.8.3 w/PIN",
 *   model: "Model 1",
 *   version: {
 *     major: 1,
 *     minor: 8,
 *     patch: 3,
 *     string: "1.8.3",
 *   },
 *   label: "My Trezor",
 *   pin: true,
 *   passphrase: false,
 * }
 */
export class TrezorGetMetadata extends TrezorInteraction {
  /**
   * This class doesn't actually require a `network`.
   *
   * @constructor
   */
  constructor() {
    super({});
  }

  /**
   * It is underdocumented, but TrezorConnect does support the
   * `getFeatures` API call.
   *
   * See {@link https://github.com/trezor/connect/blob/v8/src/js/core/methods/GetFeatures.js}.
   *
   * @returns {Array<function, Object>} TrezorConnect parameters
   */
  connectParams() {
    return [TrezorConnect.getFeatures, {}];
  }

  /**
   * Parses Trezor device featuress into an appropriate metadata
   * shape.
   *
   * @param {Object} payload - the original payload from the device response
   * @returns {Object} device metadata & features
   */
  parsePayload(payload) {
    // Example result:
    //
    // {
    //   bootloader_hash: "5112...846e9"
    //   bootloader_mode: null
    //   device_id: "BDF9...F198"
    //   firmware_present: null
    //   flags: 0
    //   fw_major: null
    //   fw_minor: null
    //   fw_patch: null
    //   fw_vendor: null
    //   fw_vendor_keys: null
    //   imported: false
    //   initialized: true
    //   label: "My Trezor"
    //   language: null
    //   major_version: 1
    //   minor_version: 6
    //   model: "1"
    //   needs_backup: false
    //   no_backup: null
    //   passphrase_cached: false
    //   passphrase_protection: false
    //   patch_version: 3
    //   pin_cached: true
    //   pin_protection: true
    //   revision: "ef8...862d7"
    //   unfinished_backup: null
    //   vendor: "bitcointrezor.com"
    // }
    const {
      major_version,
      minor_version,
      patch_version,
      label,
      model,
      pin_protection,
      passphrase_protection,
    } = payload;
    let spec = `Model ${model} v.${major_version}.${minor_version}.${patch_version}`;
    if (pin_protection) {
      spec += " w/PIN";
    }
    if (passphrase_protection) {
      spec += " w/PASS";
    }
    return {
      spec,
      model: `Model ${model}`,
      version: {
        major: major_version,
        minor: minor_version,
        patch: patch_version,
        string: `${major_version}.${minor_version}.${patch_version}`,
      },
      label,
      pin: pin_protection,
      passphrase: passphrase_protection,
    };
  }
}

/**
 * Base class for interactions exporting information about an HD node
 * at a given BIP32 path.
 *
 * You may want to use `TrezorExportPublicKey` or
 * `TrezorExportExtendedPublicKey` directly.
 *
 * @extends {module:trezor.TrezorInteraction}
 * @example
 * import {MAINNET} from "unchained-bitcoin";
 * import {TrezorExportHDNode} from "unchained-wallets";
 * const interaction = new TrezorExportHDNode({network: MAINNET, bip32Path: "m/48'/0'/0'/2'/0"});
 * const node = await interaction.run();
 * console.log(node); // {publicKey: "", xpub: "", ...}
 *
 */
export class TrezorExportHDNode extends TrezorInteraction {
  /**
   * Requires a BIP32 path to the node to export as well as which network.
   *
   * @param {object} options - options argument
   * @param {string} options.network - bitcoin network
   * @param {string} bip32Path - the BIP32 path for the HD node
   * @param {boolean} includeXFP - return xpub with root fingerprint concatenated
   */
  constructor({ network, bip32Path, includeXFP }) {
    super({ network });
    this.bip32Path = bip32Path;
    this.includeXFP = includeXFP;
    this.bip32ValidationErrorMessage = {};
    const bip32PathError = validateBIP32Path(bip32Path);
    if (bip32PathError.length) {
      this.bip32ValidationErrorMessage = {
        text: bip32PathError,
        code: "trezor.bip32_path.path_error",
      };
    }
  }

  /**
   * Adds messages related to warnings Trezor devices make depending
   * on the BIP32 path passed.
   *
   * @returns {module:interaction.Message[]} messages for this interaction
   */
  messages() {
    const messages = super.messages();

    const bip32PathSegments = (this.bip32Path || "").split("/");
    if (bip32PathSegments.length < 4) {
      // m, 45', 0', 0', ...
      messages.push({
        state: PENDING,
        level: ERROR,
        text: "BIP32 path must be at least depth 3.",
        code: "trezor.bip32_path.minimum",
      });
    }

    if (Object.entries(this.bip32ValidationErrorMessage).length) {
      messages.push({
        state: PENDING,
        level: ERROR,
        code: this.bip32ValidationErrorMessage.code,
        text: this.bip32ValidationErrorMessage.text,
      });
    }

    messages.push({
      state: ACTIVE,
      level: INFO,
      text: "Confirm in the Trezor Connect window that you want to 'Export public key'. You may be prompted to enter your PIN.",
      code: "trezor.connect.export_hdnode",
    });

    return messages;
  }

  extractDetailsFromPayload({ payload, pubkey }) {
    if (payload.length !== 2) {
      throw new Error("Payload does not have two responses.");
    }
    let keyMaterial = "";
    let rootFingerprint = null;
    for (let i = 0; i < payload.length; i++) {
      // Find the payload with bip32 = MULTISIG_ROOT to get xfp
      if (payload[i].serializedPath === MULTISIG_ROOT) {
        let fp = payload[i].fingerprint;
        rootFingerprint = fingerprintToFixedLengthHex(fp);
      } else {
        keyMaterial = pubkey ? payload[i].publicKey : payload[i].xpub;
      }
    }
    return {
      rootFingerprint,
      keyMaterial,
    };
  }

  /**
   * See {@link https://github.com/trezor/connect/blob/v8/docs/methods/getPublicKey.md}.
   *
   * @returns {Array<function,Object>} TrezorConnect parameters
   */
  connectParams() {
    if (this.includeXFP) {
      return [
        TrezorConnect.getPublicKey,
        {
          bundle: [{ path: this.bip32Path }, { path: MULTISIG_ROOT }],
          coin: this.trezorCoin,
          crossChain: true,
        },
      ];
    }
    return [
      TrezorConnect.getPublicKey,
      {
        path: this.bip32Path,
        coin: this.trezorCoin,
        crossChain: true,
      },
    ];
  }
}

/**
 * Returns the public key at a given BIP32 path.
 *
 * @extends {module:trezor.TrezorExportHDNode}
 * @example
 * import {MAINNET} from "unchained-bitcoin";
 * import {TrezorExportPublicKey} from "unchained-wallets";
 * const interaction = new TrezorExportPublicKey({network: MAINNET, bip32Path: "m/48'/0'/0'/2'/0"});
 * const publicKey = await interaction.run();
 * console.log(publicKey);
 * // "03..."
 */
export class TrezorExportPublicKey extends TrezorExportHDNode {
  constructor({ network, bip32Path, includeXFP }) {
    super({
      network,
      bip32Path,
      includeXFP,
    });
    this.includeXFP = includeXFP;
  }

  /**
   * Parses the public key from the HD node response.
   *
   * @param {object} payload - the original payload from the device response
   * @returns {string|Object} the (compressed) public key in hex or Object if root fingerprint requested
   */
  parsePayload(payload) {
    if (this.includeXFP) {
      const { rootFingerprint, keyMaterial } = this.extractDetailsFromPayload({
        payload,
        pubkey: true,
      });
      return {
        rootFingerprint,
        publicKey: keyMaterial,
      };
    }
    return payload.publicKey;
  }
}

/**
 * Returns the extended public key at a given BIP32 path.
 *
 * @extends {module:trezor.TrezorExportHDNode}
 * @example
 * import {MAINNET} from "unchained-bitcoin";
 * import {TrezorExportExtendedPublicKey} from "unchained-wallets";
 * const interaction = new TrezorExportExtendedPublicKey({network: MAINNET, bip32Path: "m/48'/0'/0'"});
 * const xpub = await interaction.run();
 * console.log(xpub);
 * // "xpub..."
 */
export class TrezorExportExtendedPublicKey extends TrezorExportHDNode {
  constructor({ network, bip32Path, includeXFP }) {
    super({
      network,
      bip32Path,
      includeXFP,
    });
    this.includeXFP = includeXFP;
  }

  /**
   * Parses the extended public key from the HD node response.
   *
   * If asking for XFP, return object with xpub and the root fingerprint.
   *
   * @param {object} payload the original payload from the device response
   * @returns {string|Object} the extended public key (returns object if asked to include root fingerprint)
   */
  parsePayload(payload) {
    if (this.includeXFP) {
      const { rootFingerprint, keyMaterial } = this.extractDetailsFromPayload({
        payload,
        pubkey: false,
      });
      return {
        rootFingerprint,
        xpub: keyMaterial,
      };
    }
    return payload.xpub;
  }
}

/**
 * Returns a signature for a bitcoin transaction with inputs from one
 * or many multisig addresses.
 *
 * - `inputs` is an array of `UTXO` objects from `unchained-bitcoin`
 * - `outputs` is an array of `TransactionOutput` objects from `unchained-bitcoin`
 * - `bip32Paths` is an array of (`string`) BIP32 paths, one for each input, identifying the path on this device to sign that input with
 *
 * @example
 * import {
 *   generateMultisigFromHex, TESTNET, P2SH,
 * } from "unchained-bitcoin";
 * import {TrezorSignMultisigTransaction} from "unchained-wallets";
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
 * const interaction = new TrezorSignMultisigTransaction({
 *   network: TESTNET,
 *   inputs,
 *   outputs,
 *   bip32Paths: ["m/45'/0'/0'/0", // add more, 1 per input],
 * });
 * const signature = await interaction.run();
 * console.log(signatures);
 * // ["ababab...", // 1 per input]
 * @extends {module:trezor.TrezorInteraction}
 */
export class TrezorSignMultisigTransaction extends TrezorInteraction {
  /**
   * @param {object} options - options argument
   * @param {string} options.network - bitcoin network
   * @param {UTXO[]} [options.inputs] - inputs for the transaction
   * @param {TransactionOutput[]} [options.outputs] - outputs for the transaction
   * @param {string[]} [options.bip32Paths] - BIP32 paths on this device to sign with, one per each input
   * @param {string} [options.psbt] - PSBT string encoded in base64
   * @param {object} [options.keyDetails] - Signing Key Details (Fingerprint + bip32 prefix)
   * @param {boolean} [options.returnSignatureArray] - return an array of signatures instead of a signed PSBT (useful for test suite)
   */
  constructor({
    network,
    inputs,
    outputs,
    bip32Paths,
    psbt,
    keyDetails,
    returnSignatureArray,
  }) {
    super({ network });
    if (!psbt || !keyDetails) {
      this.inputs = inputs;
      this.outputs = outputs;
      this.bip32Paths = bip32Paths;
    } else {
      const { unchainedInputs, unchainedOutputs, bip32Derivations } =
        translatePSBT(network, P2SH, psbt, keyDetails);
      this.psbt = psbt;
      this.inputs = unchainedInputs;
      this.outputs = unchainedOutputs;
      this.bip32Paths = bip32Derivations.map((b32d) => b32d.path);
      this.pubkeys = bip32Derivations.map((b32d) => b32d.pubkey);
      this.returnSignatureArray = returnSignatureArray;
    }
  }

  /**
   * Adds messages describing the signing flow.
   *
   * @returns {module:interaction.Message[]} messages for this interaction
   */
  messages() {
    const messages = super.messages();

    messages.push({
      state: ACTIVE,
      level: INFO,
      text: `Confirm in the Trezor Connect window that you want to 'Sign ${this.network} transaction'.  You may be prompted to enter your PIN.`,
      code: "trezor.connect.sign",
    });

    messages.push({
      state: ACTIVE,
      level: INFO,
      version: "One",
      text: "Confirm each output on your Trezor device and approve the transaction.",
      messages: [
        {
          text: "For each output, your Trezor device will display the output amount and address.",
          action: TREZOR_RIGHT_BUTTON,
        },
        {
          text: "Your Trezor device will display the total output amounts and fee amount.",
          action: TREZOR_RIGHT_BUTTON,
        },
      ],
      code: "trezor.sign",
    });

    messages.push({
      state: ACTIVE,
      level: INFO,
      version: "T",
      text: "Confirm each output on your Trezor device and approve the transaction.",
      messages: [
        {
          text: `For each input, your Trezor device will display a "Confirm path" dialogue displaying the input BIP32 path.  It is safe to continue`,
          action: TREZOR_RIGHT_BUTTON,
        },
        {
          text: `For each output, your Trezor device will display a "Confirm sending" dialogue displaying the output amount and address.`,
          action: TREZOR_RIGHT_BUTTON,
        },
        {
          text: `Your Trezor device will display the "Confirm transaction" dialogue displaying the total output amount and fee amount.`,
          action: TREZOR_PUSH_AND_HOLD_BUTTON,
        },
      ],
      code: "trezor.sign",
    });

    return messages;
  }

  /**
   * See {@link https://github.com/trezor/connect/blob/v8/docs/methods/signTransaction.md}.
   *
   * @returns {Array<function, Object>} TrezorConnect parameters
   */
  connectParams() {
    return [
      TrezorConnect.signTransaction,
      {
        inputs: this.inputs.map((input, inputIndex) =>
          trezorInput(input, this.bip32Paths[inputIndex])
        ),
        outputs: this.outputs.map((output) => trezorOutput(output)),
        coin: this.trezorCoin,
      },
    ];
  }

  /**
   * Parses the signature(s) out of the response payload.
   *
   * Ensures each input's signature hasa a trailing `...01` {@link https://bitcoin.org/en/glossary/sighash-all SIGHASH_ALL} byte.
   *
   * @param {Object} payload - the original payload from the device response
   * @returns {string[]|string} array of input signatures, one per input or signed psbt with signatures inserted
   */
  parsePayload(payload) {
    // If we were passed a PSBT initially, we want to return a PSBT with partial signatures
    // rather than the normal array of signatures.
    if (this.psbt && !this.returnSignatureArray) {
      return addSignaturesToPSBT(
        this.network,
        this.psbt,
        this.pubkeys,
        this.parseSignature(payload.signatures, "buffer")
      );
    } else {
      return this.parseSignature(payload.signatures, "hex");
    }
  }
}

/**
 * Shows a multisig address on the device and prompts the user to
 * confirm it.
 * If the optional publicKey parameter is used, the public key at
 * the given BIP32 path is checked, returning an error if they don't match.
 *
 * Without the publicKey parameter, this function simply checks that the
 * public key at the given BIP32 path is in the redeemscript (with
 * validation on-device.
 *
 * @extends {module:trezor.TrezorInteraction}
 * @example
 * import {
 *   generateMultisigFromPublicKeys, MAINNET, P2SH,
 * } from "unchained-bitcoin";
 * import {TrezorConfirmMultisigAddress} from "unchained-wallets";
 * const multisig = generateMultisigFromPublicKeys(MAINNET, P2SH, 2, "03a...", "03b...");
 * const interaction = new TrezorConfirmMultisigAddress({network: MAINNET, bip32Path: "m/45'/0'/0'/0/0", multisig});
 * await interaction.run();
 */
export class TrezorConfirmMultisigAddress extends TrezorInteraction {
  /**
   * Most of the information required to confirm a multisig address
   * lives in the `Multisig` object from `unchained-bitcoin`.
   *
   * @param {object} options - options argument
   * @param {string} options.network - bitcoin network
   * @param {string} options.bip32Path - BIP32 path to the public key on this device used in the multisig address
   * @param {Multisig} options.multisig - multisig object
   * @param {string} options.publicKey - optional public key to confirm
   */
  constructor({ network, bip32Path, multisig, publicKey }) {
    super({ network });
    this.bip32Path = bip32Path;
    this.multisig = multisig;
    this.publicKey = publicKey;
  }

  /**
   * Adds messages about BIP32 path warnings.
   *
   * @returns {module:interaction.Message[]} messages for this interaction
   *
   */
  messages() {
    const messages = super.messages();

    if (this.publicKey) {
      messages.push({
        state: ACTIVE,
        level: INFO,
        text: `Confirm in the Trezor Connect window that you want to ‘Export multiple ${this.trezorCoin} addresses’. You may be prompted to enter your PIN. You may also receive a warning about your selected BIP32 path.`,
        code: "trezor.connect.confirm_address",
      });
    } else {
      messages.push({
        state: ACTIVE,
        level: INFO,
        text: `Confirm in the Trezor Connect window that you want to 'Export ${this.trezorCoin} address'.  You may be prompted to enter your PIN.`,
        code: "trezor.connect.confirm_address",
      });
    }

    messages.push({
      state: ACTIVE,
      level: INFO,
      version: "One",
      text: "It is safe to continue and confirm the address on your Trezor device.",
      messages: [
        // FIXME this only shows up on P2SH?
        {
          text: `Your Trezor device may display a warning "Wrong address path for selected coin".  It is safe to continue`,
          action: TREZOR_RIGHT_BUTTON,
        },
        {
          text: `Your Trezor device will display the multisig address and BIP32 path.`,
          action: TREZOR_RIGHT_BUTTON,
        },
      ],
      code: "trezor.confirm_address",
    });

    messages.push({
      state: ACTIVE,
      level: INFO,
      version: "T",
      text: "Confirm the addresss on your Trezor device.",
      messages: [
        {
          text: `For each signer in your quorum, your Trezor device will display a "Confirm path" dialogue displaying the signer's BIP32 path.  It is safe to continue`,
          action: TREZOR_RIGHT_BUTTON,
        },
        {
          text: `Your Trezor device will display the multisig address.`,
          action: TREZOR_RIGHT_BUTTON,
        },
      ],
      code: "trezor.confirm_address",
    });

    return messages;
  }

  /**
   * See {@link https://github.com/trezor/connect/blob/v8/docs/methods/getAddress.md}.
   *
   * @returns {Array<function, Object>} TrezorConnect parameters
   */
  connectParams() {
    if (this.publicKey) {
      return [
        TrezorConnect.getAddress,
        {
          bundle: [
            {
              path: this.bip32Path,
              showOnTrezor: false,
              coin: this.trezorCoin,
              crossChain: true,
            },
            {
              path: this.bip32Path,
              address: multisigAddress(this.multisig),
              showOnTrezor: true,
              coin: this.trezorCoin,
              crossChain: true,
              multisig: {
                m: multisigRequiredSigners(this.multisig),
                pubkeys: multisigPublicKeys(this.multisig).map((publicKey) =>
                  trezorPublicKey(publicKey)
                ),
              },
              scriptType:
                ADDRESS_SCRIPT_TYPES[multisigAddressType(this.multisig)],
            },
          ],
        },
      ];
    } else {
      return [
        TrezorConnect.getAddress,
        {
          path: this.bip32Path,
          address: multisigAddress(this.multisig),
          showOnTrezor: true,
          coin: this.trezorCoin,
          crossChain: true,
          multisig: {
            m: multisigRequiredSigners(this.multisig),
            pubkeys: multisigPublicKeys(this.multisig).map((publicKey) =>
              trezorPublicKey(publicKey)
            ),
          },
          scriptType: ADDRESS_SCRIPT_TYPES[multisigAddressType(this.multisig)],
        },
      ];
    }
  }

  parsePayload(payload) {
    if (!this.publicKey) {
      return payload;
    }
    const keyPair = ECPair.fromPublicKey(Buffer.from(this.publicKey, "hex"));
    const { address } = payments.p2pkh({
      pubkey: keyPair.publicKey,
      network: networkData(this.network),
    });
    if (address !== payload[0].address && address !== payload[1].address) {
      throw new Error("Wrong public key specified");
    }
    return payload;
  }
}

/**
 * Returns a signature for a message given a bip32 path.
 *
 * @extends {module:trezor.TrezorInteraction}
 */
export class TrezorSignMessage extends TrezorInteraction {
  /**
   * @param {object} options - option argument
   * @param {string} option.network - network
   * @param {string} option.bip32Path - bip32 path on this device to sign with
   * @param {string} option.message - hex-encoded string to sign
   */
  constructor({ network, bip32Path, message }) {
    super({ network });
    this.bip32Path = bip32Path;
    this.message = message;

    this.bip32ValidationErrorMessage = {};
    const bip32PathError = validateBIP32Path(bip32Path);
    if (bip32PathError.length) {
      this.bip32ValidationErrorMessage = {
        text: bip32PathError,
        code: "trezor.bip32_path.path_error",
      };
    }
  }

  /**
   * Adds messages describing the signing flow.
   *
   * @returns {module:interaction.Message[]} messages for this interaction
   */
  messages() {
    const messages = super.messages();

    const bip32PathSegments = (this.bip32Path || "").split("/");
    if (bip32PathSegments.length < 4) {
      // m, 45', 0', 0', ...
      messages.push({
        state: PENDING,
        level: ERROR,
        text: "BIP32 path must be at least depth 3.",
        code: "trezor.bip32_path.minimum",
      });
    }

    if (Object.entries(this.bip32ValidationErrorMessage).length) {
      messages.push({
        state: PENDING,
        level: ERROR,
        code: this.bip32ValidationErrorMessage.code,
        text: this.bip32ValidationErrorMessage.text,
      });
    }

    messages.push({
      state: ACTIVE,
      level: INFO,
      text: "Confirm in the Trezor Connect window that you want to 'Sign message'.  You may be prompted to enter your PIN.",
      code: "trezor.connect.sign",
    });

    messages.push({
      state: ACTIVE,
      level: INFO,
      text: "Confirm the message to be signed on your Trezor device and approve for signing.",
      code: "trezor.sign",
    });

    return messages;
  }

  /**
   * See {@link https://github.com/trezor/connect/blob/v8/docs/methods/signMessage.md}.
   *
   * @returns {Array<function, Object>} TrezorConnect parameters
   */
  connectParams() {
    return [
      TrezorConnect.signMessage,
      {
        path: this.bip32Path,
        message: this.message,
      },
    ];
  }
}

/**
 * Returns the Trezor API version of the given network.
 *
 * @param {string} network - bitcoin network
 * @returns {string} Trezor API spelling for this network
 */
export function trezorCoin(network) {
  const testnet_network = TREZOR_DEV ? "Regtest" : "Testnet";
  return network === MAINNET ? "Bitcoin" : testnet_network;
}

function trezorInput(input, bip32Path) {
  const requiredSigners = multisigRequiredSigners(input.multisig);
  const publicKeys = multisigPublicKeys(input.multisig);
  const addressType = multisigAddressType(input.multisig);
  const spendType = ADDRESS_SCRIPT_TYPES[addressType];
  return {
    script_type: spendType,
    multisig: {
      m: requiredSigners,
      pubkeys: publicKeys.map((publicKey) => trezorPublicKey(publicKey)),
      signatures: Array(publicKeys.length).fill(""),
    },
    prev_hash: input.txid,
    prev_index: input.index,
    address_n: bip32PathToSequence(bip32Path),
    ...(input.amountSats && { amount: BigNumber(input.amountSats).toString() }),
  };
}

function trezorPublicKey(publicKey) {
  return {
    address_n: [],
    node: {
      // FIXME are all these 0's OK?
      depth: 0,
      child_num: 0,
      fingerprint: 0,
      chain_code: "0".repeat(64),
      public_key: publicKey,
    },
  };
}

function trezorOutput(output) {
  return {
    amount: BigNumber(output.amountSats).toFixed(0),
    address: output.address,
    script_type: "PAYTOADDRESS",
  };
}

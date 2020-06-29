/**
 * This module provides classes for Ledger hardware wallets.
 *
 * The base classes provided are `LedgerDashboardInteraction` and
 * `LedgerBitcoinInteraction` for interactions requiring being in the
 * Ledger dashboard vs. bitcoin app, respectively.
 *
 * The following API classes are implemented:
 *
 * * LedgerGetMetadata
 * * LedgerExportPublicKey
 * * LedgerExportExtendedPublicKey
 * * LedgerSignMultisigTransaction
 *
 * @module ledger
 */
import BigNumber from "bignumber.js";
import {
  bip32PathToSequence,
  hardenedBIP32Index,
  compressPublicKey,
  scriptToHex,
  multisigRedeemScript,
  multisigWitnessScript,
  TESTNET,
  P2SH,
  P2SH_P2WSH,
  P2WSH,
  multisigAddressType,
  getParentPath,
  getFingerprintFromPublicKey,
  deriveExtendedPublicKey,
} from "unchained-bitcoin";

import {
  ACTIVE,
  PENDING,
  INFO,
  WARNING,
  DirectKeystoreInteraction,
} from "./interaction";

/**
 * Constant defining Ledger interactions.
 *
 * @type {string}
 * @default ledger
 */
export const LEDGER = 'ledger';
import {splitTransaction} from "@ledgerhq/hw-app-btc/lib/splitTransaction";
import {serializeTransactionOutputs} from "@ledgerhq/hw-app-btc/lib/serializeTransaction";

const bitcoin = require('bitcoinjs-lib');

const TransportU2F = require("@ledgerhq/hw-transport-u2f").default;
const TransportWebUsb = require("@ledgerhq/hw-transport-webusb").default;
const LedgerBtc = require("@ledgerhq/hw-app-btc").default;

/**
 * Constant representing the action of pushing the left button on a
 * Ledger device.
 *
 * @type {string}
 * @default 'ledger_left_button'
 */
export const LEDGER_LEFT_BUTTON = 'ledger_left_button';

/**
 * Constant representing the action of pushing the right button on a
 * Ledger device.
 *
 * @type {string}
 * @default 'ledger_right_button'
 */
export const LEDGER_RIGHT_BUTTON = 'ledger_right_button';

/**
 * Constant representing the action of pushing both buttons on a
 * Ledger device.
 *
 * @type {string}
 * @default 'ledger_both_buttons'
 */
export const LEDGER_BOTH_BUTTONS = 'ledger_both_buttons';


/**
 * Base class for interactions with Ledger hardware wallets.
 *
 * Subclasses must implement their own `run()` method.  They may use
 * the `withTransport` and `withApp` methods to connect to the Ledger
 * API's transport or app layers, respectively.
 *
 * Errors are not caught, so users of this class (and its subclasses)
 * should use `try...catch` as always.
 *
 * @extends {module:interaction.DirectKeystoreInteraction}
 * @example
 * import {LedgerInteraction} from "unchained-wallets";
 * // Simple subclass
 *
 * class SimpleLedgerInteraction extends LedgerInteraction {
 *
 *   constructor({param}) {
 *     super({});
 *     this.param =  param;
 *   }
 *
 *   async run() {
 *     return await this.withApp(async (app, transport) => {
 *       return app.doSomething(this.param); // Not a real Ledger API call
 *     });
 *   }
 * 
 * }
 *
 * // usage
 * const interaction = new SimpleLedgerInteraction({param: "foo"});
 * const result = await interaction.run();
 * console.log(result); // whatever value `app.doSomething(...)` returns
 *
 */
export class LedgerInteraction extends DirectKeystoreInteraction {

  /**
   * Adds `pending` messages at the `info` level about ensuring the
   * device is plugged in (`device.connect`) and unlocked
   * (`device.unlock`).  Adds an `active` message at the `info` level
   * when communicating with the device (`device.active`).
   *
   * @return {module:interaction.Message[]} messages for ths interaction
   */
  messages() {
    const messages = super.messages();
    messages.push({
      state: PENDING,
      level: INFO,
      text: "Make sure your Ledger is plugged in.",
      code: "device.connect",
    });
    messages.push({
      state: PENDING,
      level: INFO,
      text: "Make sure you have unlocked your Ledger.",
      code: "device.unlock",
    });
    messages.push({
      state: ACTIVE,
      level: INFO,
      text: "Communicating with Ledger...",
      code: "device.active",
    });
    return messages;
  }

  /**
   * Can be called by a subclass during its `run()` method.
   *
   * Creates a transport layer connection and passes control to the
   * `callback` function, with the transport API as the first argument
   * to the function.
   *
   * See the [Ledger API]{@link https://github.com/LedgerHQ/ledgerjs} for general information or a [specific transport API]{@link https://github.com/LedgerHQ/ledgerjs/tree/master/packages/hw-transport-u2f} for examples of API calls.
   *
   * @param {function} callback -- asynchronous function accepting a single parameter `transport`
   * @returns {Promise} does the work of setting up a transport connection
   * @example
   * async run() {
   *   return await this.withTransport(async (transport) => {
   *     return transport.doSomething(); // Not a real Ledger transport API call
   *   });
   * }
   */
  async withTransport(callback) {
    try {
      const transport = await TransportWebUsb.create();
      return callback(transport);
    } catch (e) {
      if (e.message && e.message === "navigator.usb is undefined") { // webusb failed, so try u2f
        const transport = await TransportU2F.create();
        return callback(transport);
      } else {
        throw new Error("Error with Ledger transport");
      }
    }
  }

  /**
   * Can be called by a subclass during its `run()` method.
   *
   * Creates a transport layer connection, initializes a bitcoin app
   * object, and passes control to the `callback` function, with the
   * app API as the first argument to the function and the transport
   * API as the second.
   *
   * See the [Ledger API]{@link https://github.com/LedgerHQ/ledgerjs} for general information or the [bitcoin app API]{@link https://github.com/LedgerHQ/ledgerjs/tree/master/packages/hw-app-btc} for examples of API calls.
   *
   * @param {function} callback -- accepts two parameters, `app` and `transport`, which are the Ledger APIs for the bitcoin app and the transport layer, respectively.
   * @returns {Promise} does the work of setting up an app instance (and transport connection)
   * @example
   * async run() {
   *   return await this.withApp(async (app, transport) => {
   *     return app.doSomething(); // Not a real Ledger bitcoin app API call
   *   });
   * }
   */
  withApp(callback) {
    return this.withTransport(async (transport) => {
      const app = new LedgerBtc(transport);
      return callback(app, transport);
    });
  }

}

/**
 * Base class for interactions which must occur when the Ledger device
 * is not in any app but in the dashboard.
 *
 * @extends {module:ledger.LedgerInteraction}
 *
 */
export class LedgerDashboardInteraction extends LedgerInteraction {

  /**
   * Adds `pending` and `active` messages at the `info` level urging
   * the user to be in the Ledger dashboard, not the bitcoin app
   * (`ledger.app.dashboard`).
   *
   * @return {module:interaction.Message[]} messages for this interaction
   */
  messages() {
    const messages = super.messages();
    messages.push({
      state: PENDING,
      level: INFO,
      text: "Make sure you have the main Ledger dashboard open, NOT the Bitcoin app.",
      code: "ledger.app.dashboard",
    });
    messages.push({
      state: ACTIVE,
      level: INFO,
      text: "Make sure you have the main Ledger dashboard open, NOT the Bitcoin app.",
      code: "ledger.app.dashboard",
    });
    return messages;
  }
}

/**
 * Base class for interactions which must occur when the Ledger device
 * is open to the bitcoin app.
 *
 * @extends {module:ledger.LedgerInteraction}
 */
export class LedgerBitcoinInteraction extends LedgerInteraction {

  /**
   * Adds `pending` and `active` messages at the `info` level urging
   * the user to be in the bitcoin app (`ledger.app.bitcoin`).
   *
   * @return {module:interaction.Message[]} messages for this interaction
   */
  messages() {
    const messages = super.messages();
    messages.push({
      state: PENDING,
      level: INFO,
      text: "Make sure you have the Bitcoin app open.",
      code: "ledger.app.bitcoin",
    });
    messages.push({
      state: ACTIVE,
      level: INFO,
      text: "Make sure you have the Bitcoin app open.",
      code: "ledger.app.bitcoin",
    });
    return messages;
  }

}

/**
 * Returns metadata about Ledger device.
 *
 * Includes model name, firmware & MCU versions.
 *
 * @extends {module:ledger.LedgerDashboardInteraction}
 * @example
 * import {LedgerGetMetadata} from "unchained-wallets";
 * const interaction = new LedgerGetMetadata();
 * const result = await interaction.run();
 * console.log(result);
 * {
 *   spec: "Nano S v1.4.2 (MCU v1.7)",
 *   model: "Nano S",
 *   version: {
 *     major: "1",
 *     minor: "4",
 *     patch: "2",
 *     string: "1.4.2",
 *   },
 *   mcuVersion: {
 *     major: "1",
 *     minor: "7",
 *     string: "1.7",
 *   }
 * }
 *
 */
export class LedgerGetMetadata extends LedgerDashboardInteraction {
  // FIXME entire implementation here is rickety AF.

  async run() {

    return this.withTransport(async (transport) => {
      transport.setScrambleKey('B0L0S');
      const rawResult = await transport.send(0xe0, 0x01, 0x00, 0x00);
      return this.parseMetadata(rawResult);
    });
  }

  /**
   * Parses the binary data returned from the Ledger API call into a
   * metadata object.
   *
   * @param {ByteArray} response - binary response data
   * @returns {Object} - device metadata
   */
  parseMetadata(response) {
    try {
      // From
      //
      //   https://github.com/LedgerHQ/ledger-live-common/blob/master/src/hw/getVersion.js
      //   https://github.com/LedgerHQ/ledger-live-common/blob/master/src/hw/getDeviceInfo.js
      //   https://git.xmr.pm/LedgerHQ/ledger-live-common/commit/9ffc75acfc7f1e9aa9101a32b3e7481770fb3b89

      const PROVIDERS = {
        "": 1,
        das: 2,
        club: 3,
        shitcoins: 4,
        ee: 5,
      };
      const ManagerAllowedFlag = 0x08;
      const PinValidatedFlag = 0x80;

      const byteArray = [...response];
      const data = byteArray.slice(0, byteArray.length - 2);
      const targetIdStr = Buffer.from(data.slice(0, 4));
      const targetId = targetIdStr.readUIntBE(0, 4);
      const seVersionLength = data[4];
      let seVersion = Buffer.from(data.slice(5, 5 + seVersionLength)).toString();
      const flagsLength = data[5 + seVersionLength];
      let flags = Buffer.from(
        data.slice(5 + seVersionLength + 1, 5 + seVersionLength + 1 + flagsLength),
      );

      const mcuVersionLength = data[5 + seVersionLength + 1 + flagsLength];
      let mcuVersion = Buffer.from(
        data.slice(
          7 + seVersionLength + flagsLength,
          7 + seVersionLength + flagsLength + mcuVersionLength,
        ),
      );
      if (mcuVersion[mcuVersion.length - 1] === 0) {
        mcuVersion = mcuVersion.slice(0, mcuVersion.length - 1);
      }
      mcuVersion = mcuVersion.toString();

      if (!seVersionLength) {
        seVersion = "0.0.0";
        flags = Buffer.allocUnsafeSlow(0);
        mcuVersion = "";
      }

      /* eslint-disable no-unused-vars, no-bitwise */
      const isOSU = seVersion.includes("-osu");
      const version = seVersion.replace("-osu", "");
      const m = seVersion.match(/([0-9]+.[0-9]+)(.[0-9]+)?(-(.*))?/);
      const [, majMin, , , providerName] = m || [];
      const providerId = PROVIDERS[providerName] || 1;
      const isBootloader = (targetId & 0xf0000000) !== 0x30000000;
      const flag = flags.length > 0 ? flags[0] : 0;
      const managerAllowed = Boolean(flag & ManagerAllowedFlag);
      const pin = Boolean(flag & PinValidatedFlag);
      /* eslint-enable */

      const [majorVersion, minorVersion, patchVersion] = (version || '').split('.');
      const [mcuMajorVersion, mcuMinorVersion] = (mcuVersion || '').split('.');


      // https://gist.github.com/TamtamHero/b7651ffe6f1e485e3886bf4aba673348
      // +-----------------+------------+
      // |    FirmWare     | Target ID  |
      // +-----------------+------------+
      // | Nano S <= 1.3.1 | 0x31100002 |
      // | Nano S 1.4.x    | 0x31100003 |
      // | Nano S 1.5.x    | 0x31100004 |
      // |                 |            |
      // | Blue 2.0.x      | 0x31000002 |
      // | Blue 2.1.x      | 0x31000004 |
      // | Blue 2.1.x V2   | 0x31010004 |
      // |                 |            |
      // | Nano X          | 0x33000004 |
      // |                 |            |
      // | MCU,any version | 0x01000001 |
      // +-----------------+------------+
      //
      //  Order matters -- high to low minTargetId
      const MODEL_RANGES = [
        {
          minTargetId: 0x33000004,
          model: "Nano X",
        },
        {
          minTargetId: 0x31100002,
          model: "Nano S",
        },
        {
          minTargetId: 0x31100002,
          model: "Blue",
        },
        {
          minTargetId: 0x01000001,
          model: "MCU",
        },
      ];
      let model = 'Unknown';
      if (targetId) {
        for (let i = 0; i < MODEL_RANGES.length; i++) {
          const range = MODEL_RANGES[i];
          if (targetId >= range.minTargetId) {
            model = range.model;
            break;
          }
        }
      }

      let spec = `${model} v${version} (MCU v${mcuVersion})`;
      // if (pin) {
      //   spec += " w/PIN";
      // }

      return {
        spec,
        model,
        version: {
          major: majorVersion,
          minor: minorVersion,
          patch: patchVersion,
          string: version,
        },
        mcuVersion: {
          major: mcuMajorVersion,
          minor: mcuMinorVersion,
          string: mcuVersion,
        },
        // pin,
      };

    } catch (e) {
      console.error(e);
      throw new Error("Unable to parse metadata from Ledger device.");
    }
  }

}

/**
 * Base class for interactions exporting information about an HD node
 * at a given BIP32 path.
 *
 * You may want to use `LedgerExportPublicKey` or
 * `LedgerExportExtendedPublicKey` directly.
 *
 * @extends {module:ledger.LedgerBitcoinInteraction}
 * @example
 * import {MAINNET} from "unchained-bitcoin";
 * import {LedgerExportHDNode} from "unchained-wallets";
 * const interaction = new LedgerExportHDNode({network: MAINNET, bip32Path: "m/48'/0'/0'/2'/0"});
 * const node = await interaction.run();
 * console.log(node);
 */
class LedgerExportHDNode extends LedgerBitcoinInteraction {

  /**
   * Requires a valid BIP32 path to the node to export.
   *
   * @param {object} options - options argument
   * @param {string} bip32Path - the BIP32 path for the HD node
   */
  constructor({bip32Path}) {
    super();
    this.bip32Path = bip32Path;
  }

  /**
   * Adds messages related to the warnings Ledger devices produce on various BIP32 paths.
   *
   * @returns {module:interaction.Message[]} messages for this interaction
   */
  messages() {
    return super.messages();
  }

  /**
   * Returns whether or not the Ledger device will display a warning
   * to the user about an unusual BIP32 path.
   *
   * A "usual" BIP32 path is exactly 5 segments long.  The segments
   * have the following constraints:
   *
   * - Segment 1: Must be equal to `44'`
   * - Segment 2: Can have any value
   * - Segment 3: Must be between `0'` and `100'`
   * - Segment 4: Must be equal to `0`
   * - Segment 5: Must be between `0 and 50000`
   *
   * Any other kind of path is considered unusual and will trigger the
   * warning.
   *
   * @returns {boolean} whether a BIP32 path warning will be displayed
   */
  hasBIP32PathWarning() {
    // 0 -> 44'
    // 1 -> anything
    // 2 -> 0' - 100'
    // 3 -> 0
    // 4 -> 0 - 50000
    const indices = bip32PathToSequence(this.bip32Path);
    const hardened0 = hardenedBIP32Index(0);
    const hardened44 = hardenedBIP32Index(44);
    const hardened100 = hardenedBIP32Index(100);
    if (indices.length !== 5) {
      return true;
    }
    if (indices[0] !== hardened44) {
      return true;
    }
    if (indices[2] < hardened0 || indices[2] > hardened100) {
      return true;
    }
    if (indices[3] !== 0) {
      return true;
    }
    if (indices[4] < 0 || indices[4] > 50000) {
      return true;
    }
    return false;
  }

  /**
   * See {@link https://github.com/LedgerHQ/ledgerjs/tree/master/packages/hw-app-btc#getwalletpublickey}.
   *
   * @returns {object} the HD node object.
   */
  run() {
    return this.withApp(async (app) => {
      return app.getWalletPublicKey(this.bip32Path);
    });
  }
}

/**
 * Returns the public key at a given BIP32 path.
 *
 * @extends {module:ledger.LedgerExportHDNode}
 * @example
 * import {LedgerExportPublicKey} from "unchained-wallets";
 * const interaction = new LedgerExportPublicKey({bip32Path: "m/48'/0'/0'/2'/0"});
 * const publicKey = await interaction.run();
 * console.log(publicKey);
 * // "03..."
 */
export class LedgerExportPublicKey extends LedgerExportHDNode {

  /**
   * Parses out and compresses the public key from the response of
   * `LedgerExportHDNode`.
   *
   * @returns {string} -- (compressed) public key in hex
   */
  async run() {
    const result = await super.run();
    return this.parsePublicKey((result || {}).publicKey);
  }

  /**
   * Compress the given public key.
   *
   * @param {string} publicKey - the uncompressed public key in hex
   * @returns {string} - the compressed public key in hex
   *
   */
  parsePublicKey(publicKey) {
    if (publicKey) {
      try {
        return compressPublicKey(publicKey);
      } catch (e) {
        console.error(e);
        throw new Error("Unable to compress public key from Ledger device.");
      }
    } else {
      throw new Error("Received no public key from Ledger device.");
    }
  }
}

/**
 * Class for wallet extended public key (xpub) interaction at a given BIP32 path.
 * @extends {module:ledger.LedgerExportHDNode}
 */
export class LedgerExportExtendedPublicKey extends LedgerExportHDNode {
  constructor({bip32Path, network}) {
    super({bip32Path});
    this.network = network;
  }

  messages() {
    return super.messages();
  }

  /**
   * Get fingerprint from parent pubkey. This is useful for generating xpubs
   * which need the fingerprint of the parent pubkey
   * @returns {string} fingerprint
   */
  async getFingerprint() {
    const pubkey = await this.getParentPublicKey();
    return getFingerprintFromPublicKey(pubkey);
  }

  getParentPublicKey() {
    return this.withApp(async (app) => {
      const parentPath = getParentPath(this.bip32Path);
      return (await app.getWalletPublicKey(parentPath)).publicKey;
    });
  }

  /**
   * Retrieve extended public key (xpub) from Ledger device for a given BIP32 path
   * @example
   * import {LedgerExportExtendedPublicKey} from "unchained-wallets";
   * const interaction = new LedgerExportExtendedPublicKey({network, bip32Path});
   * const xpub = await interaction.run();
   * console.log(xpub);
   * @returns {string} extended public key(xpub) for the BIP32 path of a given instance
   */
  async run() {
    const walletPublicKey = await super.run();
    const fingerprint = await this.getFingerprint();
    return deriveExtendedPublicKey(
      this.bip32Path,
      walletPublicKey.publicKey,
      walletPublicKey.chainCode,
      fingerprint,
      this.network,
    );
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
 * @extends {module:ledger.LedgerBitcoinInteraction}
 * @example
 * import {
 *   generateMultisigFromHex, TESTNET, P2SH,
 * } from "unchained-bitcoin";
 * import {LedgerSignMultisigTransaction} from "unchained-wallets";
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
 * const interaction = new LedgerSignMultisigTransaction({
 *   network: TESTNET,
 *   inputs,
 *   outputs,
 *   bip32Paths: ["m/45'/0'/0'/0", // add more, 1 per input],
 * });
 * const signature = await interaction.run();
 * console.log(signatures);
 * // ["ababab...", // 1 per input]
 */
export class LedgerSignMultisigTransaction extends LedgerBitcoinInteraction {

  /**
   * @param {object} options - options argument
   * @param {string} options.network - bitcoin network
   * @param {array<object>} options.inputs - inputs for the transaction
   * @param {array<object>} options.outputs - outputs for the transaction
   * @param {array<string>} options.bip32Paths - BIP32 paths
   */
  constructor({network, inputs, outputs, bip32Paths}) {
    super();
    this.network = network;
    this.inputs = inputs;
    this.outputs = outputs;
    this.bip32Paths = bip32Paths;
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
      level: WARNING,
      code: "ledger.sign.delay",
      text: `Your Ledger device may take up to several minutes to process a transaction with many inputs.`,
      preProcessingTime: this.preProcessingTime(),
      postProcessingTime: this.postProcessingTime(),
    });

    if (this.anySegwitInputs()) {

      messages.push({
        state: ACTIVE,
        level: INFO,
        code: "ledger.sign",
        version: "<1.6.0",
        text: `Your Ledger will ask you to "Confirm transaction" and display each output amount and address followed by the the fee amount.`,
        action: LEDGER_RIGHT_BUTTON,
      });

      messages.push({
        state: ACTIVE,
        level: INFO,
        code: "ledger.sign",
        version: ">=1.6.0",
        text: `Confirm each output on your Ledger device and approve the transaction.`,
        messages: [
          {
            text: `Your Ledger will ask you to "Review transaction".`,
            action: LEDGER_RIGHT_BUTTON,
          },
          {
            text: `For each output, your Ledger device will display the output amount...`,
            action: LEDGER_RIGHT_BUTTON,
          },
          {
            text: `...followed by the output address in several parts`,
            action: LEDGER_RIGHT_BUTTON,
          },
          {
            text: `Your Ledger will display the transaction fees.`,
            action: LEDGER_RIGHT_BUTTON,
          },
          {
            text: `Your Ledger will ask you to "Accept and send".`,
            action: LEDGER_BOTH_BUTTONS,
          },
        ],
      });

    } else {

      messages.push({
        state: ACTIVE,
        level: INFO,
        code: "ledger.sign",
        version: "<1.6.0",
        text: `Confirm each output on your Ledger device and approve the transaction.`,
        messages: [
          {
            text: `For each output, your Ledger will display the output amount and address for you to confirm.`,
            action: LEDGER_RIGHT_BUTTON,
          },
          {
            text: `Your Ledger will ask if you want to "Confirm the transaction".  Due to a bug in the Ledger software, your device may display the transaction fee as "UNKNOWN".`,
            action: LEDGER_RIGHT_BUTTON,
          },
        ],
      });

      messages.push({
        state: ACTIVE,
        level: INFO,
        code: "ledger.sign",
        version: ">=1.6.0",
        text: `Confirm each output on your Ledger device and approve the transaction.`,
        messages: [
          {
            text: `For each output, your Ledger will ask you to "Review output".`,
            action: LEDGER_RIGHT_BUTTON,
          },
          {
            text: `Your Ledger will display the output amount.`,
            action: LEDGER_RIGHT_BUTTON,
          },
          {
            text: `Your Ledger will display the output address in several parts.`,
            action: LEDGER_RIGHT_BUTTON,
          },
          {
            text: `Your Ledger will ask if you want to "Accept" the output.`,
            action: LEDGER_BOTH_BUTTONS,
          },
          {
            text: `Your Ledger will ask if you want to "Confirm the transaction".`,
            action: LEDGER_RIGHT_BUTTON,
          },
          {
            text: `Due to a bug in the Ledger software, your device will display the transaction fee as "UNKNOWN".`,
            action: LEDGER_RIGHT_BUTTON,
          },
          {
            text: `Your Ledger will ask you to "Accept and send".`,
            action: LEDGER_BOTH_BUTTONS,
          },
        ],
      });

    }

    return messages;
  }

  preProcessingTime() {
    // FIXME
    return 10;
  }

  postProcessingTime() {
    // FIXME
    return 10;
  }

  /**
   * See {@link https://github.com/LedgerHQ/ledgerjs/tree/master/packages/hw-app-btc#signp2shtransaction}.
   *
   * Input signatures produced will always have a trailing `...01`
   * {@link https://bitcoin.org/en/glossary/sighash-all SIGHASH_ALL}
   * byte.
   *
   * @returns {string[]} array of input signatures, one per input
   */
  run() {
    return this.withApp(async (app, transport) => {
      // FIXME: Explain the rationale behind this choice.
      transport.setExchangeTimeout(20000 * this.outputs.length);
      const transactionSignature = await app.signP2SHTransaction(
        this.ledgerInputs(),
        this.ledgerKeysets(),
        this.ledgerOutputScriptHex(),
        0, // locktime, 0 is no locktime
        1, // sighash type, 1 is SIGHASH_ALL
        this.anySegwitInputs(),
        1, // tx version
      );
      return (transactionSignature || []).map((inputSignature) => (inputSignature.endsWith('01') ? inputSignature : `${inputSignature}01`));
    });
  }

  ledgerInputs() {
    return this.inputs.map(input => {
      const addressType = multisigAddressType(input.multisig);
      const inputTransaction = splitTransaction(input.transactionHex, true); // FIXME: should the 2nd parameter here always be true?
      const scriptFn = (addressType === P2SH ? multisigRedeemScript : multisigWitnessScript);
      const scriptHex = scriptToHex(scriptFn(input.multisig));
      return [inputTransaction, input.index, scriptHex]; // can add sequence number for RBF as an additional element
    });
  }

  ledgerKeysets() {
    return this.bip32Paths.map((bip32Path) => this.ledgerBIP32Path(bip32Path));
  }

  ledgerOutputScriptHex() {
    // This seems like an inefficient way to achieve the final
    // result...
    let txTmp = new bitcoin.TransactionBuilder();
    txTmp.setVersion(1);
    if (this.network === TESTNET) {
      txTmp.network = bitcoin.networks.testnet;
    }
    for (let i = 0; i < this.outputs.length; i++) {
      txTmp.addOutput(this.outputs[i].address, new BigNumber(this.outputs[i].amountSats).toNumber());
    }
    for (let j = 0; j < this.inputs.length; j++) {
      txTmp.addInput(this.inputs[j].txid, this.inputs[j].index);
    }

    const txToSign = txTmp.buildIncomplete();
    const txHex = txToSign.toHex();
    const splitTx = splitTransaction(txHex, this.anySegwitInputs());
    return serializeTransactionOutputs(splitTx).toString('hex');
  }

  ledgerBIP32Path(bip32Path) {
    return bip32Path.split("/").slice(1).join("/");
  }

  anySegwitInputs() {
    for (let i = 0; i < this.inputs.length; i++) {
      const input = this.inputs[i];
      const addressType = multisigAddressType(input.multisig);
      if (addressType === P2SH_P2WSH || addressType === P2WSH) {
        return true;
      }
    }
    return false;
  }

}

/**
 * @module trezor
 */
import BigNumber from "bignumber.js";
import {
  NETWORKS,
  bip32PathToSequence,
  multisigPublicKeys,
  multisigRequiredSigners,
  multisigAddressType,
  MULTISIG_ADDRESS_TYPES,
  P2SH,
  P2SH_P2WSH,
  P2WSH,
} from "unchained-bitcoin";

import {
  WalletInteraction,
  PENDING,
  ACTIVE,
  INFO,
  ERROR,
  WARNING,
} from "./interaction";

export const TREZOR = 'trezor';

const TrezorConnect = require("trezor-connect").default;

TrezorConnect.manifest({email: "foo@bar.com", appUrl: "https://localhost:3000"});

/**
 * Interaction with Trezor hardware wallets
 * @extends {module:interaction.WalletInteraction}
 */
export class TrezorInteraction extends WalletInteraction {

  /**
   * @param {object} options
   * @param {string} options.network - bitcoin network
   */
  constructor({network}) {
    super();
    this.network = network;
    this.trezorCoin = coin(network);
  }

  // installInstructions() {
  //   return ["Make sure you have installed the Trezor bridge software.  Test your installation at https://trezor.io/start"];
  // }

  messages() {
    const messages = super.messages();
    messages[PENDING].push({level: INFO, text: "Make sure your Trezor hardware wallet is plugged in.", code: "trezor.device.connect"});
    messages[ACTIVE].push({level: INFO, text: "Your browser should open a new Trezor Connect window.  If you do not see this window, ensure you have enabled popups for this site.", code: "trezor.popup.generic"});
    return messages;
  }

}

/**
 * Class for retrieving Trezor device metadata.
 * @extends {module:trezor.TrezorInteraction}
 */
export class TrezorGetMetadata extends TrezorInteraction {

  constructor() {
    super({});
  }

  /**
   * Retrieve and parse features from Trezor device
   * @override
   * @example
   * const interaction = new TrezorGetMetadata();
   * const result = await interaction.run();
   * console.log(result);
   * // 
   * @returns {object} object containing metadata about the Trezor device
   */
  async run() {
    const result = await TrezorConnect.getFeatures();
    if (!result.success) {
      throw new Error(result.payload.error);
    }
    return this.parseMetadata(result.payload);
  }

  parseMetadata(payload) {
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
      major_version, minor_version, patch_version,
      label,
      model,
      pin_protection, passphrase_protection,
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
      model: model,
      version: {
        major: major_version,
        minor: minor_version,
        patch: patch_version,
      },
      label,
      pin: pin_protection,
      passphrase: passphrase_protection,
    };
  }

}


/**
 * Class for wallet interaction at a given BIP32 path.
 * @extends {module:trezor.TrezorInteraction}
 */
export class TrezorExportHDNode extends TrezorInteraction {

  /**
   *
   * @param {object} options
   * @param {string} options.network - bitcoin network
   * @param {string} bip32Path - the BIP32 path from which to retrieve public key
   * @example
   * const trezorNode = new TrezorExportHDNode({network: "mainnet", bip32Path: "m/48'/0'/0'/2'/0"})
   */
  constructor({network, bip32Path}) {
    super({network});
    this.bip32Path = bip32Path;
  }

  messages() {
    const messages = super.messages();

    const bip32PathSegments = (this.bip32Path || '').split('/');
    if (bip32PathSegments.length < 4) { // m, 45', 0', 0', ...
      messages[PENDING].push({level: ERROR, text: "BIP32 path must be at least depth 3.", code: "trezor.bip32_path.minimum"});
    } else {
      const coinPath = bip32PathSegments[2];
      if (this.network === NETWORKS.MAINNET) {
        if (! coinPath.match(/^0'/)) {
          messages[ACTIVE].push({level: WARNING, text: "On Trezor model T the screen may display a 'Confirm path' warning message.", code: "trezor.bip32_path.mismatch"});
        }
      }
      if (this.network === NETWORKS.TESTNET) {
        if (! coinPath.match(/^1'/)) {
          messages[ACTIVE].push({level: WARNING, text: "On Trezor model T the screen may display a 'Confirm path' warning message.'", code: "trezor.bip32_path.mismatch"});
        }
      }
    }

    messages[ACTIVE].push({level: INFO, text: "Confirm in the Trezor Connect window that you want to 'Export public key'.  You may be prompted to enter your PIN.", code: "trezor.popup.export_hdnode"});

    return messages;
  }

  /**
   * Retrieve key from Trezor device for a given instance
   * @override
   * @example
   * const trezorNode = new TrezorExportHDNode({network: "mainnet", bip32Path: "m/48'/0'/0'/2'/0"});
   * const result = await trezorNode.run();
   * console.log(result.publicKey);
   * @returns {object} object containing public key and extended public key for the BIP32 path of a given instance
   */
  async run() {
    const result = await TrezorConnect.getPublicKey({
      path: this.bip32Path,
      coin: this.trezorCoin,
      crossChain: true,
    });
    if (!result.success) {
      throw new Error(result.payload.error);
    }
    return result.payload;
  }

}

/**
 * Class for wallet public key interaction at a given BIP32 path.
 * @extends {module:trezor.TrezorExportHDNode}
 */
export class TrezorExportPublicKey extends TrezorExportHDNode {

  /**
   * Retrieve public key from Trezor device for a given instance
   * @example
   * const trezorNode = new TrezorExportPublicKey({network: "mainnet", bip32Path: "m/48'/0'/0'/2'/0"});
   * const publicKey = await trezorNode.run();
   * console.log(publicKey);
   * @returns {string} public key for the BIP32 path of a given instance
   */
  async run() {
    const payload = await super.run();
    return payload.publicKey;
  }

}

/**
 * Class for wallet extended public key interaction at a given BIP32 path.
 * @extends {module:trezor.TrezorExportHDNode}
 */
export class TrezorExportExtendedPublicKey extends TrezorExportHDNode {

  /**
   * Retrieve extended public key from Trezor device for a given instance
   * @example
   * const trezorNode = new TrezorExportExtendedPublicKey({network: "mainnet", bip32Path: "m/48'/0'/0'/2'/0"});
   * const xpub = await trezorNode.run();
   * console.log(xpub);
   * @returns {string} extended public key for the BIP32 path of a given instance
   */
  async run() {
    const payload = await super.run();
    return payload.xpub;
  }

}

/**
 * Class for wallet signing interaction.
 * @extends {module:trezor.TrezorInteraction}
 */
export class TrezorSignMultisigTransaction extends TrezorInteraction {

  /**
   * @param {object} options
   * @param {string} options.network - bitcoin network
   * @param {array<object>} options.inputs - inputs for the transaction
   * @param {array<object>} options.outputs - outputs for the transaction
   * @param {array<string>} options.bip32Paths - BIP32 paths
   */
  constructor({network, inputs, outputs, bip32Paths}) {
    super({network});
    this.inputs = inputs;
    this.outputs = outputs;
    this.bip32Paths = bip32Paths;
  }

  messages() {
    const messages = super.messages();
    messages[ACTIVE].push({level: INFO, text: `Confirm in the Trezor Connect window that you want to 'Sign ${this.network} transaction'.  You may be prompted to enter your PIN.`, code: "trezor.popup.sign"});
    messages[ACTIVE].push({level: INFO, text: `You Trezor device will ask you to confirm each output address above with its corresponding output amount.  Check each address and amount carefully against both the values displayed in this application and your own expectations.`, code: "trezor.signing.outputs"});
    messages[ACTIVE].push({level: INFO, text: `Finally, your Trezor device will ask you to confirm the overall transaction output amount and fee.  Check both carefully against both the values displayed in this application and your own expectations.`, code: "trezor.signing.final"});
    return messages;
  }

  /**
   * Retrieve extended public key from Trezor device for a given instance
   * @example
   * import {generateMultisigFromHex, NETWORKS, MULTISIG_ADDRESS_TYPES} from "unchained-bitcoin";
   * ...
   * const input = {
   *     txid: "8d276c76b3550b145e44d35c5833bae175e0351b4a5c57dc1740387e78f57b11",
   *     index: 1,
   *     multisig: generateMultisigFromHex(NETWORKS.TESTNET, MULTISIG_ADDRESS_TYPES.P2SH, redeemScript),
   *     amountSats: BigNumber(1234000)
   * }
   * const output = {
   *     amountSats: BigNumber(1299659),
   *     address: "2NGHod7V2TAAXC1iUdNmc6R8UUd4TVTuBmp"
   * }
   * const trezorSigner = new TrezorSignMultisigTransaction({
   *   network: "testnet",
   *   inputs: [input],
   *   outputs: [output],
   *   bip32Paths: ["m/45'/0'/0'/0"]
   * });
   * const signatures = await trezorSigner.run();
   * console.log(signatures);
   * @returns {string} string representation of an array of signatures
   */
  async run() {
    const trezorInputs = this.inputs.map((input, inputIndex) => trezorInput(input, this.bip32Paths[inputIndex]));
    const trezorOutputs = this.outputs.map((output) => trezorOutput(output));
    const transaction = {
      inputs: trezorInputs,
      outputs: trezorOutputs,
      coin: this.trezorCoin,
    };
    const result = await TrezorConnect.signTransaction(transaction);
    if (!result.success) {
      throw new Error(result.payload.error);
    }
    return result.payload.signatures;
  }

}

/**
 * Retrieve Trezor format for network constant
 * @param {string} network - bitcoin network
 * @private
 * @returns {string} Trezor format of bitcoin network
 */
function coin(network) {
  return (network === NETWORKS.MAINNET ? "Bitcoin" : "Testnet");
}

const addressScriptTypes = {
  [MULTISIG_ADDRESS_TYPES.P2WSH]: 'SPENDWITNESS',
  [MULTISIG_ADDRESS_TYPES.P2SH]: 'SPENDMULTISIG',
  [MULTISIG_ADDRESS_TYPES.P2SH_P2WSH]: 'SPENDP2SHWITNESS',
}
function trezorInput(input, bip32Path) {
  const requiredSigners = multisigRequiredSigners(input.multisig);
  const addressType = multisigAddressType(input.multisig)
  const spendType = addressScriptTypes[addressType]
  return {
    script_type: spendType,
    multisig: {
      m: requiredSigners,
      pubkeys: multisigPublicKeys(input.multisig).map((publicKey) => trezorPublicKey(publicKey)),
      signatures: Array(requiredSigners).fill(''),
    },
    prev_hash: input.txid,
    prev_index: input.index,
    address_n: bip32PathToSequence(bip32Path),
    amount: new BigNumber(input.amountSats).toString()
  };
}

/**
 * Retrieve Trezor formatted input object
 * @param {string} publicKey
 * @private
 * @returns {object} Trezor formatted input
 */
function trezorPublicKey(publicKey) {
  return {
    address_n: [],
    node: {
      // FIXME are all these 0's OK?
      depth: 0,
      child_num: 0,
      fingerprint: 0,
      chain_code: '0'.repeat(64),
      public_key: publicKey,
    },
  };
}

/**
 * Retrieve Trezor formatted output object
 * @param {object} output
 * @private
 * @returns {object} Trezor formatted output
 */
function trezorOutput(output) {
  return {
    amount: new BigNumber(output.amountSats).toFixed(0),
    address: output.address,
    script_type: 'PAYTOADDRESS',
  };
}

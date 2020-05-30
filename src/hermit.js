/**
 * Provides classes for interacting with a Hermit installation through
 * QR codes.
 *
 * The base classes provided are `HermitDisplayer` and `HermitReader`
 * for displaying & reading a QR code to/from Hermit, respectively.
 * Functions `parseHermitQRCodeData` and `encodeHermitQRCodeData`
 * handle the Hermit QR-code data protocol.
 *
 * The following API classes are implemented:
 *
 * * HermitExportPublicKey
 * * HermitExportExtendedPublicKey
 * * HermitSignMultisigTransaction
 *
 * @module hermit
 */
import base32 from "hi-base32";
import pako from "pako";
import BigNumber from "bignumber.js";
import {
  scriptToHex,
  multisigRedeemScript,
  multisigAddressType,
  MULTISIG_ADDRESS_TYPES,
} from "unchained-bitcoin";
import {
  IndirectKeystoreInteraction,
  PENDING,
  ACTIVE,
  INFO,
  ERROR,
  UNSUPPORTED,
} from "./interaction";

export const HERMIT = 'hermit';

/**
 * Parse the data from a Hermit-created QR-code.
 *
 * @param {string} encodedString - base32-encoded, gzipped, JSON data
 * @returns {object} the parsed data
 */
export function parseHermitQRCodeData(encodedString) {
  const errorPrefix = "Unable to parse QR code";
  try {
    const compressedBytes = base32.decode.asBytes(encodedString);
    try {
      const json = pako.inflate(compressedBytes, {to: 'string'});
      try {
        return JSON.parse(json);
      } catch (e) {
        throw new Error(`${errorPrefix} (JSON parse error)`);
      }
    } catch (e) {
      if (e.message && e.message.startsWith(errorPrefix)) {
        throw(e);
      } else {
        throw new Error(`${errorPrefix} (gzip decompression error)`);
      }
    }
  } catch (e) {
    if (e.message && e.message.startsWith(errorPrefix)) {
      throw(e);
    } else {
      throw new Error(`${errorPrefix} (Base32 decode error)`);
    }
  }
}

/**
 * Encode the given `data` as a string to be put into a
 * Hermit-readable QR code.
 *
 * @param {object} data plain JavaScript object to encode
 * @returns {string} base32-encoded, gzipped, JSON data
 */
export function encodeHermitQRCodeData(data) {
  const errorPrefix = "Unable to create QR code";
  try {
    const jsonString = JSON.stringify(data);
    try {
      const compressedBytes = pako.deflate(jsonString, {gzip: true});
      try {
        return base32.encode(compressedBytes);
      } catch (e) {
        throw new Error(`${errorPrefix} (Base32 encode error)`);
      }
    } catch (e) {
      if (e.message && e.message.startsWith(errorPrefix)) {
        throw(e);
      } else {
        throw new Error(`${errorPrefix} (gzip compression error)`);
      }
    }
  } catch (e) {
    if (e.message && e.message.startsWith(errorPrefix)) {
      throw(e);
    } else {
      throw new Error(`${errorPrefix} (JSON encode error)`);
    }
  }
}

function commandMessage(data) {
  return {
    ...{
      state: PENDING,
      level: INFO,
      code: "hermit.command",
      mode: "wallet",
    },
    ...{text: `${data.instructions} '${data.command}'`},
    ...data,
  };
}

/**
 * Base class for interactions with Hermit.
 *
 * @extends {module:interaction.IndirectKeystoreInteraction}
 */
export class HermitInteraction extends IndirectKeystoreInteraction {
}

/**
 * Base class for interactions which read a QR code displayed by a
 * Hermit command.
 *
 * @extends {module:hermit.HermitInteraction}
 */
export class HermitReader extends HermitInteraction {

  constructor() {
    super();
    this.reader = true;
  }

  messages() {
    const messages = super.messages();
    messages.push({
      state: ACTIVE,
      level: INFO,
      code: "hermit.scanning",
      text: "Scan Hermit QR code now.",
    });
    return messages;
  }

}

/**
 * Base class for interactions which display data as a QR code for
 * Hermit to read and then read the QR code Hermit displays in
 * response.
 *
 * @extends {module:hermit.HermitInteraction}
 */
export class HermitDisplayer extends HermitReader {

  constructor() {
    super();
    this.displayer = true;
  }

}


/**
 * Reads a public key from data in a Hermit QR code.
 *
 * @extends {module:hermit.HermitReader}
 * @example
 * const interaction = new HermitExportPublicKey();
 * const encodedString = readHermitQRCode(); // application dependent
 * const {pubkey, bip32Path} = interaction.parse(encoodedString);
 * console.log(pubkey);
 * // "03..."
 * console.log(bip32Path);
 * // "m/45'/0'/0'/0/0"
 */
export class HermitExportPublicKey extends HermitReader {

  constructor({bip32Path}) {
    super();
    this.bip32Path = bip32Path;
  }

  messages() {
    const messages = super.messages();
    messages.push(commandMessage({
      instructions: "Run the following Hermit command, replacing the BIP32 path if you need to:",
      command: `export-pub ${this.bip32Path}`,
    }));
    return messages;
  }

  parse(encodedString) {
    const result = parseHermitQRCodeData(encodedString);
    const {xpub, pubkey} = result;
    const bip32Path = result.bip32_path;
    if (!pubkey) {
      if (xpub) {
        throw new Error("Make sure you export a plain public key and NOT an extended public key.");
      } else {
        throw new Error("No public key in QR code.");
      }
    }
    if (!bip32Path) {
      throw new Error("No BIP32 path in QR code.");
    }
    result.bip32Path = bip32Path;
    Reflect.deleteProperty(result, "bip32_path");
    return result;
  }

}

/**
 * Reads an extended public key from data in a Hermit QR code.
 *
 * @extends {module:hermit.HermitReader}
 * @example
 * const interaction = new HermitExportExtendedPublicKey();
 * const encodedString = readHermitQRCode(); // application dependent
 * const {xpub, bip32Path} = interaction.parse(encoodedString);
 * console.log(xpub);
 * // "xpub..."
 * console.log(bip32Path);
 * // "m/45'/0'/0'"
 */
export class HermitExportExtendedPublicKey extends HermitReader {

  constructor({bip32Path}) {
    super();
    this.bip32Path = bip32Path;
  }

  messages() {
    const messages = super.messages();
    messages.push(commandMessage({
      instructions: "Run the following Hermit command, replacing the BIP32 path if you need to:",
      command: `export-xpub ${this.bip32Path}`,
    }));
    return messages;
  }

  parse(encodedString) {
    const result = parseHermitQRCodeData(encodedString);
    const {xpub, pubkey} = result;
    const bip32Path = result.bip32_path;

    if (!xpub) {
      if (pubkey) {
        throw new Error("Make sure you export an extended public key and NOT a plain public key.");
      } else {
        throw new Error("No extended public key in QR code.");
      }
    }
    if (!bip32Path) {
      throw new Error("No BIP32 path in QR code.");
    }
    result.bip32Path = bip32Path;
    Reflect.deleteProperty(result, "bip32_path");
    return result;
  }

}

/**
 * Returns signature request data to display in a QR code for Hermit
 * and reads the signature data passed back by Hermit in another QR
 * code.
 *
 * NOTE: Transactions with inputs & outputs to non-P2SH addresses are not supported by Hermit.
 *
 * @extends {module:hermit.HermitDisplayer}
 * @example
 * const interaction = new HermitSignTransaction({inputs, outputs, bip32Paths});
 * console.log(interaction.request());
 * // "IJQXGZI..."
 *
 * // Display a QR code containing the above data to Hermit running
 * // `sign-bitcoin` and it will return another QR code which needs
 * // parsed.
 * const encodedString = readHermitQRCode(); // application dependent
 * const signatures = interaction.parse(encoodedString);
 * console.log(signatures);
 * // ["ababa...01", ... ]
 *
 */
export class HermitSignTransaction extends HermitDisplayer {

  /**
   *
   * @param {object} options - options argument
   * @param {array<object>} options.inputs - inputs for the transaction
   * @param {array<object>} options.outputs - outputs for the transaction
   * @param {array<string>} options.bip32Paths - BIP32 paths
   */
  constructor({inputs, outputs, bip32Paths}) {
    super();
    this.inputs = inputs;
    this.outputs = outputs;
    this.bip32Paths = bip32Paths;
    this.inputAddressType = '';

  }

  isSupported() {
    return this.inputsAreSupported() && this.outputsAreSupported();
  }

  outputsAreSupported() {
    if (this.outputs && this.outputs.length) {
      for (let i = 0; i < this.outputs.length; i++) {
        const output = this.outputs[i];
        if (output.address.match(/^(tb|bc)/)) {
          return false;
        }
      }
    }
    return true;
  }

  inputsAreSupported() {
    if (this.inputs && this.inputs.length) {
      for (let i = 0; i < this.inputs.length; i++) {
        const input = this.inputs[i];
        const inputAddressType = multisigAddressType(input.multisig);

        if (inputAddressType !== MULTISIG_ADDRESS_TYPES.P2SH) {
          this.inputAddressType = inputAddressType;
          return false;
        }
      }
    }
    return true;
  }

  messages() {
    const messages = super.messages();

    if (!this.inputsAreSupported()) {
      messages.push({
        state: UNSUPPORTED,
        level: ERROR,
        code: "hermit.unsupported.inputaddress",
        text: `Unsupported input address type ${this.inputAddressType}, must be P2SH.`,
      });
    }

    if (!this.outputsAreSupported()) {
      messages.push({
        state: UNSUPPORTED,
        level: ERROR,
        code: "hermit.unsupported.outputaddress",
        text: `Unsupported output address type. bech32 addresses are unsupported.`,
      });
    }

    if (!this.inputsAreSupported() || !this.outputsAreSupported()) return messages;
    messages.push(commandMessage({
      instructions: "Scan this QR code into Hermit by running the following command:",
      command: "sign-bitcoin",
    }));
    return messages;
  }

  request() {
    const data = this.signatureRequestData();
    return encodeHermitQRCodeData(data);
  }

  signatureRequestData() {
    const hermitInputsByRedeemScript = {};
    for (let i = 0; i < this.inputs.length; i++) {
      const input = this.inputs[i];
      const bip32Path = this.bip32Paths[i];
      const redeemScriptHex = scriptToHex(multisigRedeemScript(input.multisig));
      if (!hermitInputsByRedeemScript[redeemScriptHex]) {
        hermitInputsByRedeemScript[redeemScriptHex] = [redeemScriptHex, bip32Path];
      }
      hermitInputsByRedeemScript[redeemScriptHex].push({
        txid: input.txid,
        index: input.index,
        amount: new BigNumber(input.amountSats).toNumber(),
      });
    }
    return {
      inputs: Object.values(hermitInputsByRedeemScript),
      outputs: this.outputs.map((output) => ({
        address: output.address,
        amount: new BigNumber(output.amountSats).toNumber(),
      })),
    };
  }

  parse(encodedString) {
    const result = parseHermitQRCodeData(encodedString);
    const {signatures} = result;
    if ((!signatures) || signatures.length === 0) {
      throw new Error("No signatures in QR code.");
    }
    return (signatures || []).map((inputSignature) => (`${inputSignature}01`));
  }

}

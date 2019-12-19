/**
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
  WalletInteraction,
  PENDING,
  ACTIVE,
  INFO,
  ERROR,
  UNSUPPORTED,
} from "./interaction";

export const HERMIT = 'hermit';

/**
 * Interaction with Hermit (SLIP39) sharded wallet
 * @extends {module:interaction.WalletInteraction}
 */
export class HermitInteraction extends WalletInteraction {

  //
  // Encoded string from QR code => JavaScript Object
  //

  _parseQRCodeData(encodedString) {
    try {
      const compressedBytes = base32.decode.asBytes(encodedString);
      return this._decompressAndParseJSON(compressedBytes);
    } catch(base32DecodingError) {
      throw new Error("Unable to parse QR code (Base32 decode error).");
    }
  }

  _decompressAndParseJSON(compressedBytes) {
    try {
      const decompressedJSON = pako.inflate(compressedBytes, {to: 'string'});
      return this._parseJSON(decompressedJSON);
    } catch(decompressError) {
      throw new Error("Unable to parse QR code (gzip decompress error).");
    }
  }

  _parseJSON(json) {
    try {
      return JSON.parse(json);
    } catch(parseJSONError) {
      throw new Error("Unable to parse QR code (JSON parse error).");
    }
  }

  //
  // JavaScript object => encoded string for QR code
  //

  _encodeQRCodeData(data) {
    try {
      const jsonString = JSON.stringify(data);
      return this._compressAndBase32Encode(jsonString);
    } catch (encodeJSONError) {
      console.error(encodeJSONError);
      throw new Error("Unable to create QR code (JSON encode error).");
    }
  }

  _compressAndBase32Encode(jsonString) {
    try {
      const compressedBytes = pako.deflate(jsonString, {gzip: true});
      return this._base32Encode(compressedBytes);
    } catch(compressionError) {
      console.error(compressionError);
      throw new Error("Unable to create QR code (gzip compress error).");
    }
  }

  _base32Encode(compressedBytes) {
    try {
      const encodedData = base32.encode(compressedBytes);
      return encodedData;
    } catch(base32EncodingError) {
      console.error(base32EncodingError);
      throw new Error("Unable to create QR code (Base32 encode error).");
    }
  }

  async run() {
    throw new Error("Hermit interactions do not support a `run` method.");
  }

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
    messages[ACTIVE].push({
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
  
  /**
   * Returns the data to display in a QR code to Hermit.
   * 
   * @returns {string} the data to display as a QR code
   */
  request() {
    throw new Error("Override the method `request` in a subclass of `HermitDisplayer`.");
  }

}


/**
 * Class for wallet public key interaction for use with QR scanner
 * @extends {module:hermit.HermitExport}
 */
export class HermitExportPublicKey extends HermitReader {

  /**
   * @example
   * const hermitKeyExporter = new HermitExportPublicKey()
   */
  constructor({bip32Path}) {
    super();
    this.bip32Path = bip32Path;
  }

  messages() {
    const messages = super.messages();
    const instructions = "Run the following Hermit command, replacing the BIP32 path if you need to:";
    const mode = "wallet";
    const command = `export-pub ${this.bip32Path}`;
    messages[PENDING].push({
      level:INFO,
      code: "hermit.command",
      instructions,
      mode,
      command,
      text: `${instructions} '${command}'`
    });

    return messages;
  }

  /**
   * Convert base64 encoded QR code to public key and BIP32 path
   * @param {string} encodedString - base64 encoded QR code from Hermit
   * @returns {object} public key and BIP32 path
   * @example
   * const keyInfo = hermitKeyExporter.run();
   * console.log(keyInfo);
   * // {pubkey:"...", bip32Path:"m/48'..."}
   */
  parse(encodedString) {
    const result = this._parseQRCodeData(encodedString);
    const {xpub, pubkey} = result;
    if (!pubkey) {
      if (xpub) {
        throw new Error("Make sure you export a plain public key and NOT an extended public key.");
      } else {
        throw new Error("Did not receive a public key.");
      }
    }
    return result;
  }

}

/**
 * Class for wallet extended public key interaction for use with QR scanner
 * @extends {module:hermit.HermitExport}
 */
export class HermitExportExtendedPublicKey extends HermitReader {

  constructor({bip32Path}) {
    super();
    this.bip32Path = bip32Path;
  }

  messages() {
    const messages = super.messages();
    const instructions = "Run the following Hermit command, replacing the BIP32 path if you need to:";
    const mode = "wallet";
    const command = `export-xpub ${this.bip32Path}`;
    messages[PENDING].push({
      level:INFO,
      code: "hermit.command",
      instructions,
      mode,
      command,
      text: `${instructions} '${command}'`
    });

    return messages;
  }

  /**
   * Convert base64 encoded QR code to an extended public key and BIP32 path
   * @param {string} encodedString - base64 encoded QR code from Hermit
   * @returns {object} extended public key and BIP32 path
   * @example
   * const keyInfo = hermitKeyExporter.parse();
   * console.log(keyInfo);
   * // {xpub:"...", bip32Path:"m/48'/..."}
   */
  parse(encodedString) {
    const result = this._parseQRCodeData(encodedString);
    const {xpub, pubkey} = result;
    if (!xpub) {
      if (pubkey) {
        throw new Error("Make sure you export an extended public key and NOT a plain public key.");
      } else {
        throw new Error("Did not receive an extended public key.");
      }
    }
    return result;
  }

}

/**
 * @extends {module:hermit.HermitExport}
 */
export class HermitSignTransaction extends HermitDisplayer {

  /**
   *
   * @param {object} options
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

  /**
   * Determine if a transaction is supported by Hermit signing
   * @override
   * @returns {boolean}
   */
  isSupported() {
    return this.inputsAreSupported() && this.outputsAreSupported();
  }

  /**
   * @private
   */
  outputsAreSupported() {
    if (this.outputs && this.outputs.length) {
      for (let i=0; i < this.outputs.length; i++) {
        const output = this.outputs[i];
        if (output.address.match(/^(tb|bc)/)) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * @private
   */
  inputsAreSupported() {
    if (this.inputs && this.inputs.length) {
      for (let i=0; i < this.inputs.length; i++) {
        const input = this.inputs[i];
        const inputAddressType = multisigAddressType(input.multisig);

        if (inputAddressType !== MULTISIG_ADDRESS_TYPES.P2SH) {
          this.inputAddressType = inputAddressType
          return false;
        }
      }
    }
    return true;
  }

  messages() {
    const messages = super.messages();

    if (!this.inputsAreSupported()) {
      messages[UNSUPPORTED].push({
        level: ERROR,
        code: "hermit.unsupported.inputaddress",
        text: `Unsupported input address type ${this.inputAddressType}, must be P2SH.`
      });
    }

    if (!this.outputsAreSupported()) {
      messages[UNSUPPORTED].push({
        level: ERROR,
        code: "hermit.unsupported.outputaddress",
        text: `Unsupported output address type. bech32 addresses are unsupported.`
      });
    }

    if (!this.inputsAreSupported() || !this.outputsAreSupported()) return messages;

    const instructions = "Scan this QR code into Hermit by running the following command:";
    const mode = "wallet";
    const command = "sign-bitcoin";
    messages[PENDING].push({
      level: INFO,
      code: "hermit.command",
      instructions,
      mode,
      command,
      text: `${instructions} '${command}'`
    });

    return messages;
  }

  signatureRequestData() {
    const hermitInputsByRedeemScript = {};
    for (let i=0; i < this.inputs.length; i++) {
      const input = this.inputs[i];
      const bip32Path = this.bip32Paths[i];
      const redeemScriptHex = scriptToHex(multisigRedeemScript(input.multisig));
      if (! hermitInputsByRedeemScript[redeemScriptHex]) {
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

  /**
   * Signature request data.
   * 
   */
  request() {
    const data = this.signatureRequestData();
    return this._encodeQRCodeData(data);
  }

  /**
   * Retrieve signatures from Hermit generated QR code for a given transaction
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
   * const hermitSigner = new HermitSignTransaction({
   *   inputs: [input],
   *   outputs: [output],
   *   bip32Paths: ["m/45'/0'/0'/0"]
   * });
   * const signatures = await hermitSigner.parse();
   * console.log(signatures);
   * @returns {string} string representation of an array of signatures
   */
  parse(encodedString) {
    const result = this._parseQRCodeData(encodedString);
    const {signatures} = result;
    return signatures;
  }

}

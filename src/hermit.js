import base32 from "hi-base32";
import pako from "pako";
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

}

export class HermitExport extends HermitInteraction {

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

export class HermitExportPublicKey extends HermitExport {

  constructor({network, bip32Path}) {
    super({network});
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

  parse(encodedString) {
    const result = this._parseQRCodeData(encodedString);
    const {xpub, pubkey, bip32_path} = result;
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

export class HermitExportExtendedPublicKey extends HermitExport {

  constructor({network, bip32Path}) {
    super({network});
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

  parse(encodedString) {
    const result = this._parseQRCodeData(encodedString);
    const {xpub, pubkey, bip32_path} = result;
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

export class HermitSignTransaction extends HermitExport {

  constructor({network, inputs, outputs, bip32Paths}) {
    super({network});
    this.inputs = inputs;
    this.outputs = outputs;
    this.bip32Paths = bip32Paths;
    this.supported = true;
    this.inputAddressType = '';

  }

  isSupported() {
    return this.inputsAreSupported() && this.outputsAreSupported();
  }

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
    return true
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

    const data = this.signatureRequestData();
    const encodedData = this._encodeQRCodeData(data);

    messages[PENDING].push({
      level: INFO,
      code: "hermit.signature_request",
      data,
      encodedData,
      text: "Signature Request",
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
        amount: input.amountSats.toNumber(),
      });
    }
    return {
      inputs: Object.values(hermitInputsByRedeemScript),
      outputs: this.outputs.map((output) => ({
        address: output.address, 
        amount: output.amountSats.toNumber(),
      })),
    };
  }

  parse(encodedString) {
    const result = this._parseQRCodeData(encodedString);
    const {signatures} = result;
    return signatures;
  }
  
}

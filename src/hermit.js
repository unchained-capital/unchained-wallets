/**
 * Provides classes for interacting with Hermit.
 *
 * Hermit uses the Blockchain Commons UR encoding for data IO with
 * individual UR parts represented as QR codes.
 *
 * When receiving data from Hermit, calling applications are
 * responsible for parsing UR parts from the animated sequence of QR
 * codes Hermit displays.  The `BCURDecode` class is designed to make
 * this easy.
 *
 * When sending data to Hermit, these interaction classes encode the
 * data into UR parts.  Calling applications are responsible for
 * displaying these UR parts as an animated QR code sequence.
 *
 * The following API classes are implemented:
 *
 * * HermitExportPublicKey
 * * HermitExportExtendedPublicKey
 * * HermitSignMultisigTransaction
 *
 * @module hermit
 */
import {
  toHexString,
} from "unchained-bitcoin";
import {
  IndirectKeystoreInteraction,
  PENDING,
  ACTIVE,
  INFO,
  ERROR,
  UNSUPPORTED,
} from "./interaction";
import {BCUREncoder, BCURDecoder} from "./bcur";

export const HERMIT = 'hermit';

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

  constructor() {
    super();
  }

  messages() {
    const messages = super.messages();
    messages.push({
      state: ACTIVE,
      level: INFO,
      code: "hermit.scanning",
      text: "Scan Hermit QR code sequence now.",
    });
    return messages;
  }

  /**
   * Return a new `BCURDecoder` instance.
   *
   * This instance can be used by a calling application to decode the
   * data this interaction will parse.
   * 
   */
  buildDecoder() {
    return new BCURDecoder();
  }

}

/**
 * Reads a public key from data returned by Hermit's `display-pub` command.
 *
 * This interaction class works in tandem with the `BCURDecoder`
 * class.  The `BCURDecoder` parses data from Hermit, this class
 * interprets it.
 *
 * @extends {module:hermit.HermitInteraction}
 * @example
 * const interaction = new HermitExportPublicKey();
 * const data = readQRCodeSequence();  // using BCURDecoder
 * const {pubkey, bip32Path} = interaction.parse(data);
 * console.log(pubkey);
 * // "03..."
 * console.log(bip32Path);
 * // "m/45'/0'/0'/0/0"
 */
export class HermitExportPublicKey extends HermitInteraction {

  constructor({bip32Path}) {
    super();
    this.bip32Path = bip32Path;
  }

  messages() {
    const messages = super.messages();
    messages.push(commandMessage({
      instructions: "Run the following Hermit command, replacing the BIP32 path if you need to:",
      command: `display-pub ${this.bip32Path}`,
    }));
    return messages;
  }

  parse(jsonData) {
    const result = JSON.parse(jsonData);
    const {xpub, pubkey, bip32_path} = result;
    if (!pubkey) {
      if (xpub) {
        throw new Error("Make sure you asked Hermit to display a plain public key and NOT an extended public key.");
      } else {
        throw new Error("No public key found.");
      }
    }
    if (!bip32_path) {
      throw new Error("No BIP32 path found.");
    }
    return {
      pubkey,
      bip32Path: bip32_path,
    };
  }

}

/**
 * Reads a public key from data returned by Hermit's `display-xpub` command.
 *
 * This interaction class works in tandem with the `BCURDecoder`
 * class.  The `BCURDecoder` parses data from Hermit, this class
 * interprets it.
 * 
 * @extends {module:hermit.HermitInteraction}
 * @example
 * const interaction = new HermitExportExtendedPublicKey();
 * const data = readQRCodeSequence();  // using BCURDecoder
 * const {xpub, bip32Path} = interaction.parse(data);
 * console.log(xpub);
 * // "xpub..."
 * console.log(bip32Path);
 * // "m/45'/0'/0'"
 */
export class HermitExportExtendedPublicKey extends HermitInteraction {

  constructor({bip32Path}) {
    super();
    this.bip32Path = bip32Path;
  }

  messages() {
    const messages = super.messages();
    messages.push(commandMessage({
      instructions: "Run the following Hermit command, replacing the BIP32 path if you need to:",
      command: `display-xpub ${this.bip32Path}`,
    }));
    return messages;
  }

  parse(jsonData) {
    const result = JSON.parse(jsonData);
    const {xpub, pubkey, bip32_path} = result;
    if (!xpub) {
      if (pubkey) {
        throw new Error("Make sure you asked Hermit to display an extended public key and NOT a plain public key.");
      } else {
        throw new Error("No extended public key found.");
      }
    }
    if (!bip32_path) {
      throw new Error("No BIP32 path found.");
    }
    return {
      xpub,
      bip32Path: bip32_path,
    };
  }

}

/**
 * Displays a signature request for Hermit's `sign` command and reads
 * the resulting signature.
 *
 * This interaction class works in tandem with the `BCURDecoder`
 * class.  The `BCURDecoder` parses data from Hermit, this class
 * interprets it.
 *
 * @extends {module:hermit.HermitInteraction}
 * @example
 * const interaction = new HermitSignMultisigTransaction({psbt});
 * const urParts = interaction.request();
 * console.log(urParts);
 * // [ "ur:...", "ur:...", ... ]
 *
 * displayQRCodeSequence(urParts);
 * // ...
 *
 * const data = readQRCodeSequence();  // using BCURDecoder
 * const signedPSBT = interaction.parse(data);
 * console.log(signedPSBT);
 * // "cHNidP8B..."
 *
 */
export class HermitSignMultisigTransaction extends HermitInteraction {

  /**
   *
   * @param {object} options - options argument
   * @param {array<object>} options.psbt - unsigned PSBT to sign
   */
  constructor({psbt}) {
    super();
    this.psbt = psbt;
  }

  messages() {
    const messages = super.messages();

    messages.push(commandMessage({
      instructions: "Run the following Hermit command to scan this signature request:",
      command: "sign",
    }));

    if (!this.psbt) {
      messages.push({
        state: PENDING,
        level: ERROR,
        code: "hermit.sign",
        text: "PSBT is required.",
      });
    }
    
    // FIXME validate PSBT!

    return messages;
  }

  request() {
    const psbtHex = [...atob(this.psbt)].map(c=> c.charCodeAt(0).toString(16).padStart(2,0)).join('');
    const encoder = new BCUREncoder(psbtHex);
    return encoder.parts();
  }

  parse(signedPSBT) {
    return signedPSBT;
  }

}

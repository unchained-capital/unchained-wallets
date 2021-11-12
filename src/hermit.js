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
 * * HermitExportExtendedPublicKey
 * * HermitSignMultisigTransaction
 *
 * @module hermit
 */
import {
  IndirectKeystoreInteraction,
  PENDING,
  ACTIVE,
  INFO,
  ERROR,
} from "./interaction";
import {BCUREncoder} from "./bcur";

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

const DESCRIPTOR_REGEXP = new RegExp("^\\[([a-fA-F0-9]{8})((?:/[0-9]+'?)+)\\]([a-km-zA-NP-Z1-9]+)$");

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

  parse(descriptor) {
    if (!descriptor) {
      throw new Error("No descriptor received from Hermit.");
    }
    const result = descriptor.match(DESCRIPTOR_REGEXP);
    if (result && result.length == 4) {
      return {
        rootFingerprint: result[1],
        bip32Path: `m${result[2]}`,
        xpub: result[3],
      };
    } else {
      throw new Error("Invalid descriptor received from Hermit.");
    }
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
    const unsignedPSBTHex = Buffer.from(this.psbt, 'base64').toString('hex');
    const encoder = new BCUREncoder(unsignedPSBTHex);
    return encoder.parts();
  }

  parse(signedPSBTHex) {
    if (!signedPSBTHex) {
      throw new Error("No signature received from Hermit.");
    }
    return Buffer.from(signedPSBTHex, 'hex').toString('base64');
  }

}

/**
 * Provides classes for encoding & decoding data using the Blockchain Commons UR format.
 *
 * The following API classes are implemented:
 *
 * * BCUREncoder
 * * BCURDecoder
 *
 * @module bcur
 */

import { encodeUR } from "./vendor/bcur";

/**
 * Encoder class for BC UR data.
 *
 * Encodes data as a sequence of UR parts.  Each UR is a string.
 *
 * Designed for use by a calling application which will typically take
 * the resulting strings and display them as a sequence of animated QR
 * codes.
 *
 * @example
 * import {BCUREncoder} from "unchained-wallets";
 * const data = "hello there ...";
 * const encoder = BCUREncoder(data);
 * console.log(encoder.parts())
 * // [ "ur:...", "ur:...", ... ]
 * 
 *
 */
export class BCUREncoder {

  /**
   * Create a new encoder.
   *
   * @param {string} data plain JavaScript string to encode
   * @param {int} fragmentCapacity passed to internal bcur implementation
   * 
   */
  constructor(data, fragmentCapacity = 200) {
    const messageBuffer = Buffer.from(data);
    this.data = data;
    this.fragmentCapacity = fragmentCapacity;
    this.encodeUR = encodeUR;
  }

  /**
   * Return all UR parts.
   *
   * @returns {string[]} array of BC UR strings
   * 
   */
  parts() {
    return encodeUR(this.data, this.fragmentCapacity);
  }

}

/**
 * Decoder class for BC UR data.
 *
 * Decodes data from a sequence of UR parts.
 *
 * Designed for use by a calling application which is typically
 * in a loop parsing an animated sequence of QR codes.
 *
 * @example
 * import {BCURDecoder} from "unchained-wallets";
 * const decoder = new BCURDecoder();
 *
 * // while the application is still reading data...
 * while (reading() && !decoder.isComplete()) {
 *   console.log(decoder.progress());
 *   // {totalParts: 10, partsReceived; 3}
 *   const qrCodeData = scanQRCode(); // application dependent
 *   decoder.receivePart(qrCodeData);
 * }
 * if (decoder.isSuccess()) {
 *   console.log(decoder.data());
 * } else {
 *   console.log(decoder.error());
 * }
 * 
 * 
 */
export class BCURDecoder {

  constructor() {
    this.decoder = URDecoder();
  }

  /**
   * Receive a new UR part.
   *
   * It's OK to call this method multiple times for the same UR part.
   *
   * @param [string] part the UR part, typically the contents of a QR code
   */
  receivePart(part) {
    return this.decoder.receivePart(part);
  }

  /**
   * Returns the current progress of this decoder.
   *
   * @example Before a single part is received
   * import {BCURDecoder} from "unchained-wallets";
   * const decoder = BCURDecoder();
   * console.log(decoder.progress())
   * // { totalParts: 0, partsReceived: 0 }
   *
   * @return [bool]
   * import {BCURDecoder} from "unchained-wallets";
   * const decoder = BCURDecoder();
   * ...
   * decoder.receivePart(part);
   * ...
   * decoder.receivePart(part);
   * ...
   * decoder.receivePart(part);
   * ...
   * console.log(decoder.progress())
   * // { totalParts: 10, partsReceived: 3 }
   */
  progress() {
    const totalParts = this.decoder.expectedPartCount();
    const partsReceived = this.decoder.receivedPartIndexes().length;
    return {totalParts, partsReceived};
  }

  /**
   * Is this decoder complete?
   *
   * @return [bool]
   */
  isComplete() {
    return this.decoder.isComplete();
  }

  /**
   * Was this decoder successful?
   *
   * @return [bool]
   */
  isSuccess() {
    return this.decoder.isSuccess();
  }

  /**
   * Returns the decoded data.
   *
   * @return [string]
   */
  data() {
    const ur = this.decoder.resultUR();
    const decoded = ur.decodeCBOR();
    const originalMessage = decoded.toString();
    return originalMessage;
  }

  /**
   * Returns the error message.
   *
   * @return [string]
   */
  error() {
    return this.decoder.resultError();
  }

}


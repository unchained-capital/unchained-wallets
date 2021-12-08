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

import { encodeUR, smartDecodeUR } from "./vendor/bcur";

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
   * @param {string} data a hex string to encode
   * @param {int} fragmentCapacity passed to internal bcur implementation
   * 
   */
  constructor(data, fragmentCapacity = 200) {
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
 * Decodes hex data from a collection of UR parts.
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
 *   // "deadbeef....abcd"
 * } else {
 *   console.log(decoder.error());
 * }
 * 
 * 
 */
export class BCURDecoder {

  constructor() {
    this.reset();
  }

  /**
   * Reset this decoder.
   *
   * Clears any error message and received parts and returns counts to zero.
   *
   * @returns {null} Nothing is returned.
   */
  reset() {
    this.summary = {
      success: false,
      current: 0,
      length: 0,
      workloads: [],
      result: '',
    };
    this.error = null;
  }

  /**
   * Receive a new UR part.
   *
   * It's OK to call this method multiple times for the same UR part.
   *
   * @param {string} part the UR part, typically the contents of a QR code
   * @returns {null} Nothing is returned.
   */
  receivePart(part) {
    try {
      const workloads = this.summary.workloads.includes(part) ? this.summary.workloads : [
        ...this.summary.workloads,
        part,
      ];
      this.summary = smartDecodeUR(workloads);
    } catch(e) {
      this.error = e;
    }
  }

  /**
   * Returns the current progress of this decoder.
   *
   * @returns {object} An object with keys `totalParts` and `partsReceived`.
   * @example Before a single part is received
   * import {BCURDecoder} from "unchained-wallets";
   * const decoder = BCURDecoder();
   * console.log(decoder.progress())
   * // { totalParts: 0, partsReceived: 0 }
   *
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
    const totalParts = this.summary.length;
    const partsReceived = this.summary.current;
    return {totalParts, partsReceived};
  }

  /**
   * Is this decoder complete?
   *
   * Will return `true` if there was an error.
   *
   * @returns {bool} Completion status
   */
  isComplete() {
    return this.summary.success || Boolean(this.error);
  }

  /**
   * Was this decoder successful?
   *
   * Will return `false` if completed because of an error.
   *
   * @returns {bool} Success status
   */
  isSuccess() {
    return this.summary.success;
  }

  /**
   * Returns the decoded data in hex.
   *
   * @returns {string} decoded data in hex or `null` if not successful
   */
  data() {
    if (this.isSuccess()) {
      return this.summary.result;
    } else {
      return null;
    }
  }

  /**
   * Returns the error message.
   *
   * @returns {string} the error message
   */
  errorMessage() {
    if (this.error) {
      return this.error.message;
    } else {
      return null;
    }
  }

}

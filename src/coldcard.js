/**
 * Provides classes for interacting with a Coldcard via TXT/JSON/PSBT files
 *
 * @module coldcard
 */
import {
  IndirectKeystoreInteraction,
} from "./interaction";

export const COLDCARD = 'coldcard';

export function parseData() {}

export function encodeData() {}

/**
 * Base class for interactions with Coldcard.
 *
 * @extends {module:interaction.IndirectKeystoreInteraction}
 */
export class ColdcardInteraction extends IndirectKeystoreInteraction {


  /**
   * Coldcard interactions need to know the bitcoin network they are on
   *
   * @param {object} options - options argument
   * @param {string} options.network - bitcoin network
   */
  constructor({network}) {
    super();
    this.network = network;
  }
}

/**
 * Base class for interactions
 *
 * @extends {module:hermit.HermitInteraction}
 */
export class ColdcardFileReader extends ColdcardInteraction {}

export class ColdcardExportExtendedPublicKey extends ColdcardFileReader {}

export class ColdcardSignTransaction extends ColdcardFileReader {}

/**
 * Returns a valid multisig wallet config text file to send over to a Coldcard
 *
 * NOTE: while it will technically work with unknown root fingerprints (xfp's)
 * we highly recommend only setting up the multisig wallet with complete xfp
 * information. We define isSupported() to check exactly this condition.
 *
 * This is an example Coldcard config file from
 * https://coldcardwallet.com/docs/multisig
 *
 * # Coldcard Multisig setup file (exported from 4369050F)
 * #
 * Name: MeMyself
 * Policy: 2 of 4
 * Derivation: m/45'
 * Format: P2WSH
 *
 * D0CFA66B: tpubD9429UXFGCTKJ9NdiNK4rC5...DdP9
 * 8E697B74: tpubD97nVL37v5tWyMf9ofh5rzn...XgSc
 * BE26B07B: tpubD9ArfXowvGHnuECKdGXVKDM...FxPa
 * 4369050F: tpubD8NXmKsmWp3a3DXhbihAYbY...9C8n
 *
 */
export class ColdcardConfig {
  constructor({jsonConfig}) {
    this.jsonConfig = jsonConfig;
    //this.jsonConfig.derivation = "m/45'";
  }

  /**
   * @returns {boolean} isSupported - does the jsonConfig have necessary pieces?
   */
  isSupported() {
    // Do we have all of the fingerprints?
    return this.jsonConfig.extendedPublicKeys.every((xpub) => xpub.xfp !== 'Unknown');
  }

  /**
   * @returns {string} configText - output to be written to a textfile and uploaded to Coldcard.
   */
  translate() {
    if (this.isSupported()) {
      // Coldcard configs can't have spaces in the names, it just splits on space and takes the first word.
      // Currently operating without Derivation, but leaving it while we test.
      // Derivation: ${this.jsonConfig.derivation}
      let output =
`# Coldcard Multisig setup file (exported from unchained-wallets)
# https://github.com/unchained-capital/unchained-wallets
# 
Name: ${this.jsonConfig.name.replace(/ /g, '_')}
Policy: ${this.jsonConfig.quorum.requiredSigners} of ${this.jsonConfig.quorum.totalSigners}
Format: ${this.jsonConfig.addressType}

`;
      // We need to loop over xpubs and output `xfp: xpub` for each
      let xpubs = this.jsonConfig.extendedPublicKeys.map((xpub) => `${xpub.xfp}: ${xpub.xpub}`)
      output += xpubs.join("\r\n");
      return output;
    }
    throw new Error("Missing fingerprints in the JSON config file.");
  }
}

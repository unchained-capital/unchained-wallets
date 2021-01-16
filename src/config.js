/**
 * Provides classes for interacting with a multisig wallet configuration
 * 
 * The following API classes are implemented
 * 
 * * MultisigWalletConfig
 * 
 * @module config
 */

import { 
  MAINNET, 
  TESTNET, 
  validateBIP32Path, 
  validateExtendedPublicKeyForNetwork,
  validateRootFingerprint
} from "unchained-bitcoin";
import assert from "assert";
import { ExtendedPublicKey } from "unchained-bitcoin/lib/keys";

/**
 * A utility class for managing multisig wallet configs.
 * This provides validation on class instantiation as well 
 * as for conversion. For example, you can import a ColdCard
 * config as text and then export as a JSON (which is also
 * compatible with Caravan).
 * 
 * Currently supported formats: coldcard, caravan
 */
export class MultisigWalletConfig {
  static supportedNetworks = [MAINNET, TESTNET];

  /**
   * 
   * @param {object} options - options object to create config from
   * @param {string} [options.uuid] - used for name of config, will fallback to name option
   * @param {string} [options.name] - required if no uuid passed
   * @param {number} options.requiredSigners - number of required signers, i.e. `m`
   * @param {string} options.addressType - what kind of address (e.g. p2sh, p2wsh)
   * @param {object[]} options.extendedPublicKeys - array of extended pub key objects
   * @param {string} [options.extendedPublicKeys.name] - name of key
   * @param {string} [options.extendedPublicKeys.xfp] - master fingerprint
   * @param {string} options.extendedPublicKeys.xpub - valid xpub
   * @param {string} [options.extendedPublicKeys.bip32Path] - bip32path corresponding to xpub
   * @param {number} [options.startingAddressIndex] - an optional positive integer indicating 
   * the starting index to generate/scan for addresses from xpubs
   * @param {string} [options.network='mainnet'] - network corresponding to keys
   * @param {Object} [options.client] - private or public, really only valid for caravan
   * @returns {MultisigWalletConfig} new config instance
   */
  constructor({ 
    uuid, 
    name, 
    requiredSigners,
    addressType, 
    extendedPublicKeys,
    startingAddressIndex,
    network,
    client,
  }) {
    assert(uuid || name, "Name or UUID required to create new MultisigWalletConfig");
    this.name = uuid || name;

    if (network) {
      assert(
        MultisigWalletConfig.supportedNetworks.includes(network), 
        `Network ${network} not supported.`
      );
      this.network = network;
    } else {
      this.network = MAINNET;
    }
    
    if (client) {
      this.client = client;
    }
    
    assert(typeof addressType === "string", "Wallet config needs addressType.");
    this.addressType = addressType;

    assert(
      extendedPublicKeys && 
      Array.isArray(extendedPublicKeys),
      "Wallet config needs array of extendedPublicKeys."
    );
    this.extendedPublicKeys = extendedPublicKeys;
    this.validateExtendedPublicKeys(false);

    assert(
     requiredSigners && requiredSigners <= extendedPublicKeys.length,
      "Wallet config needs requiredSigners."
    );
    this.requiredSigners = requiredSigners;

    if (startingAddressIndex) {
      if (typeof startingAddressIndex !== "number") {
        throw new TypeError("Expected int for startingAddressIndex");
      }
      this.startingAddressIndex = startingAddressIndex;
    }
  }

  /**
   * @description instantiate a new wallet config object from a JSON
   * @param {JSON} jsonString - json string to convert.
   * @returns {MultisigWalletConfig} returns a new instance of a MultisigWalletConfig
   */
  static fromJSON(jsonString) {
    if (typeof jsonString !== "string") throw new TypeError("Must pass a valid JSON string");
    let options;

    try {
      options = JSON.parse(jsonString);
    } catch (error) {
      throw new Error("Unable to parse JSON.");
    }

    return new this(options);
  }

  /**
   * @description Validate the public keys on the config instances. 
   * Not all configs require xfp in the xpub objects, so an optional param is
   * accepted to dictate whether or not this value should be validated
   * @param {boolean} requiresXFP - does the object require an xfp, if so it will also be validated
   * @returns {boolean|Error} true if valid otherwise throws an error
   */
  validateExtendedPublicKeys(requiresXFP=false) {
    // keep track of all xpfs to make sure there are not duplicates
    // this is to ensure that a single seed/root isn't used multiple times in the quorum
    const rootFingerprints = [];
    return this.extendedPublicKeys.every(({ xpub, bip32Path, xfp }) => {
      assert(xpub, "xpub value required");

      let xpubError = validateExtendedPublicKeyForNetwork(xpub, this.network);
      assert(!xpubError.length, `Error in Xpub ${xpub}: ${xpubError}`);

      if (bip32Path && bip32Path !== "Unknown") {
        const pathError = validateBIP32Path(bip32Path);
        assert(!pathError.length, `Xpub Path Error: ${bip32Path} - ${pathError}`);
      }
      
      if (xfp) {
        assert(!rootFingerprints.includes(xfp), "Duplicate root fingerprints not allowed in same config");
        rootFingerprints.push(xfp);
      }
    
      if (requiresXFP) {
        assert(xfp && xfp !== "Unknown", "ExtendedPublicKeys missing at least one xfp.");
        validateRootFingerprint(xfp);
      }

      return true;
    });
  }

  /**
   * @description for some configs root fingerprints are required for each key,
   * e.g. for Coldcards, however they don't all have to be "real" since it
   * only matters for the signing device. In those cases we can put a placeholder
   * xfp property on the extendedPublicKeys that are missing them. It doesn't matter
   * what this value is, but for consistency we use the parentFingerprint which is
   * encoded in the xpub anyway, to derive this placeholder. 
   * This will throw if there is not at least one extendedPublicKey with an xfp. 
   * @returns {void}
   */
  addPlaceholderFingerprints() {
    const hasAtLeastOne = this.extendedPublicKeys.some(xpub => xpub.xfp);
    if (!hasAtLeastOne) {
      throw new Error("At least one XFP is required to add placeholders to other xpubs");
    }

    this.extendedPublicKeys.forEach(xpub => {
      if (!xpub.xfp) {
        const parentFingerprint = ExtendedPublicKey.fromBase58(xpub.xpub).parentFingerprint;
        // in case it's all numbers, make sure it doesn't get coerced to a number
        // and restrict to 8 characters which is restriction for root fingerprint
        xpub.xfp = String(parentFingerprint).slice(0, 8);
      }
    });
  }

  /**
   * @returns {JSON} returns a JSON string with config values
   */
  toJSON() {
    return JSON.stringify({
      name: this.name,
      addressType: this.addressType,
      network: this.network,
      requiredSigners: this.requiredSigners,
      startingAddressIndex: this.startingAddressIndex,
      extendedPublicKeys: this.extendedPublicKeys,
      client: this.client,
    });
  }
}

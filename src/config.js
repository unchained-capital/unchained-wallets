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

/**
 * TODO: do we need a special method for `fromUnchained`? 
 */

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
  
  static supportedClients = ['public', 'private'];

  /**
   * 
   * @param {object} options - options object to create config from
   * @param {string} [options.uuid] - used for name of config, will fallback to name option
   * @param {string} [options.name] - required if no uuid passed
   * @param {string} [options.derivation] - BIP32 path for xpub derivation
   * @param {number} options.requiredSigners - number of required signers, i.e. `m`
   * @param {string} options.addressType - what kind of address (e.g. p2sh, p2wsh)
   * @param {object[]} options.extendedPublicKeys - array of extended pub key objects
   * @param {string} [options.extendedPublicKeys.xfp] - master fingerprint
   * @param {string} options.extendedPublicKeys.xpub - valid xpub
   * @param {number} [options.startingAddressIndex] - an optional positive integer indicating 
   * the starting index to generate/scan for addresses from xpubs
   * @param {string} [options.extendedPublicKeys.bip32Path] - bip32path corresponding to xpub
   * @param {string} [options.extendedPublicKeys.name] - name of key
   * @param {string} [options.network='mainnet'] - network corresponding to keys
   * @param {Object} [options.client] - private or public, really only valid for caravan
   * @returns {MultisigWalletConfig} new config instance
   */
  constructor({ 
    uuid, 
    name, 
    derivation,
    requiredSigners,
    addressType, 
    extendedPublicKeys,
    startingAddressIndex,
    network,
    client,
  }) {
    assert(uuid || name, 'Name or UUID required to create new MultisigWalletConfig');
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
      assert(
        MultisigWalletConfig.supportedClients.includes(client.type),
        `Client type "${client.type}" not supported`
      )
      this.client = client;
    }
    
    assert(typeof addressType === 'string', "Wallet config needs addressType.");
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
    this.totalSigners = extendedPublicKeys.length;

    if (derivation) {
      const pathError = validateBIP32Path(derivation);
      assert(!pathError.length, pathError);
      this.derivation = derivation;
    }

    if (startingAddressIndex) {
      if (typeof startingAddressIndex !== 'number') {
        throw new TypeError('Expected int for startingAddressIndex');
      }
      this.startingAddressIndex = startingAddressIndex;
    }
  }

  /**
   * @description instantiate a new wallet config object from a JSON
   * @param {string} jsonString - json string to convert.
   * @returns {MultisigWalletConfig} returns a new instance of a MultisigWalletConfig
   */
  static fromJSON(jsonString) {
    if (typeof jsonString !== 'string') throw new TypeError('Must pass a valid JSON string');
    let options;

    try {
      options = JSON.parse(jsonString);
    } catch (error) {
      throw new Error("Unable to parse JSON.");
    }
    
    // TODO: how do we handle caravan configs where the extended public keys
    // don't include xfp information? We can get a parent fingerprint 
    // from the xpub and use that. It wouldn't be valid as an xfp but could be used as stand in? 
    return new this(options);
  }

  /**
   * @description static method wrapper around getting a new
   * config based on a JSON since Caravan is the assumed format of accepted JSON
   * @param {string} jsonString - valid config json string from Caravan export
   * @returns {MultisigWalletConfig} new instance of a MultisigWalletConfig
   */
  static fromCaravanConfig(jsonString) {
    return MultisigWalletConfig.fromJSON(jsonString);
  }

  /**
   * @description Validate the public keys on the config instances. 
   * Not all configs require xfp in the xpub objects, so an optional param is
   * accepted to dictate whether or not this value should be validated
   * @param {boolean} requiresXFP - does the object require an xfp, if so it will also be validated
   * @returns {boolean|Error} true if valid otherwise throws an error
   */
  validateExtendedPublicKeys(requiresXFP=false) {
    return this.extendedPublicKeys.every(({ xpub, bip32Path, xfp }) => {
      assert(xpub, 'xpub value required');

      let xpubError = validateExtendedPublicKeyForNetwork(xpub, this.network);
      assert(!xpubError.length, `Error in Xpub ${xpub}: ${xpubError}`)

      if (bip32Path && bip32Path !== 'Unknown') {
        const pathError = validateBIP32Path(bip32Path);
        assert(!pathError.length, `Xpub Path Error: ${bip32Path} - ${pathError}`)
      }

      if (requiresXFP) {
        assert(xfp && xfp !== "Unknown", "ExtendedPublicKeys missing at least one xfp.");
        validateRootFingerprint(xfp)
      }

      return true
    })
  }

  /**
   * @description A simple wrapper for returning a json config
   * since the params of the class are valid for caravan.
   * @returns {MultisigWalletConfig} a new MultisigWalletConfig instance
   */
  toCaravanConfig() {
    return this.toJSON();
  }

  /**
   * @returns {string} returns a JSON string with config values
   */
  toJSON() {
    return JSON.stringify({
      name: this.name,
      addressType: this.addressType,
      network: this.network,
      quorum: this.quorum,
      startingAddressIndex: this.startingAddressIndex,
      extendedPublicKeys: this.extendedPublicKeys,
      client: this.client,
    })
  }
}

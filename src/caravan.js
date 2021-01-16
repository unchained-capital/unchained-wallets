/**
 * Provides methods for interacting with Caravan coordinator
 * 
 * The following API methods are implemented
 * 
 * * parseCaravanConfig
 * * generateCaravanConfig
 * @module caravan
 */

import assert from "assert";

import { MultisigWalletConfig } from "./config";

export const CARAVAN = "caravan";

export const CARAVAN_WALLET_CONFIG_VERSION = "1.0.0";

export const CARAVAN_CLIENT_TYPES = ["public", "private"];

/**
 * @description generate a config based on a Caravan generated JSON 
 * @param {JSON|object} config - valid config json string from Caravan export
 * supports an object if one is passed in.
 * @returns {MultisigWalletConfig} new instance of a MultisigWalletConfig
 */
export function parseCaravanConfig(config) {
    let options = config;
    if (typeof config !== "string" && typeof config !== "object") {
      throw new Error("Must pass json or options object");
    } else if (typeof config === "string") {
      options = JSON.parse(config);
    }

    options.requiredSigners = options.quorum.requiredSigners;
    return new MultisigWalletConfig(options);
}

/**
 * @description A simple wrapper for returning a json config
 * since the params of the class are valid for caravan.
 * @param {object|module:config.MultisigWalletConfig} _config - config instance
 * or options object for creating a valid config to generate coldcard file fro
 * @returns {JSON} JSON string required for Caravan wallet
 */
export function generateCaravanConfig(_config) {
    let config = _config;
    // make sure we have a valid config object or can create one from the argument
    if (!(config instanceof MultisigWalletConfig)) {
      assert(typeof config === "object", "Must pass an object or MultisigWalletConfig to generate Coldcard config");
      config = new MultisigWalletConfig(_config);
    }
    assert(config.client, "Caravan requires client property");
    assert(
      CARAVAN_CLIENT_TYPES.includes(config.client.type),
      `Client type "${config.client.type}" not supported`
    );

    const options = {
      name: config.name,
      addressType: config.addressType,
      network: config.network,
      quorum: {
        requiredSigners: config.requiredSigners,
        totalSigners: config.extendedPublicKeys.length,
      },
      extendedPublicKeys: config.extendedPublicKeys,
    };
    options.client = config.client;
    if (config.startingAddressIndex) options.startingAddressIndex = config.startingAddressIndex;
    return JSON.stringify(options);
}

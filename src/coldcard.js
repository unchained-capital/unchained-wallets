/**
 * Provides classes for interacting with a Coldcard via TXT/JSON/PSBT files
 *
 * The following API classes are implemented:
 *
 * * ColdcardExportPublicKey
 * * ColdcardExportExtendedPublicKey
 * * ColdcardSignMultisigTransaction
 * * ColdcardMultisigWalletConfig
 *
 * @module coldcard
 */
import {
  deriveChildExtendedPublicKey,
  fingerprintToFixedLengthHex,
  parseSignaturesFromPSBT,
  ExtendedPublicKey,
  MAINNET,
  TESTNET,
  validateBIP32Path,
} from "unchained-bitcoin";
import {
  IndirectKeystoreInteraction,
  PENDING,
  ACTIVE,
  INFO, ERROR,
} from "./interaction";

export const COLDCARD = 'coldcard';
export const COLDCARD_BASE_BIP32_PATHS = {
  "m/45'": "p2sh",
  "m/48'/0'/0'/1'": "p2wsh_p2sh",
  "m/48'/0'/0'/2'": "p2wsh",
  "m/48'/1'/0'/1'": "p2wsh_p2sh",
  "m/48'/1'/0'/2'": "p2wsh",
};

export const WALLET_CONFIG_VERSION = "0.0.1";

/**
 * Base class for interactions with Coldcard
 *
 * @extends {module:interaction.IndirectKeystoreInteraction}
 */
export class ColdcardInteraction extends IndirectKeystoreInteraction {
}

/**
 * Base class for JSON Multisig file-based interactions with Coldcard
 * This class handles the file that comes from the `Export XPUB` menu item.
 *
 * @extends {module:coldcard.ColdcardInteraction}
 */
class ColdcardMultisigSettingsFileParser extends ColdcardInteraction {

  /**
   *
   * @param {object} options - options argument
   * @param {string} bip32Path - the requested BIP32 path
   * @param {string} options.network - bitcoin network (needed for derivations)
   */
  constructor({network, bip32Path}) {
    super();
    if ([MAINNET, TESTNET].find(net => net === network)) {
      this.network = network;
    } else {
      throw new Error("Unknown network.");
    }
    if (!bip32Path || typeof bip32Path !== 'string') {
      throw new Error("bip32path must exist and be a string.");
    }

    this.bip32Path = bip32Path;
    this.data = null;
    this.bip32ValidationErrors = this.validateBip32PathAndSetInternalProperties(bip32Path);
  }

  // TODO make these messages more robust
  //   (e.g use `menuchoices` as an array of `menuchoicemessages`)
  messages() {
    const messages = super.messages();

    this.bip32ValidationErrors.forEach((e) => {
      messages.push({
        state: PENDING,
        level: ERROR,
        text: e.text,
        code: e.code,
      });
    });

    messages.push({
      state: PENDING,
      level: INFO,
      code: "coldcard.export_xpub",
      text: "Go to Settings > Multisig Wallets > Export XPUB",
    });
    messages.push({
      state: PENDING,
      level: INFO,
      code: "coldcard.upload_key",
      text: "Upload the JSON file from your Coldcard.",
    });
    return messages;
  }

  /**
   * Parse the Coldcard JSON file and do some basic error checking
   * add a field for rootFingerprint (it can sometimes be calculated
   * if not explicitly included)
   *
   * @param {Object} file JSON file exported from Coldcard
   * @returns {Object} the parsed response
   *
   */
  parse(file) {
    //In the case of keys (json), the file will look like:
    //
    //{
    //   "p2sh_deriv": "m/45'",
    //   "p2sh": "tpubDA4nUAdTmY...MmtZaVFEU5MtMfj7H",
    //   "p2wsh_p2sh_deriv": "m/48'/1'/0'/1'",
    //   "p2wsh_p2sh": "Upub5THcs...Qh27gWiL2wDoVwaW",
    //   "p2wsh_deriv": "m/48'/1'/0'/2'",
    //   "p2wsh": "Vpub5n7tBWyvv...2hTzyeSKtZ5PQ1MRN",
    //   "xfp": "12abcdef"
    // }
    //
    // For now, we will derive unhardened from `p2sh_deriv`
    // FIXME: assume we will gain the ability to ask Coldcard for an arbitrary path
    //   (or at least a p2sh hardened path deeper than m/45')

    if (typeof file === "object") {
      this.data = file;
    } else if (typeof file === "string") {
      try {
        this.data = JSON.parse(file);
      } catch (error) {
        throw new Error("Unable to parse JSON.");
      }
    } else {
      throw new Error("Not valid JSON.");
    }

    if (Object.keys(this.data).length === 0) {
      throw new Error("Empty JSON file.");
    }

    if (!this.data.p2sh_deriv || !this.data.p2sh ||
        !this.data.p2wsh_p2sh_deriv || !this.data.p2wsh ||
        !this.data.p2wsh_deriv || !this.data.p2wsh) {
      throw new Error("Missing required params. Was this file exported from a Coldcard?");
    }

    const xpubClass = ExtendedPublicKey.fromBase58(this.data.p2sh);
    if (!this.data.xfp && xpubClass.depth !== 1) {
      throw new Error("No xfp in JSON file.");
    }

    // We can only find the fingerprint in the xpub if the depth is one
    // because the xpub includes its parent's fingerprint.
    let xfpFromWithinXpub = (xpubClass.depth === 1)
      ? fingerprintToFixedLengthHex(xpubClass.parentFingerprint)
      : null;

    // Sanity check if you send in a depth one xpub, we should get the same fingerprint
    if ((xfpFromWithinXpub && this.data.xfp) &&
      xfpFromWithinXpub !== this.data.xfp.toLowerCase()) {
      throw new Error("Computed fingerprint does not match the one in the file.");
    }

    const rootFingerprint = this.data.xfp ? this.data.xfp : xfpFromWithinXpub;
    this.data.rootFingerprint = rootFingerprint.toLowerCase();

    return this.data;
  }

  /**
   * Checks bip32Path, and sets pathsBelowBase (known base from Coldcard)
   * as well as which key material to use (p2sh/p2wsh_p2sh/p2wsh)
   *
   * @param {string} bip32Path JSON file exported from Coldcard
   * @returns {[]} any error messages
   */
  validateBip32PathAndSetInternalProperties(bip32Path) {
    let errors = [];

    const pathError = validateBIP32Path(bip32Path);
    if (pathError) {
      errors.push({
        text: pathError,
        code: 'coldcard.bip32_path.path_error',
      });
    }

    // SET INTERNAL PROPERTIES
    // Sets key material string (p2sh/p2wsh_p2sh/p2wsh) so that the
    // child knows which (t/U/V/x/Y/Zpub) to use.
    // Sets relative path below the COLDCARD_BASE_BIP32_PATHS after a match.
    Object.keys(COLDCARD_BASE_BIP32_PATHS).forEach((key) => {
      if (bip32Path.startsWith(key)) {
        this.keyMaterial = COLDCARD_BASE_BIP32_PATHS[key];
        // One could just hang keys off of the base bip32 path in the Coldcard file
        // We do not recommend that, but we also do not prevent it.
        if (bip32Path.length > key.length) {
          this.pathBelowBase = bip32Path.substr(key.length + 1);
        } else {
          this.pathBelowBase = "";
        }
      }
    });

    if (!this.keyMaterial) {
      errors.push({
        text: `Unknown base bip32 path. Coldcard supports: ${Object.keys(COLDCARD_BASE_BIP32_PATHS).join(", ")}`,
        code: 'coldcard.bip32_path.unknown_base',
      });
    }

    // Finally, check that there are no hardened indices after the base
    const deepPathError = validateBIP32Path(this.pathBelowBase, {mode: "unhardened"});
    if (deepPathError) {
      errors.push({
        text: "Can't derive hardened after the base path.",
        code: 'coldcard.bip32_path.no_hardened_after_base',
      });
    }

    return errors;
  }

  /**
   * This method will take the xpub that's been sent in
   * and derive deeper if necessary (and able) using
   * functionality from unchained-bitcoin
   *
   * @param {Object} baseXpub - t/U/V/x/Y/Zpub pulled out of Coldcard JSON
   * @returns {Object} the desired xpub (if possible)
   *
   */
  deriveXpubIfNecessary(baseXpub) {
    return this.pathBelowBase
      ? deriveChildExtendedPublicKey(baseXpub, this.pathBelowBase, this.network)
      : baseXpub;
  }
}

/**
 * Reads a public key and (optionally) derives deeper from data in an
 * exported JSON file uploaded from the Coldcard.
 *
 * @extends {ColdcardMultisigSettingsFileParser}
 * @example
 * const interaction = new ColdcardExportPublicKey();
 * const reader = new FileReader(); // application dependent
 * const jsonFile = reader.readAsText('ccxp-0F056943.json'); // application dependent
 * const {publicKey, rootFingerprint, bip32Path} = interaction.parse(jsonFile);
 * console.log(publicKey);
 * // "026942..."
 * console.log(rootFingerprint);
 * // "0f056943"
 * console.log(bip32Path);
 * // "m/45'/0/0"
 */
export class ColdcardExportPublicKey extends ColdcardMultisigSettingsFileParser {

  /**
   *
   * @param {object} options - options argument
   * @param {string} options.bip32Path - BIP32 paths
   * @param {string} options.network - bitcoin network (needed for derivations)
   */
  constructor({bip32Path, network}) {
    super({
      network,
      bip32Path,
    });
  }

  messages() {
    return super.messages();
  }

  parse(xpubJSONFile) {
    const result = super.parse(xpubJSONFile);
    const rootFingerprint = result.rootFingerprint;
    const bip32Path = this.bip32Path;
    let xpub = this.deriveXpubIfNecessary(result[this.keyMaterial]);
    const publicKey = ExtendedPublicKey.fromBase58(xpub).pubkey;

    return {
      publicKey,
      rootFingerprint,
      bip32Path,
    };
  }

}

/**
 * Reads an extended public key and (optionally) derives deeper from data in an
 * exported JSON file uploaded from the Coldcard.
 *
 * @extends {ColdcardMultisigSettingsFileParser}
 * @example
 * const interaction = new ColdcardExportExtendedPublicKey();
 * const reader = new FileReader(); // application dependent
 * const jsonFile = reader.readAsText('ccxp-0F056943.json'); // application dependent
 * const {xpub, rootFingerprint, bip32Path} = interaction.parse(jsonFile);
 * console.log(xpub);
 * // "xpub..."
 * console.log(rootFingerprint);
 * // "0f056943"
 * console.log(bip32Path);
 * // "m/45'/0/0"
 */
export class ColdcardExportExtendedPublicKey extends ColdcardMultisigSettingsFileParser {

  /**
   *
   * @param {object} options - options argument
   * @param {string} options.bip32Path - BIP32 paths
   * @param {string} options.network - bitcoin network (needed for derivations)
   */
  constructor({bip32Path, network}) {
    super({
      network,
      bip32Path,
    });
  }

  messages() {
    return super.messages();
  }

  parse(xpubJSONFile) {
    const result = super.parse(xpubJSONFile);
    const rootFingerprint = result.rootFingerprint;
    const bip32Path = this.bip32Path;
    let xpub = this.deriveXpubIfNecessary(result[this.keyMaterial]);

    return {
      xpub,
      rootFingerprint,
      bip32Path,
    };
  }
}

/**
 * Returns signature request data via a PSBT for a Coldcard to sign and
 * accepts a PSBT for parsing signatures from a Coldcard device
 *
 * @extends {module:coldcard.ColdcardInteraction}
 * @example
 * const interaction = new ColdcardSignMultisigTransaction({network, inputs, outputs, bip32paths, psbt});
 * console.log(interaction.request());
 * // "cHNidP8BA..."
 *
 * // Parse signatures from a signed PSBT
 * const signatures = interaction.parse(psbt);
 * console.log(signatures);
 * // {'029e866...': ['3045...01', ...]}
 *
 */
export class ColdcardSignMultisigTransaction extends ColdcardInteraction {

  /**
   *
   * @param {object} options - options argument
   * @param {string} options.network - bitcoin network
   * @param {array<object>} options.inputs - inputs for the transaction
   * @param {array<object>} options.outputs - outputs for the transaction
   * @param {array<string>} options.bip32Paths - BIP32 paths
   * @param {object} options.psbt - PSBT of the transaction to sign
   */
  constructor({network, inputs, outputs, bip32Paths, psbt}) {
    super();
    if (!psbt) {
      throw new Error("The PSBT must be included at this time.");
    }
    this.network = network;
    this.inputs = inputs;
    this.outputs = outputs;
    this.bip32Paths = bip32Paths;
    this.psbt = psbt;
  }

  messages() {
    const messages = super.messages();
    messages.push({
      state: PENDING,
      level: INFO,
      code: "coldcard.install_multisig_config",
      text: `Ensure your Coldcard has the multisig wallet installed.`,
    });
    messages.push({
      state: PENDING,
      level: INFO,
      code: "coldcard.download_psbt",
      text: `Download and save this PSBT file to your SD card.`,
    });
    messages.push({
      state: PENDING,
      level: INFO,
      code: "coldcard.transfer_psbt",
      text: `Transfer the PSBT file to your Coldcard.`,
    });
    messages.push({
      state: ACTIVE,
      level: INFO,
      code: "coldcard.transfer_psbt",
      text: `Transfer the PSBT file to your Coldcard.`,
    });
    messages.push({
      state: ACTIVE,
      level: INFO,
      code: "coldcard.select_psbt",
      text: `Choose 'Ready To Sign' and select the PSBT.`,
    });
    messages.push({
      state: ACTIVE,
      level: INFO,
      code: "coldcard.sign_psbt",
      text: `Verify the transaction details and sign.`,
    });
    messages.push({
      state: ACTIVE,
      level: INFO,
      code: "coldcard.upload_signed_psbt",
      text: `Upload the signed PSBT below.`,
    });
    return messages;
  }

  /**
   * Request for the PSBT data that needs to be signed.
   * @returns {Object} Returns the local unsigned PSBT from transaction details
   */
  request() {
    // TODO:  use unchained-bitcoin to build the PSBT from the other parameters we need to return
    return this.psbt;
  }

  /**
   *
   * @param {Object} psbtObject - the PSBT
   * @returns {Object} signatures - This calls a function in unchained-bitcoin which parses
   * PSBT files for sigantures and then returns an object with the format
   * {
   *   pubkey1 : [sig1, sig2, ...],
   *   pubkey2 : [sig1, sig2, ...]
   * }
   * This format may change in the future or there may be additional options for return type.
   */
  parse(psbtObject) {
    const signatures = parseSignaturesFromPSBT(psbtObject);
    if ((!signatures) || signatures.length === 0) {
      throw new Error("No signatures found in the PSBT. Did you upload the right one?");
    }
    return signatures;
  }
}

/**
 * Returns a valid multisig wallet config text file to send over to a Coldcard
 *
 * NOTE: technically only the root xfp of the signing device is required to be
 * correct, but we recommend only setting up the multisig wallet on the Coldcard
 * with complete xfp information. Here we actually turn this recommendation into a
 * requirement so as to minimize the number of wallet-config installations.
 *
 * This will likely move to its own generic class soon, and we'll only leave
 * the specifics of `adapt()` behind.
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
export class ColdcardMultisigWalletConfig {
  constructor({ jsonConfig }) {
    if (typeof jsonConfig === "object") {
      this.jsonConfig = jsonConfig;
    } else if (typeof jsonConfig === "string") {
      try {
        this.jsonConfig = JSON.parse(jsonConfig);
      } catch (error) {
        throw new Error("Unable to parse JSON.");
      }
    } else {
      throw new Error("Not valid JSON.");
    }

    if ((this.jsonConfig.uuid || this.jsonConfig.name)) {
      this.name = this.jsonConfig.uuid || this.jsonConfig.name;
    } else {
      throw new Error("Configuration file needs a UUID or a name.");
    }

    if (this.jsonConfig.quorum.requiredSigners && this.jsonConfig.quorum.totalSigners) {
      this.requiredSigners = this.jsonConfig.quorum.requiredSigners;
      this.totalSigners = this.jsonConfig.quorum.totalSigners;
    } else {
      throw new Error("Configuration file needs quorum.requiredSigners and quorum.totalSigners.");
    }

    if (this.jsonConfig.addressType) {
      this.addressType = jsonConfig.addressType;
    } else {
      throw new Error("Configuration file needs addressType.");
    }

    if (this.jsonConfig.extendedPublicKeys &&
      this.jsonConfig.extendedPublicKeys.every((xpub) => {
        // For each xpub, check that xfp exists, the length is 8, type is string, and valid hex
        if (!xpub.xfp || xpub.xfp === "Unknown") {
          throw new Error("ExtendedPublicKeys missing at least one xfp.");
        }
        if (typeof xpub.xfp !== 'string') {
          throw new Error("XFP not a string");
        }
        if (xpub.xfp.length !== 8) {
          throw new Error("XFP not length 8");
        }
        if (isNaN(Number(`0x${xpub.xfp}`))) {
          throw new Error("XFP is invalid hex");
        }
        return true;
      })) {
      this.extendedPublicKeys = this.jsonConfig.extendedPublicKeys;
    } else {
      throw new Error("Configuration file needs extendedPublicKeys.");
    }
  }

  /**
   * @returns {string} output to be written to a text file and uploaded to Coldcard.
   */
  adapt() {
    // Coldcard configs can't have spaces in the names, it just splits on space and takes the first word.
    // Currently operating without derivation paths per xpub until feature is added.
    let output = `# Coldcard Multisig setup file (exported from unchained-wallets)
# https://github.com/unchained-capital/unchained-wallets
# v${WALLET_CONFIG_VERSION}
# 
Name: ${this.name}
Policy: ${this.requiredSigners} of ${this.totalSigners}
Format: ${this.addressType}

`;
    // We need to loop over xpubs and output `xfp: xpub` for each
    let xpubs = this.extendedPublicKeys.map((xpub) => `${xpub.xfp}: ${xpub.xpub}`);
    output += xpubs.join("\r\n");
    output += "\r\n";
    return output;
  }
}

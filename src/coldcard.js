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
} from "unchained-bitcoin";
import {
  IndirectKeystoreInteraction,
  PENDING,
  ACTIVE,
  INFO,
} from "./interaction";

export const COLDCARD = 'coldcard';
export const COLDCARD_BASE_BIP32 = `m/45'`;
export const WALLET_CONFIG_VERSION = "0.0.1";

/**
 * Base class for interactions with Coldcard
 *
 * @extends {module:interaction.IndirectKeystoreInteraction}
 */
export class ColdcardInteraction extends IndirectKeystoreInteraction {
}

/**
 * Base class for file-based interactions with Coldcard
 *
 * @extends {module:coldcard.ColdcardInteraction}
 */
export class ColdcardFileParser extends ColdcardInteraction {

  /**
   *
   * @param {object} options - options argument
   * @param {string} options.network - bitcoin network (needed for derivations)
   */
  constructor({network}) {
    super();
    if ([MAINNET, TESTNET].find(net => net === network)) {
      this.network = network;
    } else {
      throw new Error("Unknown network.");
    }
  }

  messages() {
    const messages = super.messages();
    messages.push({
      state: PENDING,
      level: INFO,
      code: "coldcard.upload",
      text: "Upload the file from your Coldcard.",
    });
    return messages;
  }

  /**
   * Parse the Coldcard JSON file and reshape it into a more useful Object
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
    //   (or at least a hardened path deeper than m/45')

    if (typeof file === "object") {
      this.xpubJSONFile = file;
    } else if (typeof file === "string") {
      try {
        this.xpubJSONFile = JSON.parse(file);
      } catch (error) {
        throw new Error("Unable to parse JSON.");
      }
    } else {
      throw new Error("Not valid JSON.");
    }
    if (Object.keys(this.xpubJSONFile).length === 0) {
      throw new Error("Empty JSON file.");
    }

    const xpub = this.xpubJSONFile.p2sh;
    const bip32Path = this.xpubJSONFile.p2sh_deriv;
    const rootFingerprint = this.xpubJSONFile.xfp ? this.xpubJSONFile.xfp.toLowerCase() : null;

    if (!xpub) {
      throw new Error("No extended public key in JSON file.");
    }
    const xpubClass = ExtendedPublicKey.fromBase58(xpub);

    if (!bip32Path) {
      throw new Error("No BIP32 path in JSON file.");
    }
    if (!rootFingerprint && xpubClass.depth !== 1) {
      throw new Error("No xfp in JSON file.");
    }

    // We can only find the fingerprint in the xpub if the depth is one
    // because the xpub includes its parent's fingerprint.
    let xfpFromWithinXpub;
    /* istanbul ignore else */
    if (xpubClass.depth === 1) {
      xfpFromWithinXpub = fingerprintToFixedLengthHex(xpubClass.parentFingerprint).toLowerCase();
    }

    // Sanity check if you send in a depth one xpub, we should get the same fingerprint
    if ((xfpFromWithinXpub && rootFingerprint) &&
      xfpFromWithinXpub !== rootFingerprint) {
      throw new Error("Computed fingerprint does not match the one in the file.");
    }

    return {
      xpub,
      rootFingerprint: rootFingerprint || xfpFromWithinXpub
    };
    }

  /**
   * This method will take the xpub that's been sent in
   * and derive deeper if necessary (and able) using
   * functionality from unchained-bitcoin
   *
   * @param {Object} baseXpub - xpub pulled out of Coldcard JSON
   * @returns {Object} the desired xpub (if possible)
   *
   */
  deriveXpubIfNecessary(baseXpub) {
    // One could just hang keys off of the base bip32 path
    // We do not recommend that, but also do not prevent it.
    if (this.bip32Path && this.bip32Path !== COLDCARD_BASE_BIP32) {
      const derivPath = this.bip32Path.substr(0, COLDCARD_BASE_BIP32.length) === COLDCARD_BASE_BIP32
        ? this.bip32Path.substr(COLDCARD_BASE_BIP32.length + 1) //+ 1 to go past the slash
        : null;
      if (derivPath) {
        return deriveChildExtendedPublicKey(baseXpub, derivPath, this.network);
      } else {
        throw new Error("Problem with bip32 path format.");
      }
    }
    return baseXpub;
  }
}

/**
 * Reads a public key and (optionally) derives deeper from data in an
 * exported JSON file uploaded from the Coldcard.
 *
 * @extends {module:coldcard.ColdcardFileParser}
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
export class ColdcardExportPublicKey extends ColdcardFileParser {


  /**
   *
   * @param {object} options - options argument
   * @param {string} options.bip32Path - BIP32 paths
   * @param {string} options.network - bitcoin network (needed for derivations)
   */
  constructor({bip32Path, network}) {
    super({network});
    this.network = network;
    if (bip32Path) {
      if (typeof bip32Path === 'string') {
        this.bip32Path = bip32Path;
      } else {
        throw new Error("Bip32 path should be a string like `m/45'`");
      }
    } else {
      this.bip32Path = COLDCARD_BASE_BIP32;
    }
  }

  messages() {
    const messages = super.messages();
    messages.unshift({
      state: PENDING,
      level: INFO,
      code: "coldcard.export",
      text: "Go to Settings > Multisig Wallets > Export XPUB",
    });
    return messages;
  }

  parse(xpubJSONFile) {
    const result = super.parse(xpubJSONFile);
    let xpub = super.deriveXpubIfNecessary(result.xpub);

    const publicKey = ExtendedPublicKey.fromBase58(xpub).pubkey;
    const rootFingerprint = result.rootFingerprint;

    return {
      publicKey,
      rootFingerprint,
      bip32Path: this.bip32Path,
    };
  }

}

/**
 * Reads an extended public key and (optionally) derives deeper from data in an
 * exported JSON file uploaded from the Coldcard.
 *
 * @extends {module:coldcard.ColdcardFileParser}
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
export class ColdcardExportExtendedPublicKey extends ColdcardFileParser {

  /**
   *
   * @param {object} options - options argument
   * @param {string} options.bip32Path - BIP32 paths
   * @param {string} options.network - bitcoin network (needed for derivations)
   */
  constructor({bip32Path, network}) {
    super({network});
    if (bip32Path) {
      if (typeof bip32Path === 'string') {
        this.bip32Path = bip32Path;
      } else {
        throw new Error("Bip32 path should be a string like `m/45'`");
      }
    } else {
      this.bip32Path = COLDCARD_BASE_BIP32;
    }
  }

  messages() {
    const messages = super.messages();
    messages.unshift({
      state: PENDING,
      level: INFO,
      code: "coldcard.export",
      text: "Go to Settings > Multisig Wallets > Export XPUB",
    });
    return messages;
  }

  parse(xpubJSONFile) {
    const result = super.parse(xpubJSONFile);
    let xpub = super.deriveXpubIfNecessary(result.xpub);

    const rootFingerprint = result.rootFingerprint;

    return {
      xpub,
      rootFingerprint,
      bip32Path: this.bip32Path,
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
   * @param {object} options.psbt - optional PSBT
   */
  constructor({network, inputs, outputs, bip32Paths, psbt}) {
    super();
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
      code: "coldcard.prepare",
      text: `Ensure your Coldcard has the multisig wallet installed.`,
    });
    messages.push({
      state: PENDING,
      level: INFO,
      code: "coldcard.prepare",
      text: `Download and save this PSBT file to your SD card.`,
    });
    messages.push({
      state: PENDING,
      level: INFO,
      code: "coldcard.prepare",
      text: `Transfer the PSBT file to your Coldcard.`,
    });

    messages.push({
      state: ACTIVE,
      level: INFO,
      code: "coldcard.sign",
      text: `Transfer the PSBT file to your Coldcard.`,
    });
    messages.push({
      state: ACTIVE,
      level: INFO,
      code: "coldcard.sign",
      text: `Choose 'Ready To Sign' and select the PSBT.`,
    });
    messages.push({
      state: ACTIVE,
      level: INFO,
      code: "coldcard.sign",
      text: `Verify the transaction details and sign.`,
    });
    messages.push({
      state: ACTIVE,
      level: INFO,
      code: "coldcard.sign",
      text: `Upload the signed PSBT below.`,
    });
    return messages;
  }

  /**
   * Request for the PSBT data that needs to be signed.
   * @returns {Object} Returns the local unsigned PSBT from transaction details
   */
  request() {
    if (this.psbt) {
      return this.psbt;
    } else {
      // TODO:  use unchained-bitcoin to build the PSBT from the other parameters we need to return
      return null;
    }
  }

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
 * NOTE: only the root xfp of the signing device is required to be correct, but we
 * recommend only setting up the multisig wallet on the Coldcard with complete xfp
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
      throw new Error("Not valid JSON.")
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
      throw new Error("Configuration file needs addressType.")
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
      throw new Error("Configuration file needs extendedPublicKeys.")
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

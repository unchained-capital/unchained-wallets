import {
  ExtendedPublicKey,
  P2SH,
  P2SH_P2WSH,
  P2WSH,
  validateBIP32Path,
  validateExtendedPublicKey,
  validateRootFingerprint,
  BraidDetails,
  getMaskedDerivation,
} from "unchained-bitcoin";
import { WalletPolicy } from "./vendor/ledger-bitcoin";
import { MultisigWalletConfig } from "./types";

export class KeyOrigin {
  private xfp: string;

  private bip32Path: string;

  private xpub: string;

  constructor({ xfp, bip32Path, xpub, network }) {
    validateRootFingerprint(xfp);
    this.xfp = xfp;
    validateBIP32Path(bip32Path);
    this.bip32Path = bip32Path;
    validateExtendedPublicKey(xpub, network);
    this.xpub = xpub;
  }

  /**
   * Returns a key origin information in descriptor format
   * @returns {string} policy template string
   */
  toString() {
    let path = this.bip32Path;
    if (this.bip32Path[0] === "m") {
      path = this.bip32Path.slice(1);
    }

    return `[${this.xfp}${path}]${this.xpub}`;
  }

  // TODO: Needs a way to turn a serialized key origin to instance of class
}

export type MultisigScriptType = "sh" | "wsh" | "tr";

/**
 * Takes a wallet config and translates it into a wallet policy template string
 * @param {MultisigWalletConfig} walletConfig - multisig wallet configuration object
 * @returns {string} valid policy template string
 */
export const getPolicyTemplateFromWalletConfig = (
  walletConfig: MultisigWalletConfig
) => {
  let scriptType: MultisigScriptType;
  let requiredSigners = Number(walletConfig.quorum.requiredSigners);
  let nested = false;
  switch (walletConfig.addressType) {
    case P2SH:
      scriptType = "sh";
      break;
    case P2WSH:
      scriptType = "wsh";
      break;
    case "P2TR":
      scriptType = "tr";
      break;
    case P2SH_P2WSH:
      scriptType = "wsh";
      nested = true;
      break;
    default:
      throw new Error(`Unknown address type: ${walletConfig.addressType}`);
  }

  const signersString = walletConfig.extendedPublicKeys
    .map((_, index) => `@${index}/**`)
    .join(",");

  // TODO: should this always assume sorted?
  const policy = `${scriptType}(sortedmulti(${requiredSigners},${signersString}))`;
  if (nested) return `sh(${policy})`;

  return policy;
};

export const getKeyOriginsFromWalletConfig = (
  walletConfig: MultisigWalletConfig
): KeyOrigin[] => {
  return walletConfig.extendedPublicKeys.map((key): KeyOrigin => {
    const xpub = ExtendedPublicKey.fromBase58(key.xpub);
    xpub.setNetwork(walletConfig.network);
    return new KeyOrigin({
      xfp: key.xfp,
      xpub: xpub.toBase58(),
      // makes sure to support case where derivation is "unknown" and we want to mask it
      bip32Path: getMaskedDerivation(key),
      network: walletConfig.network,
    });
  });
};

export class MultisigWalletPolicy {
  private name: string;

  private template: string;

  private keyOrigins: KeyOrigin[];

  constructor({
    name,
    template,
    keyOrigins,
  }: {
    name: string;
    template: string;
    keyOrigins: KeyOrigin[];
  }) {
    // this is an unstated restriction from ledger
    // if we don't check it here then registration will fail
    // with an opaque error about invalid input data
    // TODO: should this be left as full length and only
    // abbreviated when translating to a ledger policy?
    if (name.length > 64) {
      console.warn(
        `Wallet policy name too long. (${name.length}) greater than max of 64 chars.`
      );
      this.name = `${name.slice(0, 61)}...`;
    } else {
      this.name = name;
    }

    validateMultisigPolicyTemplate(template);
    this.template = template;

    const totalSignerCount = getTotalSignerCountFromTemplate(template);
    if (totalSignerCount !== keyOrigins.length) {
      throw new Error(
        `Expected ${totalSignerCount} key origins but ${keyOrigins.length} were passed`
      );
    }
    this.keyOrigins = keyOrigins;
  }

  toJSON() {
    return JSON.stringify({
      name: this.name,
      template: this.template,
      keyOrigins: this.keyOrigins,
    });
  }

  toLedgerPolicy() {
    return new WalletPolicy(
      this.name,
      this.template,
      this.keyOrigins.map((ko) => ko.toString())
    );
  }

  get keys() {
    return this.keyOrigins.map((ko) => ko.toString());
  }

  static FromWalletConfig(config: MultisigWalletConfig): MultisigWalletPolicy {
    const template = getPolicyTemplateFromWalletConfig(config);
    const keyOrigins = getKeyOriginsFromWalletConfig(config);
    const name = config.name || config.uuid;
    if (!name) throw new Error("Policy template requires a name");

    return new this({ name, template, keyOrigins });
  }
}

export const validateMultisigPolicyScriptType = (template) => {
  const acceptedScripts = ["sh", "wsh"];
  let hasMatch = acceptedScripts.some((script) => template.startsWith(script));

  if (!hasMatch)
    throw new Error(
      `Invalid script type in template ${template}. Only script types \
${acceptedScripts.join(", ")} accepted`
    );
};

export const validateMultisigPolicyKeys = (template) => {
  const requiredSigners = Number(template.match(/\d+/)[0]);

  if (!requiredSigners)
    throw new Error(
      "Expected to find a required number of signers from the quorum"
    );

  const count = getTotalSignerCountFromTemplate(template);

  if (!count || count < requiredSigners) {
    throw new Error(
      `Required signers in policy ${template} is ` +
        `${requiredSigners} but found only ${count} total keys`
    );
  }
};

export const getTotalSignerCountFromTemplate = (template) => {
  return template.match(/@\d+\/\*\*/g).length;
};

export const validateMultisigPolicyTemplate = (template) => {
  validateMultisigPolicyScriptType(template);
  validateMultisigPolicyKeys(template);
};

// Mostly useful for dealing with test fixtures and objects from caravan
export const braidDetailsToWalletConfig = (braidDetails: BraidDetails) => {
  return {
    network: braidDetails.network,
    extendedPublicKeys: braidDetails.extendedPublicKeys.map((key) => ({
      xpub: key.base58String,
      bip32Path: key.path,
      xfp: key.rootFingerprint,
    })),
    quorum: {
      requiredSigners: braidDetails.requiredSigners,
      totalSigners: braidDetails.extendedPublicKeys.length,
    },
    name: `${braidDetails.requiredSigners}-of-${braidDetails.extendedPublicKeys.length} ${braidDetails.addressType} ${braidDetails.network} wallet`,
    addressType: braidDetails.addressType,
  };
};

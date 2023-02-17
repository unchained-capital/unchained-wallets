import {
  Braid,
  validateBIP32Path,
  validateExtendedPublicKey,
  validateRootFingerprint,
} from "unchained-bitcoin";
import { WalletPolicy } from "./vendor/ledger-bitcoin";
import { BitcoinNetwork } from "./types";

export class KeyOrigin {
  xfp: string;

  bip32Path: string;

  xpub: string;

  network: BitcoinNetwork;

  constructor({ xfp, bip32Path, xpub, network }) {
    this.network = network;
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
 * Takes a Braid instance and translates it into a wallet policy template string
 * @param {Braid} braid - instance of a braid object from unchained-bitcoin
 * @returns {string} valid policy template string
 */
export const getPolicyTemplateFromBraid = (braid: Braid) => {
  let scriptType: MultisigScriptType;
  let requiredSigners = Number(braid.requiredSigners);
  let nested = false;
  switch (braid.addressType) {
    case "P2SH":
      scriptType = "sh";
      break;
    case "P2WSH":
      scriptType = "wsh";
      break;
    case "P2TR":
      scriptType = "tr";
      break;
    case "P2SH-P2WSH":
      scriptType = "wsh";
      nested = true;
      break;
    default:
      throw new Error(`Unknown address type: ${braid.addressType}`);
  }

  const signersString = braid.extendedPublicKeys
    .map((_, index) => `@${index}/**`)
    .join(",");

  // TODO: should this always assume sorted?
  const policy = `${scriptType}(sortedmulti(${requiredSigners},${signersString}))`;
  if (nested) return `sh(${policy})`;

  return policy;
};

export const getKeyOriginsFromBraid = (braid: Braid): KeyOrigin[] => {
  return braid.extendedPublicKeys.map(
    (key): KeyOrigin =>
      new KeyOrigin({
        xfp: key.rootFingerprint,
        xpub: key.base58String,
        bip32Path: key.path,
        network: braid.network,
      })
  );
};

export class MultisigWalletPolicy {
  name: string;

  template: string;

  keyOrigins: KeyOrigin[];

  constructor({
    name,
    template,
    keyOrigins,
  }: {
    name: string;
    template: string;
    keyOrigins: KeyOrigin[];
  }) {
    this.name = name;

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
}

export const validateMultisigPolicyScriptType = (template) => {
  const acceptedScripts = ["sh", "wsh"];
  let hasMatch = acceptedScripts.some((script) => template.startsWith(script));

  if (!hasMatch) throw new Error(
      `Invalid script type in template ${template}. Only script types \
${acceptedScripts.join(", ")} accepted`
    );
};

export const validateMultisigPolicyKeys = (template) => {
  const requiredSigners = Number(template.match(/\d+/)[0]);

  if (!requiredSigners) throw new Error(
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

import {
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

export class MutlisigWalletPolicy {
  name: string;
  policyTemplate: string;
  keyOrigins: KeyOrigin[];

  constructor({ name, policyTemplate, keyOrigins }) {
    this.name = name;

    validateMultisigPolicyTemplate(policyTemplate);
    this.policyTemplate = policyTemplate;

    const totalSignerCount = getTotalSignerCountFromTemplate(policyTemplate);
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
      policyTemplate: this.policyTemplate,
      keyOrigins: this.keyOrigins,
    });
  }

  toLedgerPolicy() {
    return new WalletPolicy(
      this.name,
      this.policyTemplate,
      this.keyOrigins.map((ko) => ko.toString())
    );
  }
}

export const validateMultisigPolicyScriptType = (template) => {
  const acceptedScripts = ["sh", "wsh"];
  let hasMatch = false;
  for (const script of acceptedScripts) {
    if (template.match(`^${script}`)) {
      hasMatch = true;
      break;
    }
  }

  if (!hasMatch)
    throw new Error(`Only script types ${acceptedScripts.join(", ")} accepted`);
};

export const validateMultisigPolicyKeys = (template) => {
  const requiredSigners = +template.match(/\d+/)[0];

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

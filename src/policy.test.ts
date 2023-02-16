/**
 * @jest-environment jsdom
 */

import { Braid, TESTNET, TEST_FIXTURES } from "unchained-bitcoin";
import {
  KeyOrigin,
  MutlisigWalletPolicy,
  validateMultisigPolicyTemplate,
  getPolicyTemplateFromBraid,
} from "./policy";

describe("validateMultisigPolicyTemplate", () => {
  it("throws error if script type is not supported", () => {
    const templates = [
      "pkh(@0/**)",
      "tr(@0/**)",
      "wpkh(@0/**)",
      "foobar(@0/**)",
      "(@0/**)",
    ];

    for (const template of templates) {
      expect(() => validateMultisigPolicyTemplate(template)).toThrowError();
    }
  });

  it("throws if required signers is invalid", () => {
    const templates = [
      "wsh(3,@0/**,@1/**)", // not enough signers
      "sh(@0/**)", // no required signers indicated
      "wsh()", // no keys or required signers
      "sh(2,@0,@1/**)", // policy is missing derivation wildcard
    ];

    for (const template of templates) {
      expect(() => validateMultisigPolicyTemplate(template)).toThrowError();
    }
  });

  it("does not throw if templates are valid", () => {
    const templates = [
      "wsh(2,@0/**,@1/**)",
      "sh(2,@0/**,@1/**)",
      "sh(2,@0/**,@1/**,@2/**)",
    ];

    for (const template of templates) {
      expect(() => validateMultisigPolicyTemplate(template)).not.toThrowError();
    }
  });
});

describe("MultisigWalletPolicy", () => {
  it("can return a wallet policy", () => {
    const path1 = "m/48'/1'/100'/1'";
    const path2 = "m/48'/1'/100'/2'";
    const origins = [path1, path2].map((path) => {
      const node = TEST_FIXTURES.keys.open_source.nodes[path];
      return new KeyOrigin({
        xfp: node.rootFingerprint,
        xpub: node.xpub,
        network: TESTNET,
        bip32Path: path,
      });
    });
    const policy = new MutlisigWalletPolicy({
      name: "My Test",
      template: "wsh(sortedmulti(2,@0/**,@1/**))",
      keyOrigins: origins,
    });

    expect(() => policy.toLedgerPolicy()).not.toThrow();
  });
});

describe("KeyOrigin", () => {
  it("correctly serializes key origin in descriptor format", () => {
    const options = {
      xfp: "76223a6e",
      bip32Path: "m/48'/1'/0'/2'",
      xpub: "tpubDE7NQymr4AFtewpAsWtnreyq9ghkzQBXpCZjWLFVRAvnbf7vya2eMTvT2fPapNqL8SuVvLQdbUbMfWLVDCZKnsEBqp6UK93QEzL8Ck23AwF",
      network: TESTNET,
    };

    expect(new KeyOrigin(options).toString()).toEqual(
      "[76223a6e/48'/1'/0'/2']tpubDE7NQymr4AFtewpAsWtnreyq9ghkzQBXpCZjWLFVRAvnbf7vya2eMTvT2fPapNqL8SuVvLQdbUbMfWLVDCZKnsEBqp6UK93QEzL8Ck23AwF"
    );
  });
});

describe("getPolicyTemplateFromBraid", () => {
  it("converts braids to valid policies", () => {
    for (const multisig of TEST_FIXTURES.multisigs) {
      const braid = Braid.fromData(multisig.braidDetails);
      const template = getPolicyTemplateFromBraid(braid);
      validateMultisigPolicyTemplate(template);
    }
  });
});

/**
 * @jest-environment jsdom
 */

import { TESTNET, TEST_FIXTURES } from "unchained-bitcoin";
import {
  KeyOrigin,
  validateMultisigPolicyTemplate,
  getPolicyTemplateFromWalletConfig,
  braidDetailsToWalletConfig,
} from "./policy";
import { POLICY_FIXTURE } from "./fixtures";
import { BraidDetails } from "./types";

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
    expect(() => POLICY_FIXTURE.policy.toLedgerPolicy()).not.toThrow();
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

describe("getPolicyTemplateFromWalletConfig", () => {
  it("converts braids to valid policies", () => {
    for (const multisig of TEST_FIXTURES.multisigs) {
      const walletConfig = braidDetailsToWalletConfig(
        multisig.braidDetails as unknown as BraidDetails
      );
      const template = getPolicyTemplateFromWalletConfig(walletConfig);
      validateMultisigPolicyTemplate(template);
    }
  });
});

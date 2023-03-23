/**
 * @jest-environment jsdom
 */

import { TESTNET, TEST_FIXTURES, BraidDetails } from "unchained-bitcoin";
import {
  KeyOrigin,
  validateMultisigPolicyTemplate,
  getPolicyTemplateFromWalletConfig,
  braidDetailsToWalletConfig,
  MultisigWalletPolicy,
} from "./policy";
import { POLICY_FIXTURE } from "./fixtures";
import { MultisigWalletConfig } from "./types";

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

  const cases = TEST_FIXTURES.multisigs.map((multisig) => ({
    ...multisig.braidDetails,
    name: multisig.description,
    extendedPublicKeys: multisig.braidDetails.extendedPublicKeys.map((key) => ({
      xpub: key.base58String,
      bip32Path: key.path,
      xfp: key.rootFingerprint,
    })),
    quorum: { requiredSigners: multisig.braidDetails.requiredSigners },
  }));

  test.each(cases)(
    `can convert to a policy from wallet config $case.name`,
    (vect) => {
      expect(() =>
        MultisigWalletPolicy.FromWalletConfig(
          (<unknown>vect) as MultisigWalletConfig
        )
      ).not.toThrow();
    }
  );

  test.each(cases)(
    `can return serialized list of key origins $case.name`,
    (vect) => {
      const policy = MultisigWalletPolicy.FromWalletConfig(
        (<unknown>vect) as MultisigWalletConfig
      );
      expect(policy.keys).toHaveLength(vect.extendedPublicKeys.length);
      for (const key of vect.extendedPublicKeys) {
        const ko = new KeyOrigin({ ...key, network: vect.network });
        expect(policy.keys.includes(ko.toString())).toBeTruthy();
      }
    }
  );

  it("trims wallet name with trailing space", () => {
    const config = (<unknown>cases[0]) as MultisigWalletConfig;
    config.name += " ";
    const policy = MultisigWalletPolicy.FromWalletConfig(config);
    expect(policy.name).toEqual(config.name?.trim());
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
        (<unknown>multisig.braidDetails) as BraidDetails
      );
      const template = getPolicyTemplateFromWalletConfig(walletConfig);
      validateMultisigPolicyTemplate(template);
    }
  });
});

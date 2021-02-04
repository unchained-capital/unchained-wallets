import {
  CustomExportExtendedPublicKey,
  CustomSignMultisigTransaction,
} from "./custom";
import { MAINNET, TESTNET, TEST_FIXTURES } from "unchained-bitcoin";
import { INFO, PENDING, ACTIVE, ERROR } from "./interaction";
import { customFixtures } from "./custom.fixtures";

const { multisigs, transactions } = TEST_FIXTURES;

describe("CustomExportExtendedPublicKey", () => {
  function interactionBuilder({ bip32Path, network }) {
    return new CustomExportExtendedPublicKey({
      bip32Path,
      network,
    });
  }

  describe("constructor", () => {
    it("fails with invalid network", () => {
      expect(() => interactionBuilder({ network: "foob" })).toThrow(
        /Unknown network/i
      );
    });
    it("invalid bip32Path unsupported", () => {
      const interaction = interactionBuilder({
        network: TESTNET,
        bip32Path: "m/45'/1/01",
      });
      expect(interaction.isSupported()).toBe(false);
      expect(
        interaction.hasMessagesFor({
          state: PENDING,
          level: ERROR,
          code: "custom.bip32_path.path_error",
        })
      ).toBe(true);
    });
  });

  describe("parse", () => {
    it("fails when sending in nothing or non json", () => {
      const notJSON = "test";
      const definitelyNotJSON = 77;
      const interaction = interactionBuilder({
        network: TESTNET,
        bip32Path: "m/45'/1/0",
      });
      expect(() => interaction.parse(notJSON)).toThrow(
        /Not a valid ExtendedPublicKey/i
      );
      expect(() => interaction.parse(definitelyNotJSON)).toThrow(
        /Not a valid ExtendedPublicKey/i
      );
      expect(() => interaction.parse({})).toThrow(
        /Not a valid ExtendedPublicKey/i
      );
    });

    it("fails when missing xpub field", () => {
      const interaction = interactionBuilder({
        network: MAINNET,
        bip32Path: "m/45'/1'/0'",
      });
      const missingXpub = {
        ...customFixtures.validCustomTpubJSON,
      };
      Reflect.deleteProperty(missingXpub, "xpub");
      expect(() => interaction.parse(missingXpub)).toThrow(
        /Not a valid ExtendedPublicKey/i
      );
    });

    it("testnet no rootFingerprint is included so it gets computed", () => {
      const bip32Path = "m/45'/0'/0'";
      const interaction = interactionBuilder({
        network: TESTNET,
        bip32Path,
      });
      const missingXfp = { ...customFixtures.validCustomXpubJSON };
      Reflect.deleteProperty(missingXfp, "rootFingerprint");
      const result = interaction.parse(missingXfp);

      expect(result).toEqual(customFixtures.validXpubFakeRootFingerprintOutput);
    });

    it("mainnet no rootFingerprint is included so it gets computed", () => {
      const bip32Path = "m/45'/1'/0'";
      const interaction = interactionBuilder({
        network: TESTNET,
        bip32Path,
      });
      const missingXfp = { ...customFixtures.validCustomTpubJSON };
      Reflect.deleteProperty(missingXfp, "rootFingerprint");
      const result = interaction.parse(missingXfp);

      expect(result).toEqual(customFixtures.validTpubFakeRootFingerprintOutput);
    });

    it("invalid rootFingerprint included", () => {
      const bip32Path = "m/45'/1'/0'";
      const interaction = interactionBuilder({
        network: TESTNET,
        bip32Path,
      });
      expect(() =>
        interaction.parse({
          xpub: customFixtures.validCustomTpubJSON.xpub,
          rootFingerprint: "zzzz",
        })
      ).toThrow(/Root fingerprint validation error/i);
    });

    it("should error as bip32 depth does not match depth in xpub param", () => {
      let bip32Path = "m/45'";
      const interaction = interactionBuilder({
        network: TESTNET,
        bip32Path,
      });

      expect(() =>
        interaction.parse(customFixtures.validCustomTpubJSON)
      ).toThrow(/does not match depth of BIP32 path/i);
    });

    it("should error as bip32 depth does not match depth in xpub param (bip32 missing m/ for whatever reason)", () => {
      let bip32Path = "45'/0'";
      const interaction = interactionBuilder({
        network: TESTNET,
        bip32Path,
      });

      expect(() =>
        interaction.parse(customFixtures.validCustomTpubJSON)
      ).toThrow(/does not match depth of BIP32 path/i);
    });
  });

  it("has a message about uploading file", () => {
    expect(
      interactionBuilder({
        network: TESTNET,
        bip32Path: "m/45'",
      }).hasMessagesFor({
        state: PENDING,
        level: INFO,
        code: "custom.import_xpub",
        text: "Type or paste the extended public key here.",
      })
    ).toBe(true);
  });
});

describe("CustomSignMultisigTransaction", () => {
  function interactionBuilder({ network, inputs, outputs, bip32Paths, psbt }) {
    return new CustomSignMultisigTransaction({
      network,
      inputs,
      outputs,
      bip32Paths,
      psbt,
    });
  }
  describe("constructor", () => {
    it("fails when sending in no psbt", () => {
      expect(() => interactionBuilder({})).toThrow(/Unable to build the PSBT/i);
    });
  });

  describe("request", () => {
    it("return psbt if there is one", () => {
      const interaction = interactionBuilder({
        network: TESTNET,
        psbt: multisigs[0].psbt,
      });
      const result = interaction.request();
      expect(result).toEqual(multisigs[0].psbt);
    });

    it("construct psbt if there is not one", () => {
      const interaction = interactionBuilder({
        network: transactions[0].network,
        inputs: transactions[0].inputs,
        outputs: transactions[0].outputs,
        bip32Paths: transactions[0].bip32Paths,
      });
      const result = interaction.request().toBase64();
      expect(result).toEqual(transactions[0].psbt);
    });
  });

  describe("parse", () => {
    it("return multi input, single signature set", () => {
      const interaction = interactionBuilder({
        psbt: multisigs[0].psbtPartiallySigned,
      });
      const result = interaction.parse(multisigs[0].psbtPartiallySigned);
      const signatureSet = {};
      signatureSet[multisigs[0].publicKey] = multisigs[0].transaction.signature;
      expect(result).toEqual(signatureSet);
      expect(Object.keys(result).length).toEqual(1);
    });
    it("psbt has no signatures", () => {
      const interaction = interactionBuilder({ psbt: multisigs[0].psbt });
      expect(() => interaction.parse(multisigs[0].psbt)).toThrow(
        /No signatures found/i
      );
    });
  });

  it("has a message about downloading psbt", () => {
    expect(
      interactionBuilder({
        network: TESTNET,
        psbt: multisigs[0].psbt,
      }).hasMessagesFor({
        state: PENDING,
        level: INFO,
        code: "custom.download_psbt",
        text: "Download and save this PSBT file.",
      })
    ).toBe(true);
  });
  it("has a message about signing psbt", () => {
    expect(
      interactionBuilder({
        network: TESTNET,
        psbt: multisigs[0].psbt,
      }).hasMessagesFor({
        state: PENDING,
        level: INFO,
        code: "custom.sign_psbt",
        text: `Add your signature to the PSBT.`,
      })
    ).toBe(true);
  });
  it("has a message about verify tx", () => {
    expect(
      interactionBuilder({
        network: TESTNET,
        psbt: multisigs[0].psbt,
      }).hasMessagesFor({
        state: ACTIVE,
        level: INFO,
        code: "custom.sign_psbt",
        text: "Verify the transaction details and sign.",
      })
    ).toBe(true);
  });
  it("has a message about upload PSBT", () => {
    expect(
      interactionBuilder({
        network: TESTNET,
        psbt: multisigs[0].psbt,
      }).hasMessagesFor({
        state: ACTIVE,
        level: INFO,
        code: "custom.upload_signed_psbt",
        text: "Upload the signed PSBT.",
      })
    ).toBe(true);
  });
});

import {
  MAINNET,
  TEST_FIXTURES,
} from "unchained-bitcoin";
import {
  PENDING,
  ACTIVE,
  INFO,
} from "./interaction";

import {
  trezorCoin,
  TrezorInteraction,
  TrezorGetMetadata,
  TrezorExportHDNode,
  TrezorExportPublicKey,
  TrezorExportExtendedPublicKey,
  TrezorSignMultisigTransaction,
  TrezorConfirmMultisigAddress,
} from "./trezor";

const TrezorConnect = require("trezor-connect").default;

function itHasStandardMessages(interactionBuilder) {
  it("has a message about ensuring your device is plugged in", () => {
    expect(interactionBuilder().hasMessagesFor({
      state: PENDING,
      level: INFO,
      code: "device.connect",
      text: "plugged in",
    })).toBe(true);
  });

  it("has a message about the TrezorConnect popup and enabling popups", () => {
    expect(interactionBuilder().hasMessagesFor({
      state: ACTIVE,
      level: INFO,
      code: "trezor.connect.generic",
      text: "enabled popups",
    })).toBe(true);
  });
}

function itThrowsAnErrorOnAnUnsuccessfulRequest(interactionBuilder) {

  it("throws an error on an unsuccessful request", async () => {
    const interaction = interactionBuilder();
    interaction.connectParams = () => ([
      () => ({
        success: false,
        payload: {error: "foobar"},
      }), {},
    ]);
    try {
      await interaction.run();
    } catch (e) {
      expect(e.message).toMatch(/foobar/i);
    }
  });

}


describe('trezor', () => {

  describe('TrezorInteraction', () => {

    function interactionBuilder() { return new TrezorInteraction({network: MAINNET}); }

    itHasStandardMessages(interactionBuilder);
    itThrowsAnErrorOnAnUnsuccessfulRequest(interactionBuilder);

    it("sets the default method to throw an error", async () => {
      try {
        await interactionBuilder().run();
      } catch (e) {
        expect(e.message).toMatch(/subclass of TrezorInteraction/i);
      }
    });

  });

  describe("TrezorGetMetadata", () => {

    function interactionBuilder() { return new TrezorGetMetadata({network: MAINNET}); }

    itHasStandardMessages(interactionBuilder);
    itThrowsAnErrorOnAnUnsuccessfulRequest(interactionBuilder);

    it("parses metadata", () => {

      expect(
        interactionBuilder().parse({
          bootloader_hash: "5112...846e9",
          bootloader_mode: null,
          device_id: "BDF9...F198",
          firmware_present: null,
          flags: 0,
          fw_major: null,
          fw_minor: null,
          fw_patch: null,
          fw_vendor: null,
          fw_vendor_keys: null,
          imported: false,
          initialized: true,
          label: "My Trezor",
          language: null,
          major_version: 1,
          minor_version: 6,
          model: "1",
          needs_backup: false,
          no_backup: null,
          passphrase_cached: false,
          passphrase_protection: false,
          patch_version: 3,
          pin_cached: true,
          pin_protection: true,
          revision: "ef8...862d7",
          unfinished_backup: null,
          vendor: "bitcointrezor.com",
        })).toEqual({
        spec: "Model 1 v.1.6.3 w/PIN",
        model: "Model 1",
        version: {
          major: 1,
          minor: 6,
          patch: 3,
          string: "1.6.3",
        },
        label: "My Trezor",
        pin: true,
        passphrase: false,
      });
    });

    it("uses TrezorConnect.getFeatures", () => {
      const interaction = interactionBuilder();
      const [method, params] = interaction.connectParams();
      expect(method).toEqual(TrezorConnect.getFeatures);
      expect(params).toEqual({});
    });

  });

  describe("TrezorExportHDNode", () => {

    const bip32Path = "m/45'/0'/0'/0'";

    function interactionBuilder() {
      return new TrezorExportHDNode({
        bip32Path,
        network: MAINNET,
      });
    }

    itHasStandardMessages(interactionBuilder);
    itThrowsAnErrorOnAnUnsuccessfulRequest(interactionBuilder);

    it("uses TrezorConnect.getPublicKey", () => {
      const interaction = interactionBuilder();
      const [method, params] = interaction.connectParams();
      expect(method).toEqual(TrezorConnect.getPublicKey);
      expect(params.path).toEqual(bip32Path);
      expect(params.coin).toEqual(trezorCoin(MAINNET));
      expect(params.crossChain).toBe(true);
    });

  });

  describe("TrezorExportPublicKey", () => {

    const bip32Path = "m/45'/0'/0'/0'";

    function interactionBuilder() {
      return new TrezorExportPublicKey({
        bip32Path,
        network: MAINNET,
      });
    }

    itHasStandardMessages(interactionBuilder);
    itThrowsAnErrorOnAnUnsuccessfulRequest(interactionBuilder);

    it("parses out the public key from the response payload", () => {
      expect(interactionBuilder().parse({publicKey: "foobar"})).toEqual("foobar");
    });

    it("uses TrezorConnect.getPublicKey", () => {
      const interaction = interactionBuilder();
      const [method, params] = interaction.connectParams();
      expect(method).toEqual(TrezorConnect.getPublicKey);
      expect(params.path).toEqual(bip32Path);
      expect(params.coin).toEqual(trezorCoin(MAINNET));
      expect(params.crossChain).toBe(true);
    });

  });

  describe("TrezorExportExtendedPublicKey", () => {

    const bip32Path = "m/45'/0'/0'/0'";

    function interactionBuilder() {
      return new TrezorExportExtendedPublicKey({
        bip32Path,
        network: MAINNET,
      });
    }

    itHasStandardMessages(interactionBuilder);
    itThrowsAnErrorOnAnUnsuccessfulRequest(interactionBuilder);

    it("parses out the extended public key from the response payload", () => {
      expect(interactionBuilder().parse({xpub: "foobar"})).toEqual("foobar");
    });

    it("uses TrezorConnect.getPublicKey", () => {
      const interaction = interactionBuilder();
      const [method, params] = interaction.connectParams();
      expect(method).toEqual(TrezorConnect.getPublicKey);
      expect(params.path).toEqual(bip32Path);
      expect(params.coin).toEqual(trezorCoin(MAINNET));
      expect(params.crossChain).toBe(true);
    });

  });

  describe("TrezorSignMultisigTransaction", () => {

    TEST_FIXTURES.transactions.forEach((fixture) => {

      describe(`signing for a transaction which ${fixture.description}`, () => {

        function interactionBuilder() { return new TrezorSignMultisigTransaction(fixture); }

        itHasStandardMessages(interactionBuilder);
        itThrowsAnErrorOnAnUnsuccessfulRequest(interactionBuilder);

        it("parses out the signatures from the response payload", () => {
          // Signature format:
          //   first byte signifies DER encoding           (0x30)
          //   second byte is length of signature in bytes (0x03)
          // The string length is however long the signature is minus these two starting bytes
          // plain signature without SIGHASH (foobar is 3 bytes, string length = 6, which is 3 bytes)
          expect(interactionBuilder().parse({signatures: ["3003foobar"]})).toEqual(["3003foobar01"]);
          // signature actually ends in 0x01 (foob01 is 3 bytes, string length = 6, which is 3 bytes)
          expect(interactionBuilder().parse({signatures: ["3003foob01"]})).toEqual(["3003foob0101"]);
          // signature with sighash already included (foobar is 3 bytes, string length = 8, which is 4 bytes) ...
          // we expect this to chop off the 01 and add it back
          expect(interactionBuilder().parse({signatures: ["3003foobar01"]})).toEqual(["3003foobar01"]);
        });

        it("uses TrezorConnect.signTransaction", () => {
          const interaction = interactionBuilder();
          const [method, params] = interaction.connectParams();
          expect(method).toEqual(TrezorConnect.signTransaction);
          expect(params.coin).toEqual(trezorCoin(fixture.network));
          expect(params.inputs.length).toEqual(fixture.inputs.length);
          expect(params.outputs.length).toEqual(fixture.outputs.length);
          // FIXME check inputs & output details
        });

      });

    });

  });

  describe("TrezorConfirmMultisigAddress", () => {

    TEST_FIXTURES.multisigs.forEach((fixture) => {

      describe(`displaying a ${fixture.description}`, () => {

        function interactionBuilder() { return new TrezorConfirmMultisigAddress(fixture); }

        itHasStandardMessages(interactionBuilder);
        itThrowsAnErrorOnAnUnsuccessfulRequest(interactionBuilder);

        it("uses TrezorConnect.getAddress", () => {
          const interaction = interactionBuilder();
          const [method, params] = interaction.connectParams();
          expect(method).toEqual(TrezorConnect.getAddress);
          expect(params.path).toEqual(fixture.bip32Path);
          expect(params.address).toEqual(fixture.address);
          expect(params.showOnTrezor).toBe(true);
          expect(params.coin).toEqual(trezorCoin(fixture.network));
          expect(params.crossChain).toBe(true);
          // FIXME check multisig details
        });

      });

    });
  });

});


//     describe("Test interactions.", () => {
//         describe("Test public key export interactions.", () => {

//             const interaction = new TrezorExportPublicKey({network: NETWORKS.TESTNET, bip32Path: "m/45'/1'/0'/1"});

//             it("should properly report messages for wallet state active", () => {
//                 //const actives =
//                 interaction.messagesFor({state:"active", excludeCodes: ["bip32"]});
//                 // console.log(actives); // TODO: what to test for
//             })

//             it("should properly report messages for wallet state pending", () => {
//                 //const pendings =
//                 interaction.messagesFor({state:"pending", excludeCodes: ["bip32"]});
//                 // console.log(pendings); // TODO: what to test for
//             })

//             it("should not report error for a valid state", () => {
//                 const hasError = interaction.hasMessagesFor({state:"active", level: 'error', code: "bip32"});
//                 expect(hasError).toBe(false);
//             })

//             const badInteraction = new TrezorExportPublicKey({network: NETWORKS.TESTNET, bip32Path: "m/45'/1"});
//             it("should not report error for not meeting the minimum path length for wallet state active", () => {
//                 const hasError = badInteraction.hasMessagesFor({state:"active", level: 'error', code: "trezor.bip32_path.minimum"});
//                 expect(hasError).toBe(false);
//             })

//             it("should properly report error for not meeting the minimum path length for wallet state pending", () => {
//                 const hasError = badInteraction.hasMessagesFor({state:"pending", level: 'error', code: "trezor.bip32_path.minimum"});
//                 expect(hasError).toBe(true);
//             })

//             const interactionTestPathMAINNET = new TrezorExportPublicKey({network: NETWORKS.MAINNET, bip32Path: "m/45'/1'/0'/1"});
//             it("should properly report warning for a testnet derivation path on mainnet for wallet state pending", () => {
//                 const hasWarning = interactionTestPathMAINNET.hasMessagesFor({state:"active", level: 'warning', code: "trezor.bip32_path.mismatch"});
//                 expect(hasWarning).toBe(true);
//             })

//             const interactionMainPathTESTNET = new TrezorExportPublicKey({network: NETWORKS.TESTNET, bip32Path: "m/45'/0'/0'/1"});
//             it("should properly report warning for a mainnet derivation path on testnet for wallet state pending", () => {
//                 const hasWarning = interactionMainPathTESTNET.hasMessagesFor({state:"active", level: 'warning', code: "trezor.bip32_path.mismatch"});
//                 expect(hasWarning).toBe(true);
//             })

//             const interactionTestPathTESTNET = new TrezorExportPublicKey({network: NETWORKS.TESTNET, bip32Path: "m/45'/1'/0'/1"});
//             it("should not report an error for correctly matching derivation path on testnet", () => {
//                 const hasError = interactionTestPathTESTNET.hasMessagesFor({state:"pending", level: 'error', code: "trezor.bip32_path.mismatch"});
//                 expect(hasError).toBe(false);
//             })

//             const interactionMainPathMAINNET = new TrezorExportPublicKey({network: NETWORKS.MAINNET, bip32Path: "m/45'/0'/0'/1"});
//             it("should not report an error for correctly matching derivation path on mainnet", () => {
//                 const hasError = interactionMainPathMAINNET.hasMessagesFor({state:"pending", level: 'error', code: "trezor.bip32_path.mismatch"});
//                 expect(hasError).toBe(false);
//             })

//         })
//     })

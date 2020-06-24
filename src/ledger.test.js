import {
  TEST_FIXTURES,
} from "unchained-bitcoin";
import {
  PENDING,
  ACTIVE,
  INFO,
  WARNING,
} from "./interaction";
import {
  LedgerGetMetadata,
  LedgerExportPublicKey,
  LedgerExportExtendedPublicKey,
  LedgerSignMultisigTransaction,
} from "./ledger";

function itHasStandardMessages(interactionBuilder) {
  it("has a message about ensuring your device is plugged in", () => {
    expect(interactionBuilder().hasMessagesFor({
      state: PENDING,
      level: INFO,
      code: "device.connect",
      text: "plugged in",
    })).toBe(true);
  });

  it("has a message about ensuring your device is unlocked", () => {
    expect(interactionBuilder().hasMessagesFor({
      state: PENDING,
      level: INFO,
      code: "device.unlock",
      text: "unlocked",
    })).toBe(true);
  });

  it("has a message about communicating with your device", () => {
    expect(interactionBuilder().hasMessagesFor({
      state: ACTIVE,
      level: INFO,
      code: "device.active",
      text: "Communicating",
    })).toBe(true);
  });
}

function itHasDashboardMessages(interactionBuilder) {
  itHasStandardMessages(interactionBuilder);

  it("has messages about being in the dashboard, not an app", () => {
    expect(interactionBuilder().hasMessagesFor({
      state: ACTIVE,
      level: INFO,
      code: "ledger.app.dashboard",
      text: "NOT the Bitcoin app",
    })).toBe(true);
    expect(interactionBuilder().hasMessagesFor({
      state: PENDING,
      level: INFO,
      code: "ledger.app.dashboard",
      text: "NOT the Bitcoin app",
    })).toBe(true);
  });
}

function itHasAppMessages(interactionBuilder) {
  itHasStandardMessages(interactionBuilder);

  it("has messages about being in the Bitcoin app", () => {
    expect(interactionBuilder().hasMessagesFor({
      state: ACTIVE,
      level: INFO,
      code: "ledger.app.bitcoin",
      text: "Bitcoin app open",
    })).toBe(true);
    expect(interactionBuilder().hasMessagesFor({
      state: PENDING,
      level: INFO,
      code: "ledger.app.bitcoin",
      text: "Bitcoin app open",
    })).toBe(true);
  });
}

describe('ledger', () => {

  describe("LedgerGetMetadata", () => {

    function interactionBuilder() { return new LedgerGetMetadata(); }

    itHasDashboardMessages(interactionBuilder);

    describe("parseMetadata", () => {

      it("successfully parses metadata", () => {
        const response = [49, 16, 0, 3, 5, 49, 46, 52, 46, 50, 4, 166, 0, 0, 0, 4, 49, 46, 54, 0, 32, 52, 200, 225, 237, 153, 74, 68, 110, 247, 12, 155, 37, 109, 138, 110, 1, 235, 148, 154, 186, 75, 24, 185, 249, 163, 155, 127, 56, 120, 37, 49, 3, 144, 0];
        const metadata = interactionBuilder().parseMetadata(response);
        expect(metadata).toBeTruthy();
        expect(metadata.spec).toEqual("Nano S v1.4.2 (MCU v1.6)");
        expect(metadata.model).toEqual("Nano S");
        expect(metadata.version).toBeTruthy();
        expect(metadata.version.major).toEqual('1');
        expect(metadata.version.minor).toEqual('4');
        expect(metadata.version.patch).toEqual('2');
        expect(metadata.version.string).toEqual('1.4.2');
        expect(metadata.mcuVersion).toBeTruthy();
        expect(metadata.mcuVersion.major).toEqual('1');
        expect(metadata.mcuVersion.minor).toEqual('6');
        expect(metadata.mcuVersion.string).toEqual('1.6');
      });

      it("throws and logs an error when metadata can't be parsed", () => {
        console.error = jest.fn();
        expect(() => {interactionBuilder().parseMetadata([]); }).toThrow(/unable to parse/i);
        expect(console.error).toHaveBeenCalled();
      });

    });

  });

  describe("LedgerExportPublicKey", () => {

    function interactionBuilder(bip32Path) { return new LedgerExportPublicKey({bip32Path: (bip32Path || "m/45'/0'/0'/0/0")}); }

    itHasAppMessages(interactionBuilder);

    describe("parsePublicKey", () => {

      it("throws an error when no public key is found", () => {
        expect(() => {interactionBuilder().parsePublicKey(); }).toThrow(/no public key/);
      });

      it("throws and logs an error when the public key can't be compressed", () => {
        console.error = jest.fn();
        expect(() => {interactionBuilder().parsePublicKey({}); }).toThrow(/unable to compress/i);
        expect(() => {interactionBuilder().parsePublicKey({foo: "bar"}); }).toThrow(/unable to compress/i);
        expect(() => {interactionBuilder().parsePublicKey({publicKey: 1}); }).toThrow(/unable to compress/i);
        expect(() => {interactionBuilder().parsePublicKey({publicKey: ""}); }).toThrow(/unable to compress/i);
        expect(console.error).toHaveBeenCalled();
      });

      it("extracts and compresses the public key", () => {
        expect(interactionBuilder().parsePublicKey("0429b3e0919adc41a316aad4f41444d9bf3a9b639550f2aa735676ffff25ba3898d6881e81d2e0163348ff07b3a9a3968401572aa79c79e7edb522f41addc8e6ce")).toEqual("0229b3e0919adc41a316aad4f41444d9bf3a9b639550f2aa735676ffff25ba3898");
      });
    });

  });

  describe("LedgerSignMultisigTransaction", () => {

    TEST_FIXTURES.transactions.forEach((fixture) => {
      describe(`for a transaction which ${fixture.description}`, () => {

        function interactionBuilder() { return new LedgerSignMultisigTransaction(fixture); }

        itHasAppMessages(interactionBuilder);

        it("has a message about delays during signing", () => {
          const interaction = interactionBuilder();
          const message = interaction.messageFor({
            state: ACTIVE,
            level: WARNING,
            code: "ledger.sign.delay",
          });
          expect(message).not.toBe(null);
          expect(message.preProcessingTime).toEqual(interaction.preProcessingTime());
          expect(message.postProcessingTime).toEqual(interaction.postProcessingTime());
        });

        if (fixture.segwit) {
          describe("a message about approving the transaction", () => {

            it("for version <1.6.0", () => {
              const interaction = interactionBuilder();
              const message = interaction.messageFor({
                state: ACTIVE,
                level: INFO,
                version: "<1.6.0",
                code: "ledger.sign",
              });
              expect(message).not.toBe(null);
            });

            it("for version >=1.6.0", () => {
              const interaction = interactionBuilder();
              const message = interaction.messageFor({
                state: ACTIVE,
                level: INFO,
                version: ">=1.6.0",
                code: "ledger.sign",
              });
              expect(message).not.toBe(null);
              expect(message.messages).not.toBeUndefined();
              expect(message.messages.length).toEqual(5);
            });

          });
        } else {
          describe("a message about approving the transaction", () => {

            it("for version <1.6.0", () => {
              const interaction = interactionBuilder();
              const message = interaction.messageFor({
                state: ACTIVE,
                level: INFO,
                version: "<1.6.0",
                code: "ledger.sign",
              });
              expect(message).not.toBe(null);
              expect(message.messages).not.toBeUndefined();
              expect(message.messages.length).toEqual(2);
            });

            it("for version >=1.6.0", () => {
              const interaction = interactionBuilder();
              const message = interaction.messageFor({
                state: ACTIVE,
                level: INFO,
                version: ">=1.6.0",
                code: "ledger.sign",
              });
              expect(message).not.toBe(null);
              expect(message.messages).not.toBeUndefined();
              expect(message.messages.length).toEqual(7);
            });

          });
        }

      });
    });


  });

  describe("LedgerExportExtendedPublicKey", () => {

    function interactionBuilder(bip32Path) { return new LedgerExportExtendedPublicKey({bip32Path: (bip32Path || "m/45'/0'/0'/0/0")}); }

    itHasAppMessages(interactionBuilder);

  });


});

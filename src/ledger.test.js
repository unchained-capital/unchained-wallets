import {
  TESTNET,
  TEST_FIXTURES,
} from "unchained-bitcoin";
import {
  UNSUPPORTED,
  PENDING,
  ACTIVE,
  INFO,
  WARNING,
  ERROR,
} from "./interaction";
import {
  LedgerGetMetadata,
  LedgerExportPublicKey,
  LedgerSignMultisigTransaction,
} from "./ledger";

function itHasStandardMessages(interaction) {
  it("has a message about ensuring your device is plugged in", () => {
    expect(interaction.hasMessagesFor({state: PENDING, level: INFO, code: "device.connect", text: "plugged in"})).toBe(true);
  });

  it("has a message about ensuring your device is unlocked", () => {
    expect(interaction.hasMessagesFor({state: PENDING, level: INFO, code: "device.unlock", text: "unlocked"})).toBe(true);
  });

  it("has a message about communicating with your device", () => {
    expect(interaction.hasMessagesFor({state: ACTIVE, level: INFO, code: "device.active", text: "Communicating"})).toBe(true);
  });
}

function itHasDashboardMessages(interaction) {
  itHasStandardMessages(interaction);
  
  it("has messages about being in the dashboard, not an app", () => {
    expect(interaction.hasMessagesFor({state: ACTIVE, level: INFO, code: "ledger.app.dashboard", text: "NOT the Bitcoin app"})).toBe(true);
    expect(interaction.hasMessagesFor({state: PENDING, level: INFO, code: "ledger.app.dashboard", text: "NOT the Bitcoin app"})).toBe(true);
  });
}

function itHasAppMessages(interaction) {
  itHasStandardMessages(interaction);
  
  it("has messages about being in the Bitcoin app", () => {
    expect(interaction.hasMessagesFor({state: ACTIVE, level: INFO, code: "ledger.app.bitcoin", text: "Bitcoin app open"})).toBe(true);
    expect(interaction.hasMessagesFor({state: PENDING, level: INFO, code: "ledger.app.bitcoin", text: "Bitcoin app open"})).toBe(true);
  });
}

describe('ledger', () => {

  describe("LedgerGetMetadata", () => {

    const interaction  = new LedgerGetMetadata();

    itHasDashboardMessages(interaction);

    describe("parseMetadata", () => {

      it ("successfully parses metadata", () => {
        const response = [49,16,0,3,5,49,46,52,46,50,4,166,0,0,0,4,49,46,54,0,32,52,200,225,237,153,74,68,110,247,12,155,37,109,138,110,1,235,148,154,186,75,24,185,249,163,155,127,56,120,37,49,3,144,0];
        const metadata = interaction.parseMetadata(response);
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
        expect(() => {interaction.parseMetadata([]); }).toThrow(/unable to parse/i);
        expect(console.error).toHaveBeenCalled();
      });

    });

  });

  describe("LedgerExportPublicKey", () => {

    const bip32Path = "m/45'/0'/0'/0/0";
    const interaction  = new LedgerExportPublicKey({bip32Path});

    itHasAppMessages(interaction);

    describe("parsePublicKey", () => {

      it("throws an error when no public key is found", () => {
        expect(() => {interaction.parsePublicKey(); }).toThrow(/no public key/);
      });

      it("throws and logs an error when the public key can't be compressed", () => {
        console.error = jest.fn();
        expect(() => {interaction.parsePublicKey({}); }).toThrow(/unable to compress/i);
        expect(() => {interaction.parsePublicKey({foo: "bar"}); }).toThrow(/unable to compress/i);
        expect(() => {interaction.parsePublicKey({publicKey: 1}); }).toThrow(/unable to compress/i);
        expect(() => {interaction.parsePublicKey({publicKey: ""}); }).toThrow(/unable to compress/i);
        expect(console.error).toHaveBeenCalled();
      });

      it("extracts and compresses the public key", () => {
        expect(interaction.parsePublicKey("0429b3e0919adc41a316aad4f41444d9bf3a9b639550f2aa735676ffff25ba3898d6881e81d2e0163348ff07b3a9a3968401572aa79c79e7edb522f41addc8e6ce")).toEqual("0229b3e0919adc41a316aad4f41444d9bf3a9b639550f2aa735676ffff25ba3898");
      });

    });

  });

  describe("LedgerSignMultisigTransaction", () => {

    TEST_FIXTURES.multisigs.forEach((fixture) => {
      describe(`displaying a ${fixture.description}`, () => {
        const interaction = new LedgerSignMultisigTransaction(fixture);
        itHasAppMessages(interaction);
      });
    });

  });
});

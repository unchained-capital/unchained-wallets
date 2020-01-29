import {
  TESTNET,
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
  parseHermitQRCodeData,
  encodeHermitQRCodeData,
  HermitExportPublicKey,
  HermitExportExtendedPublicKey,
  HermitSignTransaction,
} from "./hermit";

function itHasACommandMessage(interaction, command) {
  const message = interaction.messageFor({state: PENDING, level: INFO, code: "hermit.command"});
  it ("has a command message with the correct command", () => {
    expect(message).not.toBeNull();
    expect(message.command).toEqual(command);
  });
}

describe("parseHermitQRCodeData", () => {

  it ("throws an error on an empty string or non Base32 string", () => {
    expect(() => { parseHermitQRCodeData(); }).toThrow(/base32 decode error/i);
    expect(() => { parseHermitQRCodeData(""); }).toThrow(/base32 decode error/i);
    expect(() => { parseHermitQRCodeData("foo"); }).toThrow(/base32 decode error/i);
  });

  it ("throws an error on a non gzip-compressed string", () => {
    expect(() => { parseHermitQRCodeData("MZXW6==="); }).toThrow(/gzip decompression error/i);
  });

  it ("throws an error on a non JSON data", () => {
    expect(() => { parseHermitQRCodeData("D6FQQAAAAAAAAAADJPF46BYAEFSXHDADAAAAA==="); }).toThrow(/json parse error/i);
  });

  it("can parse Hermit QR code data", () => {
    expect(parseHermitQRCodeData("D6FQQAAAAAAAAAADVNLEVS6PK6ZFESSKFRJKUBIA572SX7QNAAAAA===")).toEqual({foo: "bar"});
  });

});

describe("encodeHermitQRCodeData", () => {

  it ("throws an error on a non JSON-encodable object", () => {
    expect(() => { encodeHermitQRCodeData(BigInt(3)); }).toThrow(/JSON encode error/i);
  });

  it ("throws an error on an empty input or non gzip-compressable object", () => {
    expect(() => { encodeHermitQRCodeData(); }).toThrow(/gzip compression error/i);
  });

  it ("throws an error on an empty input or non gzip-compressable object", () => {
    expect(() => { encodeHermitQRCodeData(); }).toThrow(/gzip compression error/i);
  });

  it("can encode Hermit QR code data", () => {
    expect(encodeHermitQRCodeData({foo: "bar"})).toEqual("D6FQQAAAAAAAAAADVNLEVS6PK6ZFESSKFRJKUBIA572SX7QNAAAAA===");
  });

});

describe("HermitExportPublicKey", () => {

  const bip32Path = "m/45'/0'/0'/0/0";
  const interaction  = new HermitExportPublicKey({bip32Path});

  itHasACommandMessage(interaction, `export-pub ${bip32Path}`);

  describe("parse", () => {

    it("throws an error when no public key is returned", () => {
      expect(() => { interaction.parse(encodeHermitQRCodeData({})); }).toThrow(/no public key/i);
      expect(() => { interaction.parse(encodeHermitQRCodeData({foo: "bar"})); }).toThrow(/no public key/i);
      expect(() => { interaction.parse(encodeHermitQRCodeData({pubkey: ""})); }).toThrow(/no public key/i);
      expect(() => { interaction.parse(encodeHermitQRCodeData({bip32Path: "m/45'/0'/0'/0/0"})); }).toThrow(/no public key/i);
    });

    it("throws an error when an extended public key is returned instead", () => {
      expect(() => { interaction.parse(encodeHermitQRCodeData({xpub: "xpub..."})); }).toThrow(/not an extended public key/i);
    });

    it("throws an error when no BIP32 path is returned", () => {
      expect(() => { interaction.parse(encodeHermitQRCodeData({pubkey: "03..."})); }).toThrow(/no bip32 path/i);
      expect(() => { interaction.parse(encodeHermitQRCodeData({pubkey: "03...", bip32Path: ""})); }).toThrow(/no bip32 path/i);
    });

    it("returns the result when public key and BIP32 path are present", () => {
      const result = {pubkey: "03...", bip32Path: "m/45'/0'/0'/0/0"};
      expect(interaction.parse(encodeHermitQRCodeData(result))).toEqual(result);
    });

  });

});

describe("HermitExportExtendedPublicKey", () => {

  const bip32Path = "m/45'/0'/0'";
  const interaction  = new HermitExportExtendedPublicKey({bip32Path});

  itHasACommandMessage(interaction, `export-xpub ${bip32Path}`);

  describe("parse", () => {

    it("throws an error when no extended public key is returned", () => {
      expect(() => { interaction.parse(encodeHermitQRCodeData({})); }).toThrow(/no extended public key/i);
      expect(() => { interaction.parse(encodeHermitQRCodeData({foo: "bar"})); }).toThrow(/no extended public key/i);
      expect(() => { interaction.parse(encodeHermitQRCodeData({xpub: ""})); }).toThrow(/no extended public key/i);
      expect(() => { interaction.parse(encodeHermitQRCodeData({bip32Path: "m/45'/0'/0'"})); }).toThrow(/no extended public key/i);
    });

    it("throws an error when a public key is returned instead", () => {
      expect(() => { interaction.parse(encodeHermitQRCodeData({pubkey: "03..."})); }).toThrow(/not a plain public key/i);
    });

    it("throws an error when no BIP32 path is returned", () => {
      expect(() => { interaction.parse(encodeHermitQRCodeData({xpub: "xpub..."})); }).toThrow(/no bip32 path/i);
      expect(() => { interaction.parse(encodeHermitQRCodeData({xpub: "xpub...", bip32Path: ""})); }).toThrow(/no bip32 path/i);
    });

    it("returns the result when extended public key and BIP32 path are present", () => {
      const result = {xpub: "xpub...", bip32Path: "bar"};
      expect(interaction.parse(encodeHermitQRCodeData(result))).toEqual(result);
    });

  });


});


describe("HermitSignTransaction", () => {

  const interaction = new HermitSignTransaction({
    inputs: [], 
    outputs: [], 
    bip32Paths: [],
  });

  itHasACommandMessage(interaction, "sign-bitcoin");

  describe("parse", () => {

    it("throws an error when no signatures are returned", () => {
      expect(() => { interaction.parse(encodeHermitQRCodeData({})); }).toThrow(/no signatures/i);
      expect(() => { interaction.parse(encodeHermitQRCodeData({foo: "bar"})); }).toThrow(/no signatures/i);
      expect(() => { interaction.parse(encodeHermitQRCodeData({signatures: ""})); }).toThrow(/no signatures/i);
      expect(() => { interaction.parse(encodeHermitQRCodeData({signatures: []})); }).toThrow(/no signatures/i);
    });

    it("returns the signatures when present", () => {
      const transactionSignatureNoSighashAll = ["deadbeef"];
      const transactionSignatureSighashAll = ["deadbeef01"];
      const result = {signatures: transactionSignatureNoSighashAll};
      expect(interaction.parse(encodeHermitQRCodeData(result))).toEqual(transactionSignatureSighashAll);
    });

  });


});

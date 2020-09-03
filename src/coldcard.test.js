import {
  ColdcardFileReader,
  ColdcardExportPublicKey,
  ColdcardExportExtendedPublicKey,
  ColdcardSignMultisigTransaction,
  ColdcardMultisigWalletConfig,
  WALLET_CONFIG_VERSION,
  COLDCARD_BASE_BIP32,
} from './coldcard';
import {MAINNET, TESTNET} from "unchained-bitcoin";
import {
  INFO,
  PENDING,
  ACTIVE,
} from './interaction';

const validKeyJSON = {
  p2sh_deriv: "m/45'",
  p2sh: "tpubD8NXmKsmWp3a3DXhbihAYbYLGaRNVdTnr6JoSxxfXYQcmwVtW2hv8QoDwng6JtEonmJoL3cNEwfd2cLXMpGezwZ2vL2dQ7259bueNKj9C8n",
  p2wsh_p2sh_deriv: "m/48'/1'/0'/1'",
  p2wsh_p2sh: "Upub5T4XUooQzDXL58NCHk8ZCw9BsRSLCtnyHeZEExAq1XdnBFXiXVrHFuvvmh3TnCR7XmKHxkwqdACv68z7QKT1vwru9L1SZSsw8B2fuBvtSa6",
  p2wsh_deriv: "m/48'/1'/0'/2'",
  p2wsh: "Vpub5mtnnUUL8u4oyRf5d2NZJqDypgmpx8FontedpqxNyjXTi6fLp8fmpp2wedS6UyuNpDgLDoVH23c6rYpFSEfB9jhdbD8gek2stjxhwJeE1Eq",
  xfp: "0F056943",
};
const testOutput = {
  xpub: 'tpubD8NXmKsmWp3a3DXhbihAYbYLGaRNVdTnr6JoSxxfXYQcmwVtW2hv8QoDwng6JtEonmJoL3cNEwfd2cLXMpGezwZ2vL2dQ7259bueNKj9C8n',
  rootFingerprint: '0f056943',
};
const testPubkeyOutput = {
  publicKey: '026942d670b9a5afc8b9b6118374aa7245a1a95b30cadb60069f5d0076aaff2bf5',
  rootFingerprint: '0f056943',
};
const testXpubOutput = {
  xpub: 'tpubD8NXmKsmWp3a3DXhbihAYbYLGaRNVdTnr6JoSxxfXYQcmwVtW2hv8QoDwng6JtEonmJoL3cNEwfd2cLXMpGezwZ2vL2dQ7259bueNKj9C8n',
  rootFingerprint: '0f056943',
  bip32Path: COLDCARD_BASE_BIP32,
};

describe("ColdcardFileReader", () => {
  function interactionBuilder({network}) { return new ColdcardFileReader({network}); }

  describe('constructor', () => {
    it("fails with invalid network", () => {
      expect(() => interactionBuilder({network: 'foo'})).toThrow(/Unknown network/i);
    });
  });

  describe('parse', () => {
    it("fails when sending in nothing or non json", () => {
      const notJSON = "test";
      const definitelyNotJSON = 77;
      const interaction = interactionBuilder({network: TESTNET});
      expect(() => interaction.parse(notJSON)).toThrow(/Unable to parse JSON/i);
      expect(() => interaction.parse(definitelyNotJSON)).toThrow(/Not valid JSON/i);
      expect(() => interaction.parse({})).toThrow(/Empty JSON file/i);
    });
    it("success for valid JSON via TESTNET", () => {
      const interaction = interactionBuilder({network: TESTNET});
      const result = interaction.parse(validKeyJSON);
      expect(result).toEqual(testOutput);
    });
  });

  describe('handleKeyExtraction', () => {
    it("missing xpub", () => {
      const interaction = interactionBuilder({network: MAINNET});
      const missingXpub = {...validKeyJSON};
      Reflect.deleteProperty(missingXpub, 'p2sh');
      expect(() => interaction.parse(missingXpub)).toThrow(/No extended public key/i);
    });
    it("missing bip32path", () => {
      const interaction = interactionBuilder({network: TESTNET});
      const missingb32 = {...validKeyJSON};
      Reflect.deleteProperty(missingb32, 'p2sh_deriv');
      expect(() => interaction.parse(missingb32)).toThrow(/No BIP32 path/i);
    });
    it("xfp in file and computed xfp don't match", () => {
      const interaction = interactionBuilder({network: TESTNET});
      const reallyMissingXFP = {...validKeyJSON};
      //set to a valid depth>1 xpub
      reallyMissingXFP.xfp = '12341234';
      expect(() => interaction.parse(reallyMissingXFP)).toThrow(/Computed fingerprint does not match/i);
    });
    it("missing xfp but passes", () => {
      const interaction = interactionBuilder({network: TESTNET});
      const missingXFP = {...validKeyJSON};
      Reflect.deleteProperty(missingXFP, 'xfp');
      const result = interaction.parse(missingXFP);
      expect(result).toEqual(testOutput);
    });
    it("no xfp and depth>1 xpub", () => {
      const interaction = interactionBuilder({network: TESTNET});
      const reallyMissingXFP = {...validKeyJSON};
      Reflect.deleteProperty(reallyMissingXFP, 'xfp');
      //set to a valid depth>1 xpub
      reallyMissingXFP.p2sh = 'tpubDD7afgqjwFtnyu3YuReivwoGuJNyXNjFw5y9m4QDchpGzjgGuWhQUbBXafi73zqoUos7rCgLS24ebaj3d94UhuJQJfBUCN6FHB7bmp79J2J';
      expect(() => interaction.parse(reallyMissingXFP)).toThrow(/No xfp/i);
    });
  });

  describe('deriveXpubIfNecessary', () => {
    it("no bip32path returns same xpub", () => {
      const interaction = interactionBuilder({network: TESTNET});
      const x = interaction.parse(validKeyJSON);
      const result = interaction.deriveXpubIfNecessary(x.xpub);
      expect(result).toEqual(testOutput.xpub);
    });
    it("default bip32path", () => {
      const interaction = interactionBuilder({network: TESTNET});
      interaction.bip32Path = "m/45'";
      const x = interaction.parse(validKeyJSON);
      const result = interaction.deriveXpubIfNecessary(x.xpub);
      expect(result).toEqual(testOutput.xpub);
    });
    it("derive down to depth 2 unhardened", () => {
      const interaction = interactionBuilder({network: TESTNET});
      interaction.bip32Path = "m/45'/0";
      const x = interaction.parse(validKeyJSON);
      const result = interaction.deriveXpubIfNecessary(x.xpub);
      expect(result).toEqual("tpubDBDZXR47BTgMPj4gTCUkp3BZniPMdEsRdzaxDAxnuQ5bk3n6LKLtqqYhxF53SjarCLU9evocxce8JynJ1sjybEPDdWupY6c1mFBEqLJwEAU");
    });
    it("derive down to depth 3 unhardened", () => {
      const interaction = interactionBuilder({network: TESTNET});
      interaction.bip32Path = "m/45'/1/0";
      const x = interaction.parse(validKeyJSON);
      const result = interaction.deriveXpubIfNecessary(x.xpub);
      expect(result).toEqual("tpubDDnpDVdDnpEnBgGkS2kRw2Fzqy1nB3TUGsT7whsuFDcqq4Xp9gsP6byEFqk9hGERapvSe8YRag3Jq4TjsbuZkY5TKkg14tW4jKdgUvy3jFr");
    });
    it("non-matching bip32 prefix", () => {
      const interaction = interactionBuilder({network: TESTNET});
      interaction.bip32Path = "m/44'/0";
      const x = interaction.parse(validKeyJSON);
      expect(() => interaction.deriveXpubIfNecessary(x.xpub)).toThrow(/Problem with bip32/i);
    });
  });

  it("has a message about uploading file", () => {
    expect(interactionBuilder({network: TESTNET}).hasMessagesFor({
      state: PENDING,
      level: INFO,
      code: "coldcard.upload",
      text: "Upload the file",
    })).toBe(true);
  });
});

describe("ColdcardExportPublicKey", () => {
  function interactionBuilder({bip32Path, network}) {
    return new ColdcardExportPublicKey({
      bip32Path,
      network,
    });
  }

  describe('constructor', () => {
    it("invalid bip32Path fails", () => {
      expect(() => interactionBuilder({
        bip32Path: 4,
        network: TESTNET,
      })).toThrow(/Bip32 path should be a string/i);
    });
  });

  describe("parse", () => {
    it("no bip32path returns same xpub", () => {
      const interaction = interactionBuilder({network: TESTNET});
      const result = interaction.parse(validKeyJSON);
      expect(result).toEqual(testPubkeyOutput);
    });
    it("default bip32path", () => {
      const interaction = interactionBuilder({
        network: TESTNET,
        bip32Path: COLDCARD_BASE_BIP32,
      });
      const result = interaction.parse(validKeyJSON);
      expect(result).toEqual(testPubkeyOutput);
    });
    it("derive down to depth 2 unhardened", () => {
      let b32Path = "m/45'/0";
      const interaction = interactionBuilder({
        network: TESTNET,
        bip32Path: b32Path,
      });
      const result = interaction.parse(validKeyJSON);
      expect(result.rootFingerprint).toEqual(testPubkeyOutput.rootFingerprint);
      expect(result.publicKey).toEqual("0325b908dca32c9f789a96c836c5b9d31dd6f6abf122f430f5900209e009943f72");
    });
    it("derive down to depth 3 unhardened", () => {
      let b32Path = "m/45'/1/0";
      const interaction = interactionBuilder({
        network: TESTNET,
        bip32Path: b32Path,
      });
      const result = interaction.parse(validKeyJSON);
      expect(result.rootFingerprint).toEqual(testPubkeyOutput.rootFingerprint);
      expect(result.publicKey).toEqual("0349f15ab530552168983f0ba9d04f5fb5371d4713edc2efbedbffdeda1c08a861");
    });
  });

  it("has a message about exporting xpub", () => {
    expect(interactionBuilder({
      network: TESTNET,
      bip32Path: COLDCARD_BASE_BIP32,
    }).hasMessagesFor({
      state: PENDING,
      level: INFO,
      code: "coldcard.export",
      text: "Settings > Multisig Wallets > Export XPUB",
    })).toBe(true);
  });
});

describe("ColdcardExportExtendedPublicKey", () => {
  function interactionBuilder({bip32Path, network}) {
    return new ColdcardExportExtendedPublicKey({
      bip32Path,
      network,
    });
  }

  describe('constructor', () => {
    it("invalid bip32Path fails", () => {
      expect(() => interactionBuilder({
        bip32Path: 4,
        network: TESTNET,
      })).toThrow(/Bip32 path should be a string/i);
    });
  });

  describe("parse", () => {
    it("no bip32path returns same xpub", () => {
      const interaction = interactionBuilder({network: TESTNET});
      const result = interaction.parse(validKeyJSON);
      expect(result).toEqual(testXpubOutput);
    });
    it("default bip32path", () => {
      const interaction = interactionBuilder({
        network: TESTNET,
        bip32Path: COLDCARD_BASE_BIP32,
      });
      const result = interaction.parse(validKeyJSON);
      expect(result).toEqual(testXpubOutput);
    });
    it("derive down to depth 2 unhardened", () => {
      let b32Path = "m/45'/0";
      const interaction = interactionBuilder({
        network: TESTNET,
        bip32Path: b32Path,
      });
      const result = interaction.parse(validKeyJSON);
      expect(result.rootFingerprint).toEqual(testXpubOutput.rootFingerprint);
      expect(result.xpub).toEqual("tpubDBDZXR47BTgMPj4gTCUkp3BZniPMdEsRdzaxDAxnuQ5bk3n6LKLtqqYhxF53SjarCLU9evocxce8JynJ1sjybEPDdWupY6c1mFBEqLJwEAU");
    });
    it("derive down to depth 3 unhardened", () => {
      let b32Path = "m/45'/1/0";
      const interaction = interactionBuilder({
        network: TESTNET,
        bip32Path: b32Path,
      });
      const result = interaction.parse(validKeyJSON);
      expect(result.rootFingerprint).toEqual(testXpubOutput.rootFingerprint);
      expect(result.xpub).toEqual("tpubDDnpDVdDnpEnBgGkS2kRw2Fzqy1nB3TUGsT7whsuFDcqq4Xp9gsP6byEFqk9hGERapvSe8YRag3Jq4TjsbuZkY5TKkg14tW4jKdgUvy3jFr");
    });
  });

  it("has a message about exporting xpub", () => {
    expect(interactionBuilder({
      network: TESTNET,
      bip32Path: COLDCARD_BASE_BIP32,
    }).hasMessagesFor({
      state: PENDING,
      level: INFO,
      code: "coldcard.export",
      text: "Settings > Multisig Wallets > Export XPUB",
    })).toBe(true);
  });
});

describe("ColdcardSignMultisigTransaction", () => {
  function interactionBuilder({network, inputs, outputs, bip32Paths, psbt}) {
    return new ColdcardSignMultisigTransaction({
      network,
      inputs,
      outputs,
      bip32Paths,
      psbt,
    });
  }

  const multiInputB64PSBT = 'cHNidP8BAHwBAAAAAsrTtNXPBtJ7c2SOlzLUDenpmLNoEm9xFawNN6NW6d9nAAAAAAD/////ZWCYyz7lwUvijEy4v2IlILv5cWhGAlZ3wEF/LFzsqdoAAAAAAP////8BsoPrCwAAAAAXqRQg/ZrduANKEs41O4qn9PrKUCWbGYcAAAAAAAEA9wIAAAAAAQFlYJjLPuXBS+KMTLi/YiUgu/lxaEYCVnfAQX8sXOyp2gEAAAAXFgAUf5C9qrLM8wuULZlpgQVVQqzKx9D+////AgDh9QUAAAAAF6kU90W5DzEqOCSaHgXF2zovjQrKT92HqDwzDwEAAAAXqRTpkGjVTiQmN8+mVSwCEjzIOM/4nIcCRzBEAiAQfgmKp4NprLi82Gw6GNoRAYlMH/JgvhQ9+vsz0dBClgIgY8+aL0E6UvThAcgKXsDqoa4iBQb+XudSlet/hCrhoYEBIQNKrXsvuEVDJ9NriWH3oxgW5/pwn6FSF9ATg3g306GT9mgAAAABBGlSIQIxXL5OraEGRj4Ewjj/o9vyanetUEesdpxD9GKVJSZvRSECnoZrkrAsaG+JsyDAzkwjke5TG03M/XGa78jKqC5CyCghA7qMuGJxZQkMLcqHEnR2Cx7wJ9icb1TrB25Wek9sXoUIU64iBgO6jLhicWUJDC3KhxJ0dgse8CfYnG9U6wduVnpPbF6FCByDRx54LQAAgAEAAIAAAACAAQAAAAAAAAAAAAAAIgYCnoZrkrAsaG+JsyDAzkwjke5TG03M/XGa78jKqC5CyCgc9X7GXS0AAIABAACAMgAAgAAAAAAAAAAAAAAAACIGAjFcvk6toQZGPgTCOP+j2/Jqd61QR6x2nEP0YpUlJm9FHPV+xl0tAACAAQAAgDwAAIAAAAAAAAAAAAAAAAAAAQD3AgAAAAABAbpAju2fB1jDXsqMDvjinLY+7UxNGxNJyYnOaB9POY8nAAAAABcWABSrqGe3dBacoeG/Y1wgTjpKgNfQ+f7///8CAOH1BQAAAAAXqRT3RbkPMSo4JJoeBcXbOi+NCspP3YegKikVAQAAABepFB2KkKEPT/Zms255ek0A3502vSE8hwJHMEQCIARZPr5JBXRTdyQyinOyBoY66nK2tRtnfgrub3qir+VPAiBWC9SjZl401Vnpb3f25rYZ0hSzbfBLy1j/4NdBdMvY5gEhAgh0Gg1FjnazVdHCdNeNjBZeIHvgpf9QYjwNY+t5MvovAAAAAAEEaVIhAjFcvk6toQZGPgTCOP+j2/Jqd61QR6x2nEP0YpUlJm9FIQKehmuSsCxob4mzIMDOTCOR7lMbTcz9cZrvyMqoLkLIKCEDuoy4YnFlCQwtyocSdHYLHvAn2JxvVOsHblZ6T2xehQhTriIGA7qMuGJxZQkMLcqHEnR2Cx7wJ9icb1TrB25Wek9sXoUIHINHHngtAACAAQAAgAAAAIABAAAAAAAAAAAAAAAiBgKehmuSsCxob4mzIMDOTCOR7lMbTcz9cZrvyMqoLkLIKBz1fsZdLQAAgAEAAIAyAACAAAAAAAAAAAAAAAAAIgYCMVy+Tq2hBkY+BMI4/6Pb8mp3rVBHrHacQ/RilSUmb0Uc9X7GXS0AAIABAACAPAAAgAAAAAAAAAAAAAAAAAAA';
  const multiInputB64PSBT_partiallySigned = 'cHNidP8BAHwBAAAAAsrTtNXPBtJ7c2SOlzLUDenpmLNoEm9xFawNN6NW6d9nAAAAAAD/////ZWCYyz7lwUvijEy4v2IlILv5cWhGAlZ3wEF/LFzsqdoAAAAAAP////8BsoPrCwAAAAAXqRQg/ZrduANKEs41O4qn9PrKUCWbGYcAAAAAAAEA9wIAAAAAAQFlYJjLPuXBS+KMTLi/YiUgu/lxaEYCVnfAQX8sXOyp2gEAAAAXFgAUf5C9qrLM8wuULZlpgQVVQqzKx9D+////AgDh9QUAAAAAF6kU90W5DzEqOCSaHgXF2zovjQrKT92HqDwzDwEAAAAXqRTpkGjVTiQmN8+mVSwCEjzIOM/4nIcCRzBEAiAQfgmKp4NprLi82Gw6GNoRAYlMH/JgvhQ9+vsz0dBClgIgY8+aL0E6UvThAcgKXsDqoa4iBQb+XudSlet/hCrhoYEBIQNKrXsvuEVDJ9NriWH3oxgW5/pwn6FSF9ATg3g306GT9mgAAAAiAgKehmuSsCxob4mzIMDOTCOR7lMbTcz9cZrvyMqoLkLIKEgwRQIhALwyG48DYFgA5szv66YujJXol/36JhGyUxUotFxcjD6aAiAORJfjq7u+eu4Nypc2OAH8MG8i0Kpsf4F3WhH7H4FZggEBAwQBAAAAIgYDuoy4YnFlCQwtyocSdHYLHvAn2JxvVOsHblZ6T2xehQgcg0ceeC0AAIABAACAAAAAgAEAAAAAAAAAAAAAACIGAjFcvk6toQZGPgTCOP+j2/Jqd61QR6x2nEP0YpUlJm9FHPV+xl0tAACAAQAAgDwAAIAAAAAAAAAAAAAAAAAiBgKehmuSsCxob4mzIMDOTCOR7lMbTcz9cZrvyMqoLkLIKBz1fsZdLQAAgAEAAIAyAACAAAAAAAAAAAAAAAAAAQRpUiECMVy+Tq2hBkY+BMI4/6Pb8mp3rVBHrHacQ/RilSUmb0UhAp6Ga5KwLGhvibMgwM5MI5HuUxtNzP1xmu/IyqguQsgoIQO6jLhicWUJDC3KhxJ0dgse8CfYnG9U6wduVnpPbF6FCFOuAAEA9wIAAAAAAQG6QI7tnwdYw17KjA744py2Pu1MTRsTScmJzmgfTzmPJwAAAAAXFgAUq6hnt3QWnKHhv2NcIE46SoDX0Pn+////AgDh9QUAAAAAF6kU90W5DzEqOCSaHgXF2zovjQrKT92HoCopFQEAAAAXqRQdipChD0/2ZrNueXpNAN+dNr0hPIcCRzBEAiAEWT6+SQV0U3ckMopzsgaGOupytrUbZ34K7m96oq/lTwIgVgvUo2ZeNNVZ6W939ua2GdIUs23wS8tY/+DXQXTL2OYBIQIIdBoNRY52s1XRwnTXjYwWXiB74KX/UGI8DWPreTL6LwAAAAAiAgKehmuSsCxob4mzIMDOTCOR7lMbTcz9cZrvyMqoLkLIKEgwRQIhAKQc0krDmcJESTNNCkaQZibeAD4riKnDfkbyywy/usD2AiA8dSTsHI8S1TWiISYyhl2hvvQ7voHBsg6tErbL9/RPmgEBAwQBAAAAIgYDuoy4YnFlCQwtyocSdHYLHvAn2JxvVOsHblZ6T2xehQgcg0ceeC0AAIABAACAAAAAgAEAAAAAAAAAAAAAACIGAjFcvk6toQZGPgTCOP+j2/Jqd61QR6x2nEP0YpUlJm9FHPV+xl0tAACAAQAAgDwAAIAAAAAAAAAAAAAAAAAiBgKehmuSsCxob4mzIMDOTCOR7lMbTcz9cZrvyMqoLkLIKBz1fsZdLQAAgAEAAIAyAACAAAAAAAAAAAAAAAAAAQRpUiECMVy+Tq2hBkY+BMI4/6Pb8mp3rVBHrHacQ/RilSUmb0UhAp6Ga5KwLGhvibMgwM5MI5HuUxtNzP1xmu/IyqguQsgoIQO6jLhicWUJDC3KhxJ0dgse8CfYnG9U6wduVnpPbF6FCFOuAAA=';
  const multiInputB64PSBT_fullySigned = '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';

  const singleInputB64PSBT = 'cHNidP8BAFMBAAAAAUbA+Zmwrp+gwtjsosLDL/JHPmjapVJNp0EgZX9LBBfDAAAAAAD/////AaN8+gIAAAAAF6kUJAQFvQ32IKrqJHMAaosdMcDlduWHAAAAAAABAP1TAQEAAAABCKEyquToNXW6Rvyt23GrNIVs2mP3jMwiXsemI51Sy5EBAAAA/f4AAEgwRQIhANsnetzwCa9+miNXwgDYeTIj/i+vrgFVPvNr18HLoBINAiA/IktEoS9zDZmisKPkYLpmWyuB3sGURg2Jk1jEnGrVAgFIMEUCIQDHzPjKtEr35VP7rha8grLxKzSwUWxEKX/b1BUf+2XqLgIgWY6QA/Kehe98LeisWWRhYoVGXu6gOyAd9A/cp8AObrgBTGlSIQJ9E3meMo9zJ4aZPaA6mHCgRaqnx2pcrk8bWItkBr19iCEC6MrrdqQ6MJT87ijgO4bwro+/8ALn0+OsdjSKMqvBCJQhA3XSvTkEe5TqXjtb6agQlOwA+D8nCgZLpWv7E5bUh3edU67/////Afh9+gIAAAAAF6kUjCGQcKxIAzr+Lf+LuYjm+duc9XSHAAAAAAEEaVIhAjOdwSogk6bhJQ4xRAVUK5iERu7WejPZBX1KiWZNkCXOIQL2/dJtfCGNMZJ7F3vyzA/WkPlUgIFG5pXWgEtRfakdeiED3adlK3xepLd7BZ+OpHoSZxY0PRkPN19pM8KWzT+2FVZTriIGAjOdwSogk6bhJQ4xRAVUK5iERu7WejPZBX1KiWZNkCXOHPV+xl0tAACAAQAAAAEAAAAAAAAAAAAAAAAAAAAiBgL2/dJtfCGNMZJ7F3vyzA/WkPlUgIFG5pXWgEtRfakdehz1fsZdLQAAgAEAAAAAAAAAAAAAAAAAAAAAAAAAIgYD3adlK3xepLd7BZ+OpHoSZxY0PRkPN19pM8KWzT+2FVYcTIf3rwAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAA';
  const singleInputB64PSBT_partiallySigned = 'cHNidP8BAFMBAAAAAWVgmMs+5cFL4oxMuL9iJSC7+XFoRgJWd8BBfyxc7KnaAAAAAAD/////AbO/9QUAAAAAF6kUIP2a3bgDShLONTuKp/T6ylAlmxmHAAAAAAABAPcCAAAAAAEBukCO7Z8HWMNeyowO+OKctj7tTE0bE0nJic5oH085jycAAAAAFxYAFKuoZ7d0Fpyh4b9jXCBOOkqA19D5/v///wIA4fUFAAAAABepFPdFuQ8xKjgkmh4Fxds6L40Kyk/dh6AqKRUBAAAAF6kUHYqQoQ9P9mazbnl6TQDfnTa9ITyHAkcwRAIgBFk+vkkFdFN3JDKKc7IGhjrqcra1G2d+Cu5veqKv5U8CIFYL1KNmXjTVWelvd/bmthnSFLNt8EvLWP/g10F0y9jmASECCHQaDUWOdrNV0cJ0142MFl4ge+Cl/1BiPA1j63ky+i8AAAAAIgICnoZrkrAsaG+JsyDAzkwjke5TG03M/XGa78jKqC5CyChIMEUCIQD9mGLMdRvZn0t3t9gPhnAbpn5meRKySX+D8NZ9lcl27QIgWuLE8Bo2FJhwmlYFuu5wuYWpiCxVrQIqj+1x5YjxNQYBAQMEAQAAACIGA7qMuGJxZQkMLcqHEnR2Cx7wJ9icb1TrB25Wek9sXoUIHO+l2RYtAACAAQAAgAAAAIABAAAAAAAAAAAAAAAiBgIxXL5OraEGRj4Ewjj/o9vyanetUEesdpxD9GKVJSZvRRz1fsZdLQAAgAEAAIA8AACAAAAAAAAAAAAAAAAAIgYCnoZrkrAsaG+JsyDAzkwjke5TG03M/XGa78jKqC5CyCgc9X7GXS0AAIABAACAMgAAgAAAAAAAAAAAAAAAAAEEaVIhAjFcvk6toQZGPgTCOP+j2/Jqd61QR6x2nEP0YpUlJm9FIQKehmuSsCxob4mzIMDOTCOR7lMbTcz9cZrvyMqoLkLIKCEDuoy4YnFlCQwtyocSdHYLHvAn2JxvVOsHblZ6T2xehQhTrgAA';
  const singleInputB64PSBT_fullySigned = 'cHNidP8BAFMBAAAAAWVgmMs+5cFL4oxMuL9iJSC7+XFoRgJWd8BBfyxc7KnaAAAAAAD/////AbO/9QUAAAAAF6kUIP2a3bgDShLONTuKp/T6ylAlmxmHAAAAAAABAPcCAAAAAAEBukCO7Z8HWMNeyowO+OKctj7tTE0bE0nJic5oH085jycAAAAAFxYAFKuoZ7d0Fpyh4b9jXCBOOkqA19D5/v///wIA4fUFAAAAABepFPdFuQ8xKjgkmh4Fxds6L40Kyk/dh6AqKRUBAAAAF6kUHYqQoQ9P9mazbnl6TQDfnTa9ITyHAkcwRAIgBFk+vkkFdFN3JDKKc7IGhjrqcra1G2d+Cu5veqKv5U8CIFYL1KNmXjTVWelvd/bmthnSFLNt8EvLWP/g10F0y9jmASECCHQaDUWOdrNV0cJ0142MFl4ge+Cl/1BiPA1j63ky+i8AAAAAIgICnoZrkrAsaG+JsyDAzkwjke5TG03M/XGa78jKqC5CyChIMEUCIQD9mGLMdRvZn0t3t9gPhnAbpn5meRKySX+D8NZ9lcl27QIgWuLE8Bo2FJhwmlYFuu5wuYWpiCxVrQIqj+1x5YjxNQYBIgICMVy+Tq2hBkY+BMI4/6Pb8mp3rVBHrHacQ/RilSUmb0VIMEUCIQCNYz7M8RKZZ5LwLV857vlRrAQrgxUX+j0kW6mzFjXZMwIgejbe++LuP113H85hqAHHfkoApO+adzjFEEYjOUNqYBQBAQMEAQAAACIGA7qMuGJxZQkMLcqHEnR2Cx7wJ9icb1TrB25Wek9sXoUIHO+l2RYtAACAAQAAgAAAAIABAAAAAAAAAAAAAAAiBgKehmuSsCxob4mzIMDOTCOR7lMbTcz9cZrvyMqoLkLIKBz1fsZdLQAAgAEAAIAyAACAAAAAAAAAAAAAAAAAIgYCMVy+Tq2hBkY+BMI4/6Pb8mp3rVBHrHacQ/RilSUmb0Uc9X7GXS0AAIABAACAPAAAgAAAAAAAAAAAAAAAAAEEaVIhAjFcvk6toQZGPgTCOP+j2/Jqd61QR6x2nEP0YpUlJm9FIQKehmuSsCxob4mzIMDOTCOR7lMbTcz9cZrvyMqoLkLIKCEDuoy4YnFlCQwtyocSdHYLHvAn2JxvVOsHblZ6T2xehQhTrgAA';

  describe("request", () => {
    it("return psbt if there is one", () => {
      const interaction = interactionBuilder({
        network: TESTNET,
        psbt: singleInputB64PSBT,
      });
      const result = interaction.request();
      expect(result).toEqual(singleInputB64PSBT);
    });
    // TODO: create the PSBT from other parameters instead
    it("return null if there is no psbt", () => {
      const interaction = interactionBuilder({});
      const result = interaction.request();
      expect(result).toBeNull();
    });
  });

  describe("parse", () => {
    it("return single input, single signature set", () => {
      const interaction = interactionBuilder({});
      const result = interaction.parse(singleInputB64PSBT_partiallySigned);
      const expectedOutput = {
        '029e866b92b02c686f89b320c0ce4c2391ee531b4dccfd719aefc8caa82e42c828':
          ['3045022100fd9862cc751bd99f4b77b7d80f86701ba67e667912b2497f83f0d67d95c976ed02205ae2c4f01a361498709a5605baee70b985a9882c55ad022a8fed71e588f1350601'],
      };
      expect(result).toEqual(expectedOutput);
      expect(Object.keys(result).length).toEqual(1);
    });
    it("return single input, double signature set", () => {
      const interaction = interactionBuilder({});
      const result = interaction.parse(singleInputB64PSBT_fullySigned);
      const expectedOutput = {
        '029e866b92b02c686f89b320c0ce4c2391ee531b4dccfd719aefc8caa82e42c828':
          ['3045022100fd9862cc751bd99f4b77b7d80f86701ba67e667912b2497f83f0d67d95c976ed02205ae2c4f01a361498709a5605baee70b985a9882c55ad022a8fed71e588f1350601'],
        '02315cbe4eada106463e04c238ffa3dbf26a77ad5047ac769c43f4629525266f45':
          ['30450221008d633eccf112996792f02d5f39eef951ac042b831517fa3d245ba9b31635d93302207a36defbe2ee3f5d771fce61a801c77e4a00a4ef9a7738c510462339436a601401'],
      };
      expect(result).toEqual(expectedOutput);
      expect(Object.keys(result).length).toEqual(2);
    });
    it("return multi input, single signature set", () => {
      const interaction = interactionBuilder({});
      const result = interaction.parse(multiInputB64PSBT_partiallySigned);
      const expectedOutput = {
        '029e866b92b02c686f89b320c0ce4c2391ee531b4dccfd719aefc8caa82e42c828':
          [
            '3045022100bc321b8f03605800e6ccefeba62e8c95e897fdfa2611b2531528b45c5c8c3e9a02200e4497e3abbbbe7aee0dca97363801fc306f22d0aa6c7f81775a11fb1f81598201',
            '3045022100a41cd24ac399c24449334d0a46906626de003e2b88a9c37e46f2cb0cbfbac0f602203c7524ec1c8f12d535a2212632865da1bef43bbe81c1b20ead12b6cbf7f44f9a01',
          ],
      };
      expect(result).toEqual(expectedOutput);
      expect(Object.keys(result).length).toEqual(1);
    });
    it("return multi input, double signature set", () => {
      const interaction = interactionBuilder({});
      const result = interaction.parse(multiInputB64PSBT_fullySigned);
      const expectedOutput = {
        '029e866b92b02c686f89b320c0ce4c2391ee531b4dccfd719aefc8caa82e42c828':
          [
            '3045022100bc321b8f03605800e6ccefeba62e8c95e897fdfa2611b2531528b45c5c8c3e9a02200e4497e3abbbbe7aee0dca97363801fc306f22d0aa6c7f81775a11fb1f81598201',
            '3045022100a41cd24ac399c24449334d0a46906626de003e2b88a9c37e46f2cb0cbfbac0f602203c7524ec1c8f12d535a2212632865da1bef43bbe81c1b20ead12b6cbf7f44f9a01',
          ],
        '02315cbe4eada106463e04c238ffa3dbf26a77ad5047ac769c43f4629525266f45':
          [
            '3045022100aaba7f8f34b6cf733a79aabb4dbe4933ae9e1b0b3b738f3604c0db0001a1130502200a20844364bbc0a15c73209063a5546d4c7b57d5eb70bc06af2c29f25bf6900201',
            '304502210087f1b5e9dfe975afe8b656d49074f0dc835eebd0fd528b3663439ab2704d5769022008485a274b34b57f0d1d899633b7dc069c7bab5483b22dc77bf072c3c9e7a48a01',
          ],
      };
      expect(result).toEqual(expectedOutput);
      expect(Object.keys(result).length).toEqual(2);
    });
    it("psbt has no signatures", () => {
      const interaction = interactionBuilder({});
      expect(() => interaction.parse(singleInputB64PSBT)).toThrow(/No signatures found/i);
      expect(() => interaction.parse(multiInputB64PSBT)).toThrow(/No signatures found/i);
    });
  });

  it("has a message about wallet config", () => {
    expect(interactionBuilder({
      network: TESTNET,
      psbt: singleInputB64PSBT,
    }).hasMessagesFor({
      state: PENDING,
      level: INFO,
      code: "coldcard.prepare",
      text: "imported the multisig wallet",
    })).toBe(true);
  });
  it("has a message about downloading psbt", () => {
    expect(interactionBuilder({
      network: TESTNET,
      psbt: singleInputB64PSBT,
    }).hasMessagesFor({
      state: PENDING,
      level: INFO,
      code: "coldcard.prepare",
      text: "Download and save this PSBT",
    })).toBe(true);
  });
  it("has a message about transferring psbt", () => {
    expect(interactionBuilder({
      network: TESTNET,
      psbt: singleInputB64PSBT,
    }).hasMessagesFor({
      state: PENDING,
      level: INFO,
      code: "coldcard.prepare",
      text: "Transfer the PSBT",
    })).toBe(true);
  });
  it("has a message about transferring psbt", () => {
    expect(interactionBuilder({
      network: TESTNET,
      psbt: singleInputB64PSBT,
    }).hasMessagesFor({
      state: ACTIVE,
      level: INFO,
      code: "coldcard.sign",
      text: "Transfer the PSBT",
    })).toBe(true);
  });
  it("has a message about ready to sign", () => {
    expect(interactionBuilder({
      network: TESTNET,
      psbt: singleInputB64PSBT,
    }).hasMessagesFor({
      state: ACTIVE,
      level: INFO,
      code: "coldcard.sign",
      text: "Choose 'Ready To Sign'",
    })).toBe(true);
  });
  it("has a message about verify tx", () => {
    expect(interactionBuilder({
      network: TESTNET,
      psbt: singleInputB64PSBT,
    }).hasMessagesFor({
      state: ACTIVE,
      level: INFO,
      code: "coldcard.sign",
      text: "Verify the transaction",
    })).toBe(true);
  });
  it("has a message about upload PSBT", () => {
    expect(interactionBuilder({
      network: TESTNET,
      psbt: singleInputB64PSBT,
    }).hasMessagesFor({
      state: ACTIVE,
      level: INFO,
      code: "coldcard.sign",
      text: "Upload the signed PSBT",
    })).toBe(true);
  });

});

describe("ColdcardMultisigWalletConfig", () => {
  const jsonConfigUUID = {
    name: "Test",
    addressType: "P2SH",
    network: "testnet",
    quorum: {
      requiredSigners: 2,
      totalSigners: 3,
    },
    startingAddressIndex: 5,
    extendedPublicKeys: [
      {
        name: "unchained",
        xpub: "tpubDF17mBZYUi35r7UEkGr7SjSisec8QL2J1zGh9WQtmnhJtHeMFy2eH2Xsnr2ynxENbqHmcEA4NnoT8T6RZxks4G5evZdWy1RbSPTm8LtNPU3",
        bip32Path: "Unknown",
        xfp: "83471e78",
      },
      {
        name: "Os_words1",
        xpub: "tpubDF61GHbPYRhEEsqNTDF2jbMBkEMmoksy1h2URbhZ8p7JfR9QRgbn6vkeA7g3t4Ue6uSHhYJxD9mRVz1ZQVYyW3RAPPuwVM4UeZyZPKu89DY",
        bip32Path: "m/45'/1'/50'/0",
        xfp: "f57ec65d",
      },
      {
        name: "Os_words2",
        xpub: "tpubDEZxsxeamoPim6T1hg2igm4vDmdQrQnHVH5gM5NjcjowtgYVv5ZhhR5sFgRVNjRFGk1HmxsFsYhu3jGaAGVCpCsL5AbAVk6xKssr6gK3tPk",
        bip32Path: "m/45'/1'/60'/0",
        xfp: "f57ec65d",
      },
    ],
    uuid: "OWPyFOA1",
  };
  const coldcardConfigUUID = `# Coldcard Multisig setup file (exported from unchained-wallets)
# https://github.com/unchained-capital/unchained-wallets
# v${WALLET_CONFIG_VERSION}
# 
Name: OWPyFOA1
Policy: 2 of 3
Format: P2SH

83471e78: tpubDF17mBZYUi35r7UEkGr7SjSisec8QL2J1zGh9WQtmnhJtHeMFy2eH2Xsnr2ynxENbqHmcEA4NnoT8T6RZxks4G5evZdWy1RbSPTm8LtNPU3\r
f57ec65d: tpubDF61GHbPYRhEEsqNTDF2jbMBkEMmoksy1h2URbhZ8p7JfR9QRgbn6vkeA7g3t4Ue6uSHhYJxD9mRVz1ZQVYyW3RAPPuwVM4UeZyZPKu89DY\r
f57ec65d: tpubDEZxsxeamoPim6T1hg2igm4vDmdQrQnHVH5gM5NjcjowtgYVv5ZhhR5sFgRVNjRFGk1HmxsFsYhu3jGaAGVCpCsL5AbAVk6xKssr6gK3tPk\r
`;

  const coldcardConfigName = `# Coldcard Multisig setup file (exported from unchained-wallets)
# https://github.com/unchained-capital/unchained-wallets
# v${WALLET_CONFIG_VERSION}
# 
Name: Test
Policy: 2 of 3
Format: P2SH

83471e78: tpubDF17mBZYUi35r7UEkGr7SjSisec8QL2J1zGh9WQtmnhJtHeMFy2eH2Xsnr2ynxENbqHmcEA4NnoT8T6RZxks4G5evZdWy1RbSPTm8LtNPU3\r
f57ec65d: tpubDF61GHbPYRhEEsqNTDF2jbMBkEMmoksy1h2URbhZ8p7JfR9QRgbn6vkeA7g3t4Ue6uSHhYJxD9mRVz1ZQVYyW3RAPPuwVM4UeZyZPKu89DY\r
f57ec65d: tpubDEZxsxeamoPim6T1hg2igm4vDmdQrQnHVH5gM5NjcjowtgYVv5ZhhR5sFgRVNjRFGk1HmxsFsYhu3jGaAGVCpCsL5AbAVk6xKssr6gK3tPk\r
`;

  let jsonConfigCopy = '';

  beforeEach(() => {
    // runs before each test in this block
    jsonConfigCopy = JSON.parse(JSON.stringify(jsonConfigUUID));
  });

  function interactionBuilder(incomingConfig) { return new ColdcardMultisigWalletConfig(incomingConfig); }

  it("can adapt unchained config to coldcard config with uuid", () => {
    const interaction = interactionBuilder({jsonConfig: jsonConfigUUID});
    const output = interaction.adapt();
    expect(output).toEqual(coldcardConfigUUID);
  });

  it("can adapt caravan config to coldcard config with name", () => {
    const jsonConfigName = {...jsonConfigCopy};
    Reflect.deleteProperty(jsonConfigName, "uuid");
    const interaction = interactionBuilder({jsonConfig: jsonConfigName});
    const output = interaction.adapt();
    expect(output).toEqual(coldcardConfigName);
  });

  it("fails when send in nothing or non json", () => {
    const notJSON = "test";
    const definitelyNotJSON = 77;
    const jsonConfigBad = {'test': 0};
    expect(() => interactionBuilder({jsonConfig: notJSON})).toThrow(/Unable to parse JSON/i);
    expect(() => interactionBuilder({jsonConfig: definitelyNotJSON})).toThrow(/Not valid JSON/i);
    expect(() => interactionBuilder({jsonConfig: {}})).toThrow(/Configuration file needs/i);
    expect(() => interactionBuilder({jsonConfig: jsonConfigBad})).toThrow(/Configuration file needs/i);
  });

  it("jsonConfig without extendedPublicKeys", () => {
    const jsonMissingKeys = {...jsonConfigCopy};
    Reflect.deleteProperty(jsonMissingKeys, "extendedPublicKeys");
    expect(() => interactionBuilder({jsonConfig: jsonMissingKeys})).toThrow("Configuration file needs extendedPublicKeys.");
  });

  it("jsonConfig with missing xfp", () => {
    const jsonMissingXFP = {...jsonConfigCopy};
    Reflect.deleteProperty(jsonMissingXFP.extendedPublicKeys[0], "xfp");
    expect(() => interactionBuilder({jsonConfig: jsonMissingXFP})).toThrow("ExtendedPublicKeys missing at least one xfp.");
  });

  it("jsonConfig with xfp as Unknown", () => {
    const jsonUnknownXFP = {...jsonConfigCopy};
    jsonUnknownXFP.extendedPublicKeys[0].xfp = "Unknown";
    expect(() => interactionBuilder({jsonConfig: jsonUnknownXFP})).toThrow("ExtendedPublicKeys missing at least one xfp.");
  });

  it("jsonConfig with xfp not length 8", () => {
    const jsonMissingMultipleXFP = {...jsonConfigCopy};
    jsonMissingMultipleXFP.extendedPublicKeys[1].xfp = "1234";
    expect(() => interactionBuilder({jsonConfig: jsonMissingMultipleXFP})).toThrow("XFP not length 8");
  });

  it("jsonConfig with xfp not string", () => {
    const jsonMissingMultipleXFP = {...jsonConfigCopy};
    jsonMissingMultipleXFP.extendedPublicKeys[0].xfp = 1234;
    expect(() => interactionBuilder({jsonConfig: jsonMissingMultipleXFP})).toThrow("XFP not a string");
  });

  it("jsonConfig with xfp invalid hex", () => {
    const jsonMissingMultipleXFP = {...jsonConfigCopy};
    jsonMissingMultipleXFP.extendedPublicKeys[0].xfp = "1234567z";
    expect(() => interactionBuilder({jsonConfig: jsonMissingMultipleXFP})).toThrow("XFP is invalid hex");
  });

  it("jsonConfig with missing uuid && name", () => {
    const jsonMissingUUIDandName = {...jsonConfigCopy};
    Reflect.deleteProperty(jsonMissingUUIDandName, "uuid");
    Reflect.deleteProperty(jsonMissingUUIDandName, "name");
    expect(() => interactionBuilder({jsonConfig: jsonMissingUUIDandName})).toThrow("Configuration file needs a UUID or a name.");
  });

  it("jsonConfig with missing quorum.requiredSigners", () => {
    const jsonMissingQuorumRequired = {...jsonConfigCopy};
    Reflect.deleteProperty(jsonMissingQuorumRequired.quorum, "requiredSigners");
    expect(() => interactionBuilder({jsonConfig: jsonMissingQuorumRequired})).toThrow("Configuration file needs quorum.requiredSigners and quorum.totalSigners.");
  });

  it("jsonConfig with missing quorum.totalSigners", () => {
    const jsonMissingQuorumTotal = {...jsonConfigCopy};
    Reflect.deleteProperty(jsonMissingQuorumTotal.quorum, "totalSigners");
    expect(() => interactionBuilder({jsonConfig: jsonMissingQuorumTotal})).toThrow("Configuration file needs quorum.requiredSigners and quorum.totalSigners.");
  });

  it("jsonConfig with missing addressType", () => {
    const jsonMissingAddressType = {...jsonConfigCopy};
    Reflect.deleteProperty(jsonMissingAddressType, "addressType");
    expect(() => interactionBuilder({jsonConfig: jsonMissingAddressType})).toThrow("Configuration file needs addressType.");
  });

});

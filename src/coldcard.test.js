import {
  ColdcardExportPublicKey,
  ColdcardExportExtendedPublicKey,
  ColdcardSignMultisigTransaction,
  ColdcardMultisigWalletConfig,
  COLDCARD_BASE_BIP32,
} from './coldcard';
import {MAINNET, TESTNET} from "unchained-bitcoin";
import {
  INFO,
  PENDING,
  ACTIVE,
} from './interaction';
import {fixtures} from './fixtures';


describe("ColdcardExportPublicKey", () => {
  function interactionBuilder({bip32Path, network}) {
    return new ColdcardExportPublicKey({
      bip32Path,
      network,
    });
  }

  describe('constructor', () => {
    it("fails with invalid network", () => {
      expect(() => interactionBuilder({network: 'foo'})).toThrow(/Unknown network/i);
    });
    it("invalid bip32Path fails", () => {
      expect(() => interactionBuilder({
        bip32Path: 4,
        network: TESTNET,
      })).toThrow(/Bip32 path should be a string/i);
    });
  });

  describe("parse", () => {

    it("fails when sending in nothing or non json", () => {
      const notJSON = "test";
      const definitelyNotJSON = 77;
      const interaction = interactionBuilder({network: TESTNET});
      expect(() => interaction.parse(notJSON)).toThrow(/Unable to parse JSON/i);
      expect(() => interaction.parse(definitelyNotJSON)).toThrow(/Not valid JSON/i);
      expect(() => interaction.parse({})).toThrow(/Empty JSON file/i);
      expect(() => interaction.parse({xpubJSONFile: fixtures.invalidKeyJSON})).toThrow(/Missing required params/i);
    });

    it("missing xpub", () => {
      const interaction = interactionBuilder({network: MAINNET});
      const missingXpub = {...fixtures.validKeyJSON};
      Reflect.deleteProperty(missingXpub, 'p2sh');
      expect(() => interaction.parse(missingXpub)).toThrow(/Missing required params/i);
    });
    it("missing bip32path", () => {
      const interaction = interactionBuilder({network: TESTNET});
      const missingb32 = {...fixtures.validKeyJSON};
      Reflect.deleteProperty(missingb32, 'p2sh_deriv');
      expect(() => interaction.parse(missingb32)).toThrow(/Missing required params/i);
    });
    it("xfp in file and computed xfp don't match", () => {
      const interaction = interactionBuilder({network: TESTNET});
      const reallyMissingXFP = {...fixtures.validKeyJSON};
      //set to a valid depth>1 xpub
      reallyMissingXFP.xfp = '12341234';
      expect(() => interaction.parse(reallyMissingXFP)).toThrow(/Computed fingerprint does not match/i);
    });
    it("missing xfp but passes", () => {
      const interaction = interactionBuilder({network: TESTNET});
      const missingXFP = {...fixtures.validKeyJSON};
      Reflect.deleteProperty(missingXFP, 'xfp');
      const result = interaction.parse(missingXFP);
      expect(result).toEqual(fixtures.testPubkeyOutput);
    });
    it("no xfp and depth>1 xpub", () => {
      const interaction = interactionBuilder({network: TESTNET});
      const reallyMissingXFP = {...fixtures.validKeyJSON};
      Reflect.deleteProperty(reallyMissingXFP, 'xfp');
      //set to a valid depth>1 xpub
      reallyMissingXFP.p2sh = 'tpubDD7afgqjwFtnyu3YuReivwoGuJNyXNjFw5y9m4QDchpGzjgGuWhQUbBXafi73zqoUos7rCgLS24ebaj3d94UhuJQJfBUCN6FHB7bmp79J2J';
      expect(() => interaction.parse(reallyMissingXFP)).toThrow(/No xfp/i);
    });
    it("no xfp and depth>1 xpub", () => {
      const interaction = interactionBuilder({network: TESTNET});
      const reallyMissingXFP = {...fixtures.validKeyJSON};
      Reflect.deleteProperty(reallyMissingXFP, 'xfp');
      //set to a valid depth>1 xpub
      reallyMissingXFP.p2sh = 'tpubDD7afgqjwFtnyu3YuReivwoGuJNyXNjFw5y9m4QDchpGzjgGuWhQUbBXafi73zqoUos7rCgLS24ebaj3d94UhuJQJfBUCN6FHB7bmp79J2J';
      expect(() => interaction.parse(reallyMissingXFP)).toThrow(/No xfp/i);
    });
    it("non-matching bip32 prefix", () => {
      const interaction = interactionBuilder({network: TESTNET, bip32Path: "m/44'/0"});
      expect(() => interaction.parse(fixtures.validKeyJSON)).toThrow(/Problem with bip32/i);
    });

    it("success for valid JSON via TESTNET", () => {
      const interaction = interactionBuilder({network: TESTNET});
      const result = interaction.parse(fixtures.validKeyJSON);
      expect(result).toEqual(fixtures.testPubkeyOutput);
    });

    it("no bip32path returns same xpub", () => {
      const interaction = interactionBuilder({network: TESTNET});
      const result = interaction.parse(fixtures.validKeyJSON);
      expect(result).toEqual(fixtures.testPubkeyOutput);
    });
    it("default bip32path", () => {
      const interaction = interactionBuilder({
        network: TESTNET,
        bip32Path: COLDCARD_BASE_BIP32,
      });
      const result = interaction.parse(fixtures.validKeyJSON);
      expect(result).toEqual(fixtures.testPubkeyOutput);
    });
    it("derive down to depth 2 unhardened", () => {
      let b32Path = "m/45'/0";
      const interaction = interactionBuilder({
        network: TESTNET,
        bip32Path: b32Path,
      });
      const result = interaction.parse(fixtures.validKeyJSON);
      expect(result.rootFingerprint).toEqual(fixtures.testPubkeyOutput.rootFingerprint);
      expect(result.publicKey).toEqual(fixtures["m/45'/0"].publicKey);
    });
    it("derive down to depth 3 unhardened", () => {
      let b32Path = "m/45'/1/0";
      const interaction = interactionBuilder({
        network: TESTNET,
        bip32Path: b32Path,
      });
      const result = interaction.parse(fixtures.validKeyJSON);
      expect(result.rootFingerprint).toEqual(fixtures.testPubkeyOutput.rootFingerprint);
      expect(result.publicKey).toEqual(fixtures["m/45'/1/0"].publicKey);
    });
  });

  it("has a message about uploading file", () => {
    expect(interactionBuilder({
      network: TESTNET,
      bip32Path: COLDCARD_BASE_BIP32,
    }).hasMessagesFor({
      state: PENDING,
      level: INFO,
      code: "coldcard.upload_key",
      text: "Upload the JSON file",
    })).toBe(true);
  });
  it("has a message about exporting xpub", () => {
    expect(interactionBuilder({
      network: TESTNET,
      bip32Path: COLDCARD_BASE_BIP32,
    }).hasMessagesFor({
      state: PENDING,
      level: INFO,
      code: "coldcard.export_xpub",
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
    it("fails with invalid network", () => {
      expect(() => interactionBuilder({network: 'foo'})).toThrow(/Unknown network/i);
    });
    it("invalid bip32Path fails", () => {
      expect(() => interactionBuilder({
        bip32Path: 4,
        network: TESTNET,
      })).toThrow(/Bip32 path should be a string/i);
    });
  });

  describe("parse", () => {
    it("fails when sending in nothing or non json", () => {
      const notJSON = "test";
      const definitelyNotJSON = 77;
      const interaction = interactionBuilder({network: TESTNET});
      expect(() => interaction.parse(notJSON)).toThrow(/Unable to parse JSON/i);
      expect(() => interaction.parse(definitelyNotJSON)).toThrow(/Not valid JSON/i);
      expect(() => interaction.parse({})).toThrow(/Empty JSON file/i);
    });

    it("missing xpub", () => {
      const interaction = interactionBuilder({network: MAINNET});
      const missingXpub = {...fixtures.validKeyJSON};
      Reflect.deleteProperty(missingXpub, 'p2sh');
      expect(() => interaction.parse(missingXpub)).toThrow(/Missing required params/i);
    });
    it("missing bip32path", () => {
      const interaction = interactionBuilder({network: TESTNET});
      const missingb32 = {...fixtures.validKeyJSON};
      Reflect.deleteProperty(missingb32, 'p2sh_deriv');
      expect(() => interaction.parse(missingb32)).toThrow(/Missing required params/i);
    });
    it("xfp in file and computed xfp don't match", () => {
      const interaction = interactionBuilder({network: TESTNET});
      const reallyMissingXFP = {...fixtures.validKeyJSON};
      //set to a valid depth>1 xpub
      reallyMissingXFP.xfp = '12341234';
      expect(() => interaction.parse(reallyMissingXFP)).toThrow(/Computed fingerprint does not match/i);
    });
    it("missing xfp but passes", () => {
      const interaction = interactionBuilder({network: TESTNET});
      const missingXFP = {...fixtures.validKeyJSON};
      Reflect.deleteProperty(missingXFP, 'xfp');
      const result = interaction.parse(missingXFP);
      expect(result).toEqual(fixtures.testXpubOutput);
    });
    it("no xfp and depth>1 xpub", () => {
      const interaction = interactionBuilder({network: TESTNET});
      const reallyMissingXFP = {...fixtures.validKeyJSON};
      Reflect.deleteProperty(reallyMissingXFP, 'xfp');
      //set to a valid depth>1 xpub
      reallyMissingXFP.p2sh = 'tpubDD7afgqjwFtnyu3YuReivwoGuJNyXNjFw5y9m4QDchpGzjgGuWhQUbBXafi73zqoUos7rCgLS24ebaj3d94UhuJQJfBUCN6FHB7bmp79J2J';
      expect(() => interaction.parse(reallyMissingXFP)).toThrow(/No xfp/i);
    });
    it("non-matching bip32 prefix", () => {
      const interaction = interactionBuilder({network: TESTNET, bip32Path: "m/44'/0"});
      expect(() => interaction.parse(fixtures.validKeyJSON)).toThrow(/Problem with bip32/i);
    });

    it("no bip32path returns same xpub", () => {
      const interaction = interactionBuilder({network: TESTNET});
      const result = interaction.parse(fixtures.validKeyJSON);
      expect(result).toEqual(fixtures.testXpubOutput);
    });
    it("default bip32path", () => {
      const interaction = interactionBuilder({
        network: TESTNET,
        bip32Path: COLDCARD_BASE_BIP32,
      });
      const result = interaction.parse(fixtures.validKeyJSON);
      expect(result).toEqual(fixtures.testXpubOutput);
    });
    it("derive down to depth 2 unhardened", () => {
      let b32Path = "m/45'/0";
      const interaction = interactionBuilder({
        network: TESTNET,
        bip32Path: b32Path,
      });
      const result = interaction.parse(fixtures.validKeyJSON);
      expect(result.rootFingerprint).toEqual(fixtures.testXpubOutput.rootFingerprint);
      expect(result.xpub).toEqual(fixtures["m/45'/0"].xpub);
    });
    it("derive down to depth 3 unhardened", () => {
      let b32Path = "m/45'/1/0";
      const interaction = interactionBuilder({
        network: TESTNET,
        bip32Path: b32Path,
      });
      const result = interaction.parse(fixtures.validKeyJSON);
      expect(result.rootFingerprint).toEqual(fixtures.testXpubOutput.rootFingerprint);
      expect(result.xpub).toEqual(fixtures["m/45'/1/0"].xpub);
    });
  });

  it("has a message about uploading file", () => {
    expect(interactionBuilder({
      network: TESTNET,
      bip32Path: COLDCARD_BASE_BIP32,
    }).hasMessagesFor({
      state: PENDING,
      level: INFO,
      code: "coldcard.upload_key",
      text: "Upload the JSON file",
    })).toBe(true);
  });
  it("has a message about exporting xpub", () => {
    expect(interactionBuilder({
      network: TESTNET,
      bip32Path: COLDCARD_BASE_BIP32,
    }).hasMessagesFor({
      state: PENDING,
      level: INFO,
      code: "coldcard.export_xpub",
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
  describe("constructor", () => {
    it("fails when sending in no psbt", () => {
      expect(() => interactionBuilder({})).toThrow(/PSBT must be included/i);
   });

  });

  describe("request", () => {
    it("return psbt if there is one", () => {
      const interaction = interactionBuilder({
        network: TESTNET,
        psbt: fixtures.singleInputB64PSBT,
      });
      const result = interaction.request();
      expect(result).toEqual(fixtures.singleInputB64PSBT);
    });
    // TODO: create the PSBT from other parameters instead
  });

  describe("parse", () => {
    it("return single input, single signature set", () => {
      const interaction = interactionBuilder({psbt: fixtures.singleInputB64PSBT_partiallySigned.unsigned});
      const result = interaction.parse(fixtures.singleInputB64PSBT_partiallySigned.unsigned);
      expect(result).toEqual(fixtures.singleInputB64PSBT_partiallySigned.signatureResponse);
      expect(Object.keys(result).length).toEqual(1);
    });
    it("return single input, double signature set", () => {
      const interaction = interactionBuilder({psbt: fixtures.singleInputB64PSBT_fullySigned.unsigned});
      const result = interaction.parse(fixtures.singleInputB64PSBT_fullySigned.unsigned);
      expect(result).toEqual(fixtures.singleInputB64PSBT_fullySigned.signatureResponse);
      expect(Object.keys(result).length).toEqual(2);
    });
    it("return multi input, single signature set", () => {
      const interaction = interactionBuilder({psbt: fixtures.multiInputB64PSBT_partiallySigned.unsigned});
      const result = interaction.parse(fixtures.multiInputB64PSBT_partiallySigned.unsigned);
      expect(result).toEqual(fixtures.multiInputB64PSBT_partiallySigned.signatureResponse);
      expect(Object.keys(result).length).toEqual(1);
    });
    it("return multi input, double signature set", () => {
      const interaction = interactionBuilder({psbt:fixtures.multiInputB64PSBT_fullySigned.unsigned});
      const result = interaction.parse(fixtures.multiInputB64PSBT_fullySigned.unsigned);
      expect(result).toEqual(fixtures.multiInputB64PSBT_fullySigned.signatureResponse);
      expect(Object.keys(result).length).toEqual(2);
    });
    it("psbt has no signatures", () => {
      const interaction = interactionBuilder({psbt: fixtures.singleInputB64PSBT});
      expect(() => interaction.parse(fixtures.singleInputB64PSBT)).toThrow(/No signatures found/i);
      expect(() => interaction.parse(fixtures.multiInputB64PSBT)).toThrow(/No signatures found/i);
    });
  });

  it("has a message about wallet config", () => {
    expect(interactionBuilder({
      network: TESTNET,
      psbt: fixtures.singleInputB64PSBT,
    }).hasMessagesFor({
      state: PENDING,
      level: INFO,
      code: "coldcard.install_multisig_config",
      text: "has the multisig wallet installed",
    })).toBe(true);
  });
  it("has a message about downloading psbt", () => {
    expect(interactionBuilder({
      network: TESTNET,
      psbt: fixtures.singleInputB64PSBT,
    }).hasMessagesFor({
      state: PENDING,
      level: INFO,
      code: "coldcard.download_psbt",
      text: "Download and save this PSBT",
    })).toBe(true);
  });
  it("has a message about transferring psbt", () => {
    expect(interactionBuilder({
      network: TESTNET,
      psbt: fixtures.singleInputB64PSBT,
    }).hasMessagesFor({
      state: PENDING,
      level: INFO,
      code: "coldcard.transfer_psbt",
      text: "Transfer the PSBT",
    })).toBe(true);
  });
  it("has a message about transferring psbt", () => {
    expect(interactionBuilder({
      network: TESTNET,
      psbt: fixtures.singleInputB64PSBT,
    }).hasMessagesFor({
      state: ACTIVE,
      level: INFO,
      code: "coldcard.transfer_psbt",
      text: "Transfer the PSBT",
    })).toBe(true);
  });
  it("has a message about ready to sign", () => {
    expect(interactionBuilder({
      network: TESTNET,
      psbt: fixtures.singleInputB64PSBT,
    }).hasMessagesFor({
      state: ACTIVE,
      level: INFO,
      code: "coldcard.select_psbt",
      text: "Choose 'Ready To Sign'",
    })).toBe(true);
  });
  it("has a message about verify tx", () => {
    expect(interactionBuilder({
      network: TESTNET,
      psbt: fixtures.singleInputB64PSBT,
    }).hasMessagesFor({
      state: ACTIVE,
      level: INFO,
      code: "coldcard.sign_psbt",
      text: "Verify the transaction",
    })).toBe(true);
  });
  it("has a message about upload PSBT", () => {
    expect(interactionBuilder({
      network: TESTNET,
      psbt: fixtures.singleInputB64PSBT,
    }).hasMessagesFor({
      state: ACTIVE,
      level: INFO,
      code: "coldcard.upload_signed_psbt",
      text: "Upload the signed PSBT",
    })).toBe(true);
  });

});

describe("ColdcardMultisigWalletConfig", () => {

  let jsonConfigCopy = '';

  beforeEach(() => {
    // runs before each test in this block
    jsonConfigCopy = JSON.parse(JSON.stringify(fixtures.jsonConfigUUID));
  });

  function interactionBuilder(incomingConfig) { return new ColdcardMultisigWalletConfig(incomingConfig); }

  it("can adapt unchained config to coldcard config with uuid", () => {
    const interaction = interactionBuilder({jsonConfig: fixtures.jsonConfigUUID});
    const output = interaction.adapt();
    expect(output).toEqual(fixtures.coldcardConfigUUID);
  });

  it("can adapt caravan config to coldcard config with name", () => {
    const jsonConfigName = {...jsonConfigCopy};
    Reflect.deleteProperty(jsonConfigName, "uuid");
    const interaction = interactionBuilder({jsonConfig: jsonConfigName});
    const output = interaction.adapt();
    expect(output).toEqual(fixtures.coldcardConfigName);
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

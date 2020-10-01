import {ColdcardMultisigWalletConfig, WALLET_CONFIG_VERSION} from './coldcard';

describe("ColdcardMultisigWalletConfig", () => {
  const jsonConfigUUID = {
    name: "Test",
    addressType: "P2SH",
    network: "testnet",
    quorum: {
      requiredSigners: 2,
      totalSigners: 3
    },
    startingAddressIndex: 5,
    extendedPublicKeys: [
      {
        name: "unchained",
        xpub: "tpubDF17mBZYUi35r7UEkGr7SjSisec8QL2J1zGh9WQtmnhJtHeMFy2eH2Xsnr2ynxENbqHmcEA4NnoT8T6RZxks4G5evZdWy1RbSPTm8LtNPU3",
        bip32Path: "Unknown",
        xfp: "83471e78"
      },
      {
        name: "Os_words1",
        xpub: "tpubDF61GHbPYRhEEsqNTDF2jbMBkEMmoksy1h2URbhZ8p7JfR9QRgbn6vkeA7g3t4Ue6uSHhYJxD9mRVz1ZQVYyW3RAPPuwVM4UeZyZPKu89DY",
        bip32Path: "m/45'/1'/50'/0",
        xfp: "f57ec65d"
      },
      {
        name: "Os_words2",
        xpub: "tpubDEZxsxeamoPim6T1hg2igm4vDmdQrQnHVH5gM5NjcjowtgYVv5ZhhR5sFgRVNjRFGk1HmxsFsYhu3jGaAGVCpCsL5AbAVk6xKssr6gK3tPk",
        bip32Path: "m/45'/1'/60'/0",
        xfp: "f57ec65d"
      }
    ],
     uuid: "OWPyFOA1"
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

  let jsonConfigCopy;

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
    const jsonConfigName = { ...jsonConfigCopy };
    Reflect.deleteProperty(jsonConfigName, "uuid");
    const interaction = interactionBuilder({jsonConfig: jsonConfigName});
    const output = interaction.adapt();
    expect(output).toEqual(coldcardConfigName);
  });

  it("fails when send in nothing or non json", () => {
    const notJSON = "test";
    const defNotJSON = 77;
    const jsonConfigBad = {'test': 0};
    expect(() => interactionBuilder({jsonConfig: notJSON})).toThrow(/Unable to parse JSON/i);
    expect(() => interactionBuilder({jsonConfig: defNotJSON})).toThrow(/Not valid JSON/i);
    expect(() => interactionBuilder({jsonConfig: {}})).toThrow(/Configuration file needs/i);
    expect(() => interactionBuilder({jsonConfig: jsonConfigBad})).toThrow(/Configuration file needs/i);
  })

  it("jsonConfig without extendedPublicKeys", () => {
    const jsonMissingKeys = { ...jsonConfigCopy };
    Reflect.deleteProperty(jsonMissingKeys, "extendedPublicKeys");
    expect(() => interactionBuilder({jsonConfig: jsonMissingKeys})).toThrow("Configuration file needs extendedPublicKeys.");
  });

  it("jsonConfig with missing xfp", () => {
    const jsonMissingXFP = { ...jsonConfigCopy };
    Reflect.deleteProperty(jsonMissingXFP.extendedPublicKeys[0], "xfp");
    expect(() => interactionBuilder({jsonConfig: jsonMissingXFP})).toThrow("ExtendedPublicKeys missing at least one xfp.");
  });

  it("jsonConfig with xfp not length 8", () => {
    const jsonMissingMultipleXFP =  { ...jsonConfigCopy };
    jsonMissingMultipleXFP.extendedPublicKeys[1].xfp = "1234";
    expect(() => interactionBuilder({jsonConfig: jsonMissingMultipleXFP})).toThrow("XFP not length 8");
  });

  it("jsonConfig with xfp not string", () => {
    const jsonMissingMultipleXFP =  { ...jsonConfigCopy };
    jsonMissingMultipleXFP.extendedPublicKeys[0].xfp = 1234;
    expect(() => interactionBuilder({jsonConfig: jsonMissingMultipleXFP})).toThrow("XFP not a string");
  });

  it("jsonConfig with xfp invalid hex", () => {
    const jsonMissingMultipleXFP =  { ...jsonConfigCopy };
    jsonMissingMultipleXFP.extendedPublicKeys[0].xfp = "1234567z";
    expect(() => interactionBuilder({jsonConfig: jsonMissingMultipleXFP})).toThrow("XFP is invalid hex");
  });

  it("jsonConfig with missing uuid && name", () => {
    const jsonMissingUUIDandName =  { ...jsonConfigCopy };
    Reflect.deleteProperty(jsonMissingUUIDandName, "uuid");
    Reflect.deleteProperty(jsonMissingUUIDandName, "name");
    expect(() => interactionBuilder({jsonConfig: jsonMissingUUIDandName})).toThrow("Configuration file needs a UUID or a name.");
  });

  it("jsonConfig with missing quorum.requiredSigners", () => {
    const jsonMissingQuorumRequired =  { ...jsonConfigCopy };
    Reflect.deleteProperty(jsonMissingQuorumRequired.quorum, "requiredSigners");
    expect(() => interactionBuilder({jsonConfig: jsonMissingQuorumRequired})).toThrow("Configuration file needs quorum.requiredSigners and quorum.totalSigners.");
  });

  it("jsonConfig with missing quorum.totalSigners", () => {
    const jsonMissingQuorumTotal =  { ...jsonConfigCopy };
    Reflect.deleteProperty(jsonMissingQuorumTotal.quorum, "totalSigners");
    expect(() => interactionBuilder({jsonConfig: jsonMissingQuorumTotal})).toThrow("Configuration file needs quorum.requiredSigners and quorum.totalSigners.");
  });

  it("jsonConfig with missing addressType", () => {
    const jsonMissingAddressType =  { ...jsonConfigCopy };
    Reflect.deleteProperty(jsonMissingAddressType, "addressType");
    expect(() => interactionBuilder({jsonConfig: jsonMissingAddressType})).toThrow("Configuration file needs addressType.");
  });

});

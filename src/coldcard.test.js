import {
  ColdcardExportPublicKey,
  ColdcardExportExtendedPublicKey,
  ColdcardSignMultisigTransaction,
  parseColdcardConfig,
  generateColdcardConfig,
} from './coldcard';
import {
  MAINNET,
  TESTNET,
  TEST_FIXTURES,
  ROOT_FINGERPRINT
} from "unchained-bitcoin";
import {
  INFO,
  PENDING,
  ACTIVE,
  ERROR,
} from './interaction';
import {coldcardFixtures} from './coldcard.fixtures';
import { MultisigWalletConfig } from './config';

const {multisigs, transactions} = TEST_FIXTURES;

const {nodes} = TEST_FIXTURES.keys.open_source;

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
    it("unknown chroot unsupported", () => {
      const interaction = interactionBuilder({
        network: TESTNET,
        bip32Path: "m/44'/0",
      });
      expect(interaction.isSupported()).toBe(false);
      expect(interaction.hasMessagesFor({
        state: PENDING,
        level: ERROR,
        code: 'coldcard.bip32_path.unknown_chroot_error',
      })).toBe(true);
    });
    it("invalid bip32Path unsupported", () => {
      const interaction = interactionBuilder({
        network: TESTNET,
        bip32Path: "m/45'/1/01",
      });
      expect(interaction.isSupported()).toBe(false);
      expect(interaction.hasMessagesFor({
        state: PENDING,
        level: ERROR,
        code: 'coldcard.bip32_path.path_error',
      })).toBe(true);
    });
    it("hardened after unhardened unsupported", () => {
      const interaction = interactionBuilder({
        network: TESTNET,
        bip32Path: "m/45'/1/1'",
      });
      expect(interaction.isSupported()).toBe(false);
      expect(interaction.hasMessagesFor({
        state: PENDING,
        level: ERROR,
        code: 'coldcard.bip32_path.no_hardened_relative_path_error',
      })).toBe(true);
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
      expect(() => interaction.parse(notJSON)).toThrow(/Unable to parse JSON/i);
      expect(() => interaction.parse(definitelyNotJSON)).toThrow(/Not valid JSON/i);
      expect(() => interaction.parse({})).toThrow(/Empty JSON file/i);
      expect(() => interaction.parse({xpubJSONFile: coldcardFixtures.invalidColdcardXpubJSON})).toThrow(/Missing required params/i);
    });

    it("missing xpub", () => {
      const interaction = interactionBuilder({
        network: MAINNET,
        bip32Path: "m/45'/0/0",
      });
      const missingXpub = {...coldcardFixtures.validColdcardXpubJSON};
      Reflect.deleteProperty(missingXpub, 'p2sh');
      expect(() => interaction.parse(missingXpub)).toThrow(/Missing required params/i);
    });
    it("missing bip32path", () => {
      const interaction = interactionBuilder({
        network: TESTNET,
        bip32Path: "m/45'/1/0",
      });
      const missingb32 = {...coldcardFixtures.validColdcardXpubJSON};
      Reflect.deleteProperty(missingb32, 'p2sh_deriv');
      expect(() => interaction.parse(missingb32)).toThrow(/Missing required params/i);
    });
    it("xfp in file and computed xfp don't match", () => {
      const interaction = interactionBuilder({
        network: TESTNET,
        bip32Path: "m/45'/1/0",
      });
      const reallyMissingXFP = {...coldcardFixtures.validColdcardXpubJSON};
      //set to a valid depth>1 xpub
      reallyMissingXFP.xfp = '12341234';
      expect(() => interaction.parse(reallyMissingXFP)).toThrow(/Computed fingerprint does not match/i);
    });
    it("missing xfp but passes bc depth is 1", () => {
      const bip32Path = "m/45'";
      const interaction = interactionBuilder({
        network: TESTNET,
        bip32Path,
      });
      const missingXFP = {...coldcardFixtures.validColdcardXpubJSON};
      Reflect.deleteProperty(missingXFP, 'xfp');
      expect(interaction.isSupported()).toEqual(true);
      const result = interaction.parse(missingXFP);
      expect(result).toEqual({
        rootFingerprint: ROOT_FINGERPRINT,
        publicKey: nodes[bip32Path].pub,
        bip32Path,
      });
    });
    it("no xfp and depth>1 xpub", () => {
      const interaction = interactionBuilder({
        network: TESTNET,
        bip32Path: "m/45'/1/0",
      });
      const reallyMissingXFP = {...coldcardFixtures.validColdcardXpubJSON};
      Reflect.deleteProperty(reallyMissingXFP, 'xfp');
      //set to a valid depth>1 xpub
      reallyMissingXFP.p2sh = nodes["m/45'/0'/0'"].tpub;
      expect(() => interaction.parse(reallyMissingXFP)).toThrow(/No xfp/i);
    });
    it("xfp and depth>1 xpub", () => {
      const bip32Path = "m/48'/1'/0'/1'/0/0";
      const interaction = interactionBuilder({
        network: TESTNET,
        bip32Path,
      });
      const deeperXPUB = {...coldcardFixtures.validColdcardXpubJSON};
      deeperXPUB.p2sh = coldcardFixtures.validColdcardXpubJSON.p2wsh_p2sh;
      expect(interaction.isSupported()).toEqual(true);
      const result = interaction.parse(deeperXPUB);
      expect(result).toEqual({
        publicKey: nodes[bip32Path].pub,
        bip32Path,
        rootFingerprint: nodes[bip32Path].rootFingerprint,
      });
    });
    it("success for valid JSON via TESTNET", () => {
      const bip32Path = "m/45'";
      const interaction = interactionBuilder({
        network: TESTNET,
        bip32Path,
      });
      expect(interaction.isSupported()).toEqual(true);
      const result = interaction.parse(coldcardFixtures.validColdcardXpubNewFirmwareJSON);
      expect(result).toEqual({
        rootFingerprint: ROOT_FINGERPRINT,
        publicKey: nodes[bip32Path].pub,
        bip32Path,
      });
    });
    it("success for valid JSON via MAINNET", () => {
      const bip32Path = "m/45'";
      const interaction = interactionBuilder({
        network: MAINNET,
        bip32Path,
      });
      expect(interaction.isSupported()).toEqual(true);
      const result = interaction.parse(coldcardFixtures.validColdcardXpubMainnetJSON);
      expect(result).toEqual({
        rootFingerprint: ROOT_FINGERPRINT,
        publicKey: nodes[bip32Path].pub,
        bip32Path,
      });
    });
    it("derive down to depth 2 unhardened", () => {
      let b32Path = "m/45'/0";
      const interaction = interactionBuilder({
        network: TESTNET,
        bip32Path: b32Path,
      });
      expect(interaction.isSupported()).toEqual(true);
      const result = interaction.parse(coldcardFixtures.validColdcardXpubJSON);
      expect(result.rootFingerprint).toEqual(ROOT_FINGERPRINT);
      expect(result.publicKey).toEqual(nodes["m/45'/0"].pub);
    });
    it("derive down to depth 3 unhardened", () => {
      let b32Path = "m/45'/1/0";
      const interaction = interactionBuilder({
        network: TESTNET,
        bip32Path: b32Path,
      });
      expect(interaction.isSupported()).toEqual(true);
      const result = interaction.parse(coldcardFixtures.validColdcardXpubJSON);
      expect(result.rootFingerprint).toEqual(ROOT_FINGERPRINT);
      expect(result.publicKey).toEqual(nodes["m/45'/1/0"].pub);
    });
  });

  it("has a message about uploading file", () => {
    expect(interactionBuilder({
      network: TESTNET,
      bip32Path: "m/45'",
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
      bip32Path: "m/45'",
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
      expect(() => interactionBuilder({network: 'foob'})).toThrow(/Unknown network/i);
    });

    it("unknown chroot unsupported", () => {
      const interaction = interactionBuilder({
        network: TESTNET,
        bip32Path: "m/44'/0",
      });
      expect(interaction.isSupported()).toBe(false);
      expect(interaction.hasMessagesFor({
        state: PENDING,
        level: ERROR,
        code: 'coldcard.bip32_path.unknown_chroot_error',
      })).toBe(true);
    });
    it("invalid bip32Path unsupported", () => {
      const interaction = interactionBuilder({
        network: TESTNET,
        bip32Path: "m/45'/1/01",
      });
      expect(interaction.isSupported()).toBe(false);
      expect(interaction.hasMessagesFor({
        state: PENDING,
        level: ERROR,
        code: 'coldcard.bip32_path.path_error',
      })).toBe(true);
    });
    it("hardened after unhardened unsupported", () => {
      const interaction = interactionBuilder({
        network: TESTNET,
        bip32Path: "m/45'/1/1'",
      });
      expect(interaction.isSupported()).toBe(false);
      expect(interaction.hasMessagesFor({
        state: PENDING,
        level: ERROR,
        code: 'coldcard.bip32_path.no_hardened_relative_path_error',
      })).toBe(true);
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
      expect(() => interaction.parse(notJSON)).toThrow(/Unable to parse JSON/i);
      expect(() => interaction.parse(definitelyNotJSON)).toThrow(/Not valid JSON/i);
      expect(() => interaction.parse({})).toThrow(/Empty JSON file/i);
    });

    it("missing xpub", () => {
      const interaction = interactionBuilder({
        network: MAINNET,
        bip32Path: "m/45'/0/0",
      });
      const missingXpub = {...coldcardFixtures.validColdcardXpubJSON};
      Reflect.deleteProperty(missingXpub, 'p2sh');
      expect(() => interaction.parse(missingXpub)).toThrow(/Missing required params/i);
    });
    it("missing bip32path", () => {
      const interaction = interactionBuilder({
        network: TESTNET,
        bip32Path: "m/45'/1/0",
      });
      const missingb32 = {...coldcardFixtures.validColdcardXpubJSON};
      Reflect.deleteProperty(missingb32, 'p2sh_deriv');
      expect(() => interaction.parse(missingb32)).toThrow(/Missing required params/i);
    });
    it("xfp in file and computed xfp don't match", () => {
      const interaction = interactionBuilder({
        network: TESTNET,
        bip32Path: "m/45'/1/0",
      });
      const reallyMissingXFP = {...coldcardFixtures.validColdcardXpubJSON};
      //set to a valid depth>1 xpub
      reallyMissingXFP.xfp = '12341234';
      expect(() => interaction.parse(reallyMissingXFP)).toThrow(/Computed fingerprint does not match/i);
    });
    it("missing xfp but passes", () => {
      const bip32Path = "m/45'";
      const interaction = interactionBuilder({
        network: TESTNET,
        bip32Path,
      });
      const missingXFP = {...coldcardFixtures.validColdcardXpubJSON};
      Reflect.deleteProperty(missingXFP, 'xfp');
      expect(interaction.isSupported()).toEqual(true);
      const result = interaction.parse(missingXFP);
      expect(result).toEqual({
        rootFingerprint: ROOT_FINGERPRINT,
        xpub: nodes[bip32Path].tpub,
        bip32Path,
      });
    });
    it("no xfp and depth>1 xpub", () => {
      const interaction = interactionBuilder({
        network: TESTNET,
        bip32Path: "m/45'/1/0",
      });
      const reallyMissingXFP = {...coldcardFixtures.validColdcardXpubJSON};
      Reflect.deleteProperty(reallyMissingXFP, 'xfp');
      //set to a valid depth>1 xpub
      reallyMissingXFP.p2sh = 'tpubDD7afgqjwFtnyu3YuReivwoGuJNyXNjFw5y9m4QDchpGzjgGuWhQUbBXafi73zqoUos7rCgLS24ebaj3d94UhuJQJfBUCN6FHB7bmp79J2J';
      expect(() => interaction.parse(reallyMissingXFP)).toThrow(/No xfp/i);
    });

    it("xfp and depth>1 xpub", () => {
      const bip32Path = "m/48'/1'/0'/1'/0/0";
      const interaction = interactionBuilder({
        network: TESTNET,
        bip32Path,
      });
      const deeperXPUB = {...coldcardFixtures.validColdcardXpubJSON};
      //set to a valid depth>1 xpub
      deeperXPUB.p2sh = coldcardFixtures.validColdcardXpubJSON.p2wsh_p2sh;
      expect(interaction.isSupported()).toEqual(true);
      const result = interaction.parse(deeperXPUB);

      expect(result).toEqual({
        xpub: nodes[bip32Path].tpub,
        bip32Path,
        rootFingerprint: nodes[bip32Path].rootFingerprint,
      });
    });
    it("derive down to depth 2 unhardened", () => {
      let bip32Path = "m/45'/0";
      const interaction = interactionBuilder({
        network: TESTNET,
        bip32Path,
      });
      const result = interaction.parse(coldcardFixtures.validColdcardXpubJSON);
      expect(result.rootFingerprint).toEqual(ROOT_FINGERPRINT);
      expect(result.xpub).toEqual(nodes[bip32Path].tpub);
    });
    it("derive down to depth 3 unhardened", () => {
      let bip32Path = "m/45'/1/0";
      const interaction = interactionBuilder({
        network: TESTNET,
        bip32Path,
      });
      const result = interaction.parse(coldcardFixtures.validColdcardXpubJSON);
      expect(result.rootFingerprint).toEqual(ROOT_FINGERPRINT);
      expect(result.xpub).toEqual(nodes[bip32Path].tpub);
    });
  });

  it("has a message about uploading file", () => {
    expect(interactionBuilder({
      network: TESTNET,
      bip32Path: "m/45'",
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
      bip32Path: "m/45'",
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
      const interaction = interactionBuilder({psbt: multisigs[0].psbtPartiallySigned});
      const result = interaction.parse(multisigs[0].psbtPartiallySigned);
      const signatureSet = {};
      signatureSet[multisigs[0].publicKey] = multisigs[0].transaction.signature;
      expect(result).toEqual(signatureSet);
      expect(Object.keys(result).length).toEqual(1);
    });
    // it("return multi input, double signature set", () => {
    //   const interaction = interactionBuilder({psbt:coldcardFixtures.multiInputB64PSBT_fullySigned.unsigned});
    //   const result = interaction.parse(coldcardFixtures.multiInputB64PSBT_fullySigned.unsigned);
    //   expect(result).toEqual(coldcardFixtures.multiInputB64PSBT_fullySigned.signatureResponse);
    //   expect(Object.keys(result).length).toEqual(2);
    // });
    it("psbt has no signatures", () => {
      const interaction = interactionBuilder({psbt: multisigs[0].psbt});
      expect(() => interaction.parse(multisigs[0].psbt)).toThrow(/No signatures found/i);
    });
  });

  it("has a message about wallet config", () => {
    expect(interactionBuilder({
      network: TESTNET,
      psbt: multisigs[0].psbt,
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
      psbt: multisigs[0].psbt,
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
      psbt: multisigs[0].psbt,
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
      psbt: multisigs[0].psbt,
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
      psbt: multisigs[0].psbt,
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
      psbt: multisigs[0].psbt,
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
      psbt: multisigs[0].psbt,
    }).hasMessagesFor({
      state: ACTIVE,
      level: INFO,
      code: "coldcard.upload_signed_psbt",
      text: "Upload the signed PSBT",
    })).toBe(true);
  });

});

describe("config", () => {
  let options;
  beforeEach(() => {
    options = JSON.parse(JSON.stringify(coldcardFixtures.jsonConfigUUID));
  })

  describe("parseColdcardConfig", () => {
    it("should be able to instantiate MultisigWalletConfig from a coldcard config", () => {
      const config = parseColdcardConfig(coldcardFixtures.coldcardConfigDerivation);
      expect(config.network).toEqual(options.network);
      expect(config.derivation).toBeTruthy();
      config.extendedPublicKeys.forEach((key) => {
        const expectedKeys = options.extendedPublicKeys;
        // config's xpub array should have the right xfp and xpub 
        expect(
          expectedKeys.findIndex(({ xfp, xpub }) => key.xfp === xfp && key.xpub === xpub)
        ).toBeGreaterThan(-1)
      })
    })
  })
  
  describe("generateColdcardConfig", () => {
    it("should be able to export valid Coldcard config", () => {
      let output = generateColdcardConfig(options)
      // test with uuid as name
      expect(output).toEqual(coldcardFixtures.coldcardConfigUUID);
      
      // test with name as fallback for missing uuid
      Reflect.deleteProperty(options, "uuid");
      output = generateColdcardConfig(options);
      expect(output).toEqual(coldcardFixtures.coldcardConfigName);
    })

    it("should be able to generate the same from a MultisigWalletConfig or object", () => {
      const fromOptions = generateColdcardConfig(options)
      const config = generateColdcardConfig(new MultisigWalletConfig(options))
      expect(fromOptions).toEqual(config)
    })
  })
})

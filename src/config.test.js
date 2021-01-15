import { MultisigWalletConfig } from './config';
import {coldcardFixtures} from './coldcard.fixtures';

describe('MultisigWalletConfig', () => {
  let jsonConfig, options;
  function configBuilderFromJson(json) {
    return MultisigWalletConfig.fromJSON(json);
  }

  function configBuilder(configOptions) {
    return new MultisigWalletConfig(configOptions);
  }

  function createConfigAndValidateXFPs(configOptions) {
    return (new MultisigWalletConfig(configOptions)).validateExtendedPublicKeys(true);
  }
  
  beforeEach(() => {
    // runs before each test in this block
    options = JSON.parse(JSON.stringify(coldcardFixtures.jsonConfigUUID));
    jsonConfig = JSON.stringify(coldcardFixtures.jsonConfigUUID);
  });
  
  it('should be able to instantiate from json', () => {
    const config = MultisigWalletConfig.fromJSON(jsonConfig);

    expect(config.name).toEqual(options.uuid);
    expect(config.addressType).toEqual(options.addressType);
    expect(config.network).toEqual(options.network);
    config.extendedPublicKeys.forEach((xpub, index) => {
      expect(xpub.xpub).toEqual(options.extendedPublicKeys[index].xpub);
    });
    expect(config.requiredSigners).toEqual(options.requiredSigners);
    expect(config.extendedPublicKeys.length).toEqual(options.extendedPublicKeys.length);
  });
   
  it('should throw with invalid json', () => {
    const notJSON = "test";
    const definitelyNotJSON = 77;
    const jsonConfigBad = { 'test': 0 };

    expect(() => configBuilderFromJson(notJSON).toThrow(/Unable to parse JSON/i));
    expect(() => configBuilderFromJson(definitelyNotJSON).toThrow(/Not valid JSON/i));
    expect(() => configBuilderFromJson({}).toThrow(/Not valid JSON/i));
    expect(() => configBuilderFromJson(jsonConfigBad).toThrow());
  });

  it("throws for config without extendedPublicKeys", () => {
    Reflect.deleteProperty(options, "extendedPublicKeys");
    expect(() => configBuilder(options)).toThrow("Wallet config needs array of extendedPublicKeys.");
  });

  it("throws for a config without a supported client type", () => {
    options.client = {type: 'fake-node'};
    expect(() => configBuilder(options)).toThrow("not supported");
  });

  it("throws with missing xfp if required", () => {
    Reflect.deleteProperty(options.extendedPublicKeys[0], "xfp");
    expect(() => createConfigAndValidateXFPs(options)).toThrow("ExtendedPublicKeys missing at least one xfp.");
  });

  it("throws with xfp as Unknown", () => {
    options.extendedPublicKeys[0].xfp = "Unknown";
    expect(() => createConfigAndValidateXFPs(options)).toThrow("ExtendedPublicKeys missing at least one xfp.");
  });

  it("throws with xfp not length 8", () => {
    options.extendedPublicKeys[1].xfp = "1234";
    expect(() => createConfigAndValidateXFPs(options)).toThrow(/length 8/i);
  });

  it("throws with xfp that's not a string", () => {
    options.extendedPublicKeys[0].xfp = 1234;
    expect(() => createConfigAndValidateXFPs(options)).toThrow(/must be a string/i);
  });

  it("throws with xfp with invalid hex", () => {
    options.extendedPublicKeys[0].xfp = "1234567z";
    expect(() => createConfigAndValidateXFPs(options)).toThrow(/must be valid hex/i);
  });

  it("throws with missing uuid && name", () => {
    Reflect.deleteProperty(options, "uuid");
    Reflect.deleteProperty(options, "name");
    expect(() => configBuilder(options)).toThrow(/Name or UUID required/);
  });

  it("throws with missing requiredSigners", () => {
    Reflect.deleteProperty(options, "requiredSigners");
    expect(() => configBuilder(options)).toThrow("Wallet config needs requiredSigners.");
  });

  it("throws with missing extendedPublicKeys", () => {
    Reflect.deleteProperty(options, "extendedPublicKeys");
    expect(() => configBuilder(options)).toThrow("Wallet config needs array of extendedPublicKeys.");
  });

  it("throws with missing addressType", () => {
    Reflect.deleteProperty(options, "addressType");
    expect(() => configBuilder(options)).toThrow("Wallet config needs addressType.");
  });

  it("should support valid client types", () => {
    options.client = { type: "public" };
    let output = new MultisigWalletConfig(options);
    expect(output).toHaveProperty("client");
    expect(output.client.type).toEqual(options.client.type);
    // not doing any validation other than type 
    options.client = {type: "private", host: "localhost" };
    output = new MultisigWalletConfig(options);
    expect(output.client.type).toEqual(options.client.type);
  });

  it("should be able to export valid Caravan config", () => {
    const config = new MultisigWalletConfig(options);
    const caravanConfig = config.toCaravanConfig();
    expect(caravanConfig).toBeTruthy();
    // expect(caravanConfig).toEqual(config.toJSON());
  });

  it("should be able to add placeholder root fingerprints", () => {
    Reflect.deleteProperty(options.extendedPublicKeys[0], 'xfp');
    let config = new MultisigWalletConfig(options);
    // verify a root fingerprint is missing
    let isMissingOneXfp = config.extendedPublicKeys.some(xpub => !xpub.xfp);
    expect(isMissingOneXfp).toBeTruthy();

    // verify placeholders are added
    config.addPlaceholderFingerprints();
    isMissingOneXfp = config.extendedPublicKeys.some(xpub => !xpub.xfp);
    expect(isMissingOneXfp).toBeFalsy();

    // confirm it fails if all xpubs are missing xfp
    options.extendedPublicKeys.forEach(key => {
      if (key.xfp) Reflect.deleteProperty(key, 'xfp');
    });

    config = new MultisigWalletConfig(options);
    expect(() => config.addPlaceholderFingerprints()).toThrow(/at least one xfp is required/i);
  });

  it("Should not allow the same root fingerprint to be used for multiple keys", () => {
    options.extendedPublicKeys[0].xfp = options.extendedPublicKeys[1].xfp;
    expect(() => new MultisigWalletConfig(options)).toThrow();
  });
});

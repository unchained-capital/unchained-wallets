import { parseCaravanConfig, generateCaravanConfig } from "./caravan";
import { CARAVAN_CONFIG } from "./fixtures/caravan";
import { JSON_CONFIG_NAME } from "./fixtures/config";

function compareProperties(expected, actual) {
  Object.keys(expected).forEach(key => {
    expect(actual).toHaveProperty(key);
    expect(actual[key]).toEqual(expected[key]);
  });
}

describe("CARAVAN", () => {
  describe("config", () => {
    describe("parseCaravanConfig", () => {
      it("should be able to instantiate MultisigWalletConfig from a caravan config", () => {
        const config = parseCaravanConfig(CARAVAN_CONFIG);
        const expectedConfig = JSON.parse(CARAVAN_CONFIG);
        const actualConfig = JSON.parse(generateCaravanConfig(config));
        compareProperties(expectedConfig, actualConfig);
      });
    });

    describe("generateCaravanConfig", () => {
      let options;
      beforeEach(() => {
        options = JSON.parse(JSON.stringify(JSON_CONFIG_NAME));
      });

      it("should be able to generate a valid caravan config given a MultisigWalletConfig", () => {
        const config = generateCaravanConfig(options);
        const expectedConfig = JSON.parse(CARAVAN_CONFIG);
        const actualConfig = JSON.parse(config);
        compareProperties(expectedConfig, actualConfig);
      });

      it("throws for a config without a supported client type", () => {
        options.client = {type: "fake-node"};
        expect(() => generateCaravanConfig(options)).toThrow("not supported");
      });

      it("should be able to generate a caravan config from a config options object", () => {
        const config = generateCaravanConfig(options);
        const expectedConfig = JSON.parse(CARAVAN_CONFIG);
        const actualConfig = JSON.parse(config);
        compareProperties(expectedConfig, actualConfig);
      });
    });
  });
});

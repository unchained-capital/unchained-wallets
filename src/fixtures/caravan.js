export const CARAVAN_CONFIG = JSON.stringify({
    name: "Test",
    addressType: "P2SH",
    network: "testnet",
    quorum: {
      requiredSigners: 2,
      totalSigners: 3,
    },
    startingAddressIndex: 5,
    client: { type: "public" },
    extendedPublicKeys: [
      {
        name: "unchained",
        xpub:
          "tpubDF17mBZYUi35iCPDfFAa3jFd23L5ZF49tpS1AS1cEqNwhNaS8qVVD8ZPj67iKEarhPuMapZHuxr7TBDYA4DLxAoz25FN8ksyakdbc2V4X2Q",
        bip32Path: "Unknown",
        xfp: "77e80477",
      },
      {
        name: "Os_words_pass_A",
        xpub:
          "tpubDEzYMGvKjbsnqEsjPvnG1TAxBGvk3EUJ9tqpTjnv6XEHktLASz8omNFS9VfSgbmpQWZefiRisKKCtERgsjsK39S6ueTHRXd8w5kNw8LzBoF",
        bip32Path: "m/45'/1/0/0",
        xfp: "39b12f98",
      },
      {
        name: "Os_words_pass_B",
        xpub:
          "tpubDF4Ar5bxLQV9qbr2bZ7N7TYYWNv28kPEChWwyvrrxTMKJjqsYhce79mUkLNiKpW121TshHwjZhZbHmT66oPbwLqxJzcXLyf32ubCJyr4pRR",
        bip32Path: "m/45'/1/0/0",
        xfp: "77d36d3b",
      },
    ],
  });

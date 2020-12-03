import {COLDCARD_WALLET_CONFIG_VERSION} from './coldcard';

import {ROOT_FINGERPRINT} from "unchained-bitcoin";

export const coldcardFixtures = {
  // These use the Open Source Wallet words from the Caravan Test Suite
  validColdcardXpubJSON: {
    p2sh_deriv: "m/45'",
    p2sh: "tpubDA4nUAdTmYwqJEETnxhH5HyN817oXugoa63GmThiDVNDKGf4uaG6QAk9BUo7RdXv1LFF7yBognGFPWzdwXY4XWMHyJ5mtZaVFEU5MtMfj7H",
    p2wsh_p2sh_deriv: "m/48'/1'/0'/1'",
    p2wsh_p2sh: "Upub5THcsrK1mzKPEWiosEaR5Ra5sSLTfgfc2RBqxDWZt9jFrANXFzeKSpjxn7StBgBhBe1YPiZXurj7XrQhggqYV63ZzpWUp27gWiL2wDoVwaW",
    p2wsh_deriv: "m/48'/1'/0'/2'",
    p2wsh: "Vpub5n7tBWyvvfrs8rgaiWz4sJb6X1KrQGwj3VAD9MzDLRg419Pee4DVGzCzkdxB2U5tQor3bjDia2hU9VSamFF8714rJJb7TzyeSKtZ5PQ1MRN",
    xfp: "F57EC65D",
  },
  validColdcardXpubMainnetJSON: {
    p2sh_deriv: "m/45'",
    p2sh: "xpub69h9wvon4GzP2S3cLmiBsNdznt29YXBk2TSyQueZsacKZyzMqMR1Fj5JwSiKu8agDRiLWPfw9gSChLW2Yfgpe4tzuhLUD2vFfGsfbtTA3r7",
    p2wsh_p2sh_deriv: "m/48'/0'/0'/1'",
    p2wsh_p2sh: "Ypub6jGfy3TmqjoeWQhS5wBPw4xZeFubMPzPhZZVBn72J2G6xD6Z1GkbR3be51yknKt4ahighwfwSMAgX9QFUWTxy7pKhzTaLY37EPxBEctgBCs",
    p2wsh_deriv: "m/48'/0'/0'/2'",
    p2wsh: "Zpub746wGi8gzRM8Qjb7dLXmKrW9KDTP4FmGTMJ3DWc5PwvNcGyq3tBhnsXjcDAL5jXoRHMULRmB5CGb42Q8adsoKRbEh2qw1MT56vRxEG4QTvd",
    xfp: "F57EC65D"
  },
  validColdcardXpubNewFirmwareJSON: {
    p2sh_deriv: "m/45'",
    p2sh: "tpubDA4nUAdTmYwqJEETnxhH5HyN817oXugoa63GmThiDVNDKGf4uaG6QAk9BUo7RdXv1LFF7yBognGFPWzdwXY4XWMHyJ5mtZaVFEU5MtMfj7H",
    p2sh_p2wsh_deriv: "m/48'/1'/0'/1'",
    p2sh_p2wsh: "Upub5THcsrK1mzKPEWiosEaR5Ra5sSLTfgfc2RBqxDWZt9jFrANXFzeKSpjxn7StBgBhBe1YPiZXurj7XrQhggqYV63ZzpWUp27gWiL2wDoVwaW",
    p2wsh_deriv: "m/48'/1'/0'/2'",
    p2wsh: "Vpub5n7tBWyvvfrs8rgaiWz4sJb6X1KrQGwj3VAD9MzDLRg419Pee4DVGzCzkdxB2U5tQor3bjDia2hU9VSamFF8714rJJb7TzyeSKtZ5PQ1MRN",
    xfp: "F57EC65D",
  },
  invalidColdcardXpubJSON: {
    p2sh_deriv: "m/45'",
    p2wsh_p2sh_deriv: "m/48'/1'/0'/1'",
    p2wsh_p2sh: "Upub5T4XUooQzDXL58NCHk8ZCw9BsRSLCtnyHeZEExAq1XdnBFXiXVrHFuvvmh3TnCR7XmKHxkwqdACv68z7QKT1vwru9L1SZSsw8B2fuBvtSa6",
    p2wsh_deriv: "m/48'/1'/0'/2'",
    p2wsh: "Vpub5mtnnUUL8u4oyRf5d2NZJqDypgmpx8FontedpqxNyjXTi6fLp8fmpp2wedS6UyuNpDgLDoVH23c6rYpFSEfB9jhdbD8gek2stjxhwJeE1Eq",
    xfp: "0F056943",
  },

  testJSONOutput: {
    xpub: 'tpubD8NXmKsmWp3a3DXhbihAYbYLGaRNVdTnr6JoSxxfXYQcmwVtW2hv8QoDwng6JtEonmJoL3cNEwfd2cLXMpGezwZ2vL2dQ7259bueNKj9C8n',
    rootFingerprint: ROOT_FINGERPRINT,
  },
  testPubkeyOutput: {
    publicKey: '026942d670b9a5afc8b9b6118374aa7245a1a95b30cadb60069f5d0076aaff2bf5',
    rootFingerprint: ROOT_FINGERPRINT,
    bip32Path: "m/45'",
  },
  testP2wshP2shPubkeyOutput: {
    publicKey: '0200688aa1961c57819edc321771ef5326c32d752080479bb3e3ed0517302a1cef',
    rootFingerprint: ROOT_FINGERPRINT,
    bip32Path: "m/48'/1'/0'/1'",
  },
  testXpubOutput: {
    xpub: 'tpubD8NXmKsmWp3a3DXhbihAYbYLGaRNVdTnr6JoSxxfXYQcmwVtW2hv8QoDwng6JtEonmJoL3cNEwfd2cLXMpGezwZ2vL2dQ7259bueNKj9C8n',
    rootFingerprint: ROOT_FINGERPRINT,
    bip32Path: "m/45'",
  },
  testP2wshP2shOutput: {
    xpub: 'Upub5T4XUooQzDXL58NCHk8ZCw9BsRSLCtnyHeZEExAq1XdnBFXiXVrHFuvvmh3TnCR7XmKHxkwqdACv68z7QKT1vwru9L1SZSsw8B2fuBvtSa6',
    rootFingerprint: ROOT_FINGERPRINT,
    bip32Path: "m/48'/1'/0'/1'",
  },

  "m/45'/1/0": {
    xpub : "tpubDDnpDVdDnpEnBgGkS2kRw2Fzqy1nB3TUGsT7whsuFDcqq4Xp9gsP6byEFqk9hGERapvSe8YRag3Jq4TjsbuZkY5TKkg14tW4jKdgUvy3jFr",
    publicKey: "0349f15ab530552168983f0ba9d04f5fb5371d4713edc2efbedbffdeda1c08a861"
  },
  "m/45'/0": {
    xpub : "tpubDBDZXR47BTgMPj4gTCUkp3BZniPMdEsRdzaxDAxnuQ5bk3n6LKLtqqYhxF53SjarCLU9evocxce8JynJ1sjybEPDdWupY6c1mFBEqLJwEAU",
    publicKey: "0325b908dca32c9f789a96c836c5b9d31dd6f6abf122f430f5900209e009943f72"
  },

  jsonConfigUUID: {
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
  },

  coldcardConfigUUID : `# Coldcard Multisig setup file (exported from unchained-wallets)
# https://github.com/unchained-capital/unchained-wallets
# v${COLDCARD_WALLET_CONFIG_VERSION}
# 
Name: OWPyFOA1
Policy: 2 of 3
Format: P2SH

83471e78: tpubDF17mBZYUi35r7UEkGr7SjSisec8QL2J1zGh9WQtmnhJtHeMFy2eH2Xsnr2ynxENbqHmcEA4NnoT8T6RZxks4G5evZdWy1RbSPTm8LtNPU3\r
f57ec65d: tpubDF61GHbPYRhEEsqNTDF2jbMBkEMmoksy1h2URbhZ8p7JfR9QRgbn6vkeA7g3t4Ue6uSHhYJxD9mRVz1ZQVYyW3RAPPuwVM4UeZyZPKu89DY\r
f57ec65d: tpubDEZxsxeamoPim6T1hg2igm4vDmdQrQnHVH5gM5NjcjowtgYVv5ZhhR5sFgRVNjRFGk1HmxsFsYhu3jGaAGVCpCsL5AbAVk6xKssr6gK3tPk\r
`,

  coldcardConfigName : `# Coldcard Multisig setup file (exported from unchained-wallets)
# https://github.com/unchained-capital/unchained-wallets
# v${COLDCARD_WALLET_CONFIG_VERSION}
# 
Name: Test
Policy: 2 of 3
Format: P2SH

83471e78: tpubDF17mBZYUi35r7UEkGr7SjSisec8QL2J1zGh9WQtmnhJtHeMFy2eH2Xsnr2ynxENbqHmcEA4NnoT8T6RZxks4G5evZdWy1RbSPTm8LtNPU3\r
f57ec65d: tpubDF61GHbPYRhEEsqNTDF2jbMBkEMmoksy1h2URbhZ8p7JfR9QRgbn6vkeA7g3t4Ue6uSHhYJxD9mRVz1ZQVYyW3RAPPuwVM4UeZyZPKu89DY\r
f57ec65d: tpubDEZxsxeamoPim6T1hg2igm4vDmdQrQnHVH5gM5NjcjowtgYVv5ZhhR5sFgRVNjRFGk1HmxsFsYhu3jGaAGVCpCsL5AbAVk6xKssr6gK3tPk\r
`
}

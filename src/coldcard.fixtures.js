import {COLDCARD_WALLET_CONFIG_VERSION} from './coldcard';

import {OSW_ROOT_FINGERPRINT} from "unchained-bitcoin";

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
    rootFingerprint: OSW_ROOT_FINGERPRINT,
  },
  testPubkeyOutput: {
    publicKey: '026942d670b9a5afc8b9b6118374aa7245a1a95b30cadb60069f5d0076aaff2bf5',
    rootFingerprint: OSW_ROOT_FINGERPRINT,
    bip32Path: "m/45'",
  },
  testP2wshP2shPubkeyOutput: {
    publicKey: '0200688aa1961c57819edc321771ef5326c32d752080479bb3e3ed0517302a1cef',
    rootFingerprint: OSW_ROOT_FINGERPRINT,
    bip32Path: "m/48'/1'/0'/1'",
  },
  testXpubOutput: {
    xpub: 'tpubD8NXmKsmWp3a3DXhbihAYbYLGaRNVdTnr6JoSxxfXYQcmwVtW2hv8QoDwng6JtEonmJoL3cNEwfd2cLXMpGezwZ2vL2dQ7259bueNKj9C8n',
    rootFingerprint: OSW_ROOT_FINGERPRINT,
    bip32Path: "m/45'",
  },
  testP2wshP2shOutput: {
    xpub: 'Upub5T4XUooQzDXL58NCHk8ZCw9BsRSLCtnyHeZEExAq1XdnBFXiXVrHFuvvmh3TnCR7XmKHxkwqdACv68z7QKT1vwru9L1SZSsw8B2fuBvtSa6',
    rootFingerprint: OSW_ROOT_FINGERPRINT,
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

  // multiInputB64PSBT : 'cHNidP8BAHwBAAAAAsrTtNXPBtJ7c2SOlzLUDenpmLNoEm9xFawNN6NW6d9nAAAAAAD/////ZWCYyz7lwUvijEy4v2IlILv5cWhGAlZ3wEF/LFzsqdoAAAAAAP////8BsoPrCwAAAAAXqRQg/ZrduANKEs41O4qn9PrKUCWbGYcAAAAAAAEA9wIAAAAAAQFlYJjLPuXBS+KMTLi/YiUgu/lxaEYCVnfAQX8sXOyp2gEAAAAXFgAUf5C9qrLM8wuULZlpgQVVQqzKx9D+////AgDh9QUAAAAAF6kU90W5DzEqOCSaHgXF2zovjQrKT92HqDwzDwEAAAAXqRTpkGjVTiQmN8+mVSwCEjzIOM/4nIcCRzBEAiAQfgmKp4NprLi82Gw6GNoRAYlMH/JgvhQ9+vsz0dBClgIgY8+aL0E6UvThAcgKXsDqoa4iBQb+XudSlet/hCrhoYEBIQNKrXsvuEVDJ9NriWH3oxgW5/pwn6FSF9ATg3g306GT9mgAAAABBGlSIQIxXL5OraEGRj4Ewjj/o9vyanetUEesdpxD9GKVJSZvRSECnoZrkrAsaG+JsyDAzkwjke5TG03M/XGa78jKqC5CyCghA7qMuGJxZQkMLcqHEnR2Cx7wJ9icb1TrB25Wek9sXoUIU64iBgO6jLhicWUJDC3KhxJ0dgse8CfYnG9U6wduVnpPbF6FCByDRx54LQAAgAEAAIAAAACAAQAAAAAAAAAAAAAAIgYCnoZrkrAsaG+JsyDAzkwjke5TG03M/XGa78jKqC5CyCgc9X7GXS0AAIABAACAMgAAgAAAAAAAAAAAAAAAACIGAjFcvk6toQZGPgTCOP+j2/Jqd61QR6x2nEP0YpUlJm9FHPV+xl0tAACAAQAAgDwAAIAAAAAAAAAAAAAAAAAAAQD3AgAAAAABAbpAju2fB1jDXsqMDvjinLY+7UxNGxNJyYnOaB9POY8nAAAAABcWABSrqGe3dBacoeG/Y1wgTjpKgNfQ+f7///8CAOH1BQAAAAAXqRT3RbkPMSo4JJoeBcXbOi+NCspP3YegKikVAQAAABepFB2KkKEPT/Zms255ek0A3502vSE8hwJHMEQCIARZPr5JBXRTdyQyinOyBoY66nK2tRtnfgrub3qir+VPAiBWC9SjZl401Vnpb3f25rYZ0hSzbfBLy1j/4NdBdMvY5gEhAgh0Gg1FjnazVdHCdNeNjBZeIHvgpf9QYjwNY+t5MvovAAAAAAEEaVIhAjFcvk6toQZGPgTCOP+j2/Jqd61QR6x2nEP0YpUlJm9FIQKehmuSsCxob4mzIMDOTCOR7lMbTcz9cZrvyMqoLkLIKCEDuoy4YnFlCQwtyocSdHYLHvAn2JxvVOsHblZ6T2xehQhTriIGA7qMuGJxZQkMLcqHEnR2Cx7wJ9icb1TrB25Wek9sXoUIHINHHngtAACAAQAAgAAAAIABAAAAAAAAAAAAAAAiBgKehmuSsCxob4mzIMDOTCOR7lMbTcz9cZrvyMqoLkLIKBz1fsZdLQAAgAEAAIAyAACAAAAAAAAAAAAAAAAAIgYCMVy+Tq2hBkY+BMI4/6Pb8mp3rVBHrHacQ/RilSUmb0Uc9X7GXS0AAIABAACAPAAAgAAAAAAAAAAAAAAAAAAA',
  // multiInputB64PSBT_fullySigned : {
  //   unsigned : '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',
  //   signatureResponse: {
  //     '029e866b92b02c686f89b320c0ce4c2391ee531b4dccfd719aefc8caa82e42c828':
  //       [
  //         '3045022100bc321b8f03605800e6ccefeba62e8c95e897fdfa2611b2531528b45c5c8c3e9a02200e4497e3abbbbe7aee0dca97363801fc306f22d0aa6c7f81775a11fb1f81598201',
  //         '3045022100a41cd24ac399c24449334d0a46906626de003e2b88a9c37e46f2cb0cbfbac0f602203c7524ec1c8f12d535a2212632865da1bef43bbe81c1b20ead12b6cbf7f44f9a01',
  //       ],
  //     '02315cbe4eada106463e04c238ffa3dbf26a77ad5047ac769c43f4629525266f45':
  //       [
  //         '3045022100aaba7f8f34b6cf733a79aabb4dbe4933ae9e1b0b3b738f3604c0db0001a1130502200a20844364bbc0a15c73209063a5546d4c7b57d5eb70bc06af2c29f25bf6900201',
  //         '304502210087f1b5e9dfe975afe8b656d49074f0dc835eebd0fd528b3663439ab2704d5769022008485a274b34b57f0d1d899633b7dc069c7bab5483b22dc77bf072c3c9e7a48a01',
  //       ],
  //   }
  // },

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

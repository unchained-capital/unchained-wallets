import {CoboVaultReader, CoboVaultExportExtendedPublicKey, CoboVaultSignMultisigTransaction} from "./cobovault";
import {
    TEST_FIXTURES,
} from "unchained-bitcoin";
import {encodeUR} from "@cvbb/bc-ur";
import {ACTIVE, INFO, PENDING} from "./interaction";


describe("CoboVaultReader", () => {
    function makeInteraction() {
        return new CoboVaultReader();
    }

    describe("message", () => {
        it('should has messages about reader', () => {
            const interaction = makeInteraction();
            expect(interaction.hasMessagesFor({
                state: ACTIVE,
                level: INFO,
                code: "cobovault.scanning",
                text: "Scan Cobo Vault QR code now.",
            }))
        });
    })

    describe("parse", () => {
        it('should parse text', () => {
            const interaction = makeInteraction()
            const result = interaction.parse(["abcdefghijklmnopqrstuvwxyz"]);
            expect(result).toStrictEqual({
                success: true,
                type: "text",
                result: "abcdefghijklmnopqrstuvwxyz",
            })
        });
        it('should parse json', () => {
            const interaction = makeInteraction();
            const result = interaction.parse([
                JSON.stringify({
                    id: 1,
                    data: 'test data'
                })
            ]);
            expect(result).toStrictEqual({
                success: true,
                type: "json",
                result: {
                    id: 1,
                    data: "test data"
                }
            })
        });
        it('should parse ur', () => {
            const interaction = makeInteraction();
            const result = interaction.parse([
                'UR:BYTES/7OF7/0JSMW5RETZCECXHPGZ2E6PNZW9QY98M0FRAFZJUWN324W4YF8XDQ0H0CMW/XF0CZN37A3S00QWAF7H49T74HE9XKWR9DALFWW0HYN9HEN2WF5Q7SQ4D60W8HQCER7Y5K0HQA46JAEG56HK92XD0VZ4',
                'UR:BYTES/4OF7/0JSMW5RETZCECXHPGZ2E6PNZW9QY98M0FRAFZJUWN324W4YF8XDQ0H0CMW/A75MMQAW0FXP8XP47RLQ76XX9RSXGHY9YNPSMLP3F6P9574PXGJDNR3002W3YXP6NXDMRU59F8YE4YRJMXWQTSJWPJZGFRZ0C9R6P99T0D57NJL2S62JLN8325Q0HV35LLNWUMNDA4G4EQQKEVQHHGM0HYC77FMVA38DYTQ6A52FT5KL8V7WVMQR7KULL2ZRF0CW37C5',
                'UR:BYTES/2OF7/0JSMW5RETZCECXHPGZ2E6PNZW9QY98M0FRAFZJUWN324W4YF8XDQ0H0CMW/VM77CSD3PNN5MJLJTLQ4MQ570QCVXFTY82V9V86YRDQ2QT5R2DYNU6HUZCVJL6VAJRVV5E2NNTMHMH4VEJY58GM4VW5M4QM8T02AFKNUVRY6ZUK0D9QVHU8V3LSYZADX9XFJUDGJCHF2463UEGEYDAQ2Y8LACV7RNP7U0WYQX5FRP6EHT8LRCLW8KTF6YZ54N9HLPDAQ',
                'UR:BYTES/5OF7/0JSMW5RETZCECXHPGZ2E6PNZW9QY98M0FRAFZJUWN324W4YF8XDQ0H0CMW/NH55UPGT8KSH3HCLWMQQ5DNVK2QPL27LRG0FPNFU630VK75NPFQTZ529TAMTWFK42TE3CGFJFXFD5FTLLZ779Y3AL4WS66U8YVL6UG2LLT97EKTZFYYEUL35YL2N8K6KEKCFCAR4KN8RX98R8APE2WNNWZRXESGASHCQKUD325GTGMZTF7JFP3NQMHLD5R8TRWPXTX2L',
                'UR:BYTES/3OF7/0JSMW5RETZCECXHPGZ2E6PNZW9QY98M0FRAFZJUWN324W4YF8XDQ0H0CMW/MW5RF7TTADJVZN35YMAS2X5NDWJP26DTN8QQV6NDNSRH0FY7F8NVHTFY6U32F376ZYJRYEUJVJU6MS9GELUA68LQA60WYARLDF59XLPCNFES8GD0Y0ZNFMNRJ27P0VZV7RAUUA5FUE4KWWJYPSZ2J32QQKCVWENYVWG3X3VWKLGFQTHLQNG3ZWXW928WZ65U6LYFYEG5',
                'UR:BYTES/6OF7/0JSMW5RETZCECXHPGZ2E6PNZW9QY98M0FRAFZJUWN324W4YF8XDQ0H0CMW/WPCUZ4DDRDT5VH7UP75P5ULE7XDVFPEQ982CGNQC8RMN96QRQSM88CNVH3D4Z2T6XF8LQZ3D94PZ9WK426UN6F7GUDMW8LU0N5MMXPE5ZPCGAWEAFHT5W0F8YY33PDC68SE6TJ8C0AZGY3JQULUFWR6WM2FKGX2US753ZU4C7ZZLZAEKG8W7RN3PJWR5VG6Q2K7FW88Z',
                'UR:BYTES/1OF7/0JSMW5RETZCECXHPGZ2E6PNZW9QY98M0FRAFZJUWN324W4YF8XDQ0H0CMW/TYPJQLJ2VYU9UF2SNQD5K43N4VTCAVRH5VZST7748UG8ASGGRE70PJ3UPHQTL6JM30A4UMLUJXHAZPXR4F6KYY94M0Z3RR739JR7UPPXNQ2M565EDZSDP5AH4XMRZWP2X678P2MZD4T8PD953LUY8AXE59TRR2N8C740PTRVUL3MLUPM9JTY8CEHTER5J0ZWP7RR2V5A',
            ])
            expect(result).toStrictEqual({
                current: 7,
                total: 7,
                workloads: [],
                success: true,
                type: 'ur',
                result: "7e4a61385e2550981b4b5633ab178eb077a30505fbd53f107ec1081e7cf0ca3c0dc0bfea5b8bfb5e6ffc91afd104c3aa756210b5dbc5118fd12c87ee04269815ba6a9968a0d0d3b7a9b631382a36bc70ab626d5670b4b48ff843f4d9a15631aa67c7aaf0ac6ce7e3bff03b2c9643e3375e47493c4e0f8635329d66fdec41b10ce74dcbf25fc15d829e7830c325643a98561f441b40a02e8353493e6afc16192fe99d90d8ca65539af77ddeaccc8943a37563a9ba83675bd5d4da7c60c9a172cf6940cbf0ec8fe04175a629932e3512c5d2aaea3cca3246f40a21ffdc33c3987dc7b880351230eb3759fe3c7dc7b2d3a20a95996ff0b7a0dba834f96beb64c14e3426fb051a936ba41569ab99c0066a6d9c0777a49e49e6cbad24d722a4c7da112432679264b9adc0a8cff9dd1fe0ee9ee2747f6a68537c389a7303a1af23c534ee6392bc17b04cf0fbce7689e66b673a440c04a9454005b0c76664639113458eb7d0902eff04d11138ce2a8ee16a9cd7c8926514efa9bd83ae7a4c139835f0fe0f68c628e0645c8524c30dfc314e825a7aa13224d98e2f7a9d12183a999bb1f28549c99a9072d99c05c24e0c84848c4fc147a094ab7b69e9cbea86952fccf15500fbb234ffe6ee6e6ded515c8016cb017ba36fb931ef276cec4ed22c1aed1495d2df3b3ce66c03f5b9ffa8434bf0e8fb149de94e050b3da178df1f76c00a366cb2801fabdf1a1e90cd3cd45ecb7a930a40b151455f76b726d552f31c21324992da257ff8bde2923dfd5d0d6b87233fae215ffacbecd96249099e7e3427d533db56cdb09c7475b4ce3314e33f43953a7370866cc11d85f00b71b15510b46c4b4fa490c660ddfeda0ceb1b8265995f7071c155ad1b57465fdc0fa81a73f9f19ac4872029d5844c1838f732e803043673e26cbc5b51297a324ff00a2d2d4222bad556b93d27c8e376e3ff8f9d37b3073410708ebb3d4dd7473d27212310b71a3c33a5c8f87f44824640e7f8970f4eda9364195c87a91172b8f085f1773641dde1ce21938746234055bc971ce2325f814e3eec60f781dd4faf52afd5be4a6b38656f7e9739f724cb7ccd4e4d01e802add3dc7b83191f894b3ee0ed752ee514d5ec55"
            })
        });
    })
})

describe('CoboVaultExportExtendedPublicKey', () => {
    function makeInteraction() {
        return new CoboVaultExportExtendedPublicKey();
    }

    describe("message", () => {
        it('should has messages about export extended public key', () => {
            const interaction = makeInteraction();
            expect(interaction.hasMessagesFor({
                state: PENDING,
                level: INFO,
                code: "cobo.command",
                mode: "wallet",
                text: "①Please open Cobo Vault, go to Menu > Multisig Wallet > More > Show/Export  XPUB.",
            }))
            expect(interaction.hasMessagesFor({
                state: PENDING,
                level: INFO,
                code: "cobo.command",
                mode: "wallet",
                text: "②Click the camera icon above and scan the QR Code of XPUB displays on Cobo Vault",
            }))
        });
    })

    describe('parseResult', () => {
        it('should parse wallet', () => {
            const interaction = makeInteraction();
            const result = interaction.parseResult({
                xpub: "xpub",
                path: "path",
                xfp: "xfp"
            });
            expect(result).toStrictEqual({
                success: true,
                type: "json",
                result: {
                    xpub: "xpub",
                    bip32Path: "path",
                    rootFingerprint: "xfp",
                }
            })
        });
        it('should throw error with invalid wallet info', () => {
            const interaction = makeInteraction();
            expect(() => {
                interaction.parseResult({
                    path: "path",
                    xfp: "xfp"
                });
            }).toThrow(new Error("No Extended PublicKey."))
            expect(() => {
                interaction.parseResult({
                    xpub: "xpub",
                    xfp: "xfp"
                });
            }).toThrow(new Error("No BIP32 path."))
        });
    });

    describe("parse", () => {
        it('should parse wallet qrCode', () => {
            const interaction = makeInteraction();
            const result = interaction.parse([
                JSON.stringify({
                    xpub: "xpub",
                    path: "path",
                    xfp: "xfp"
                })
            ])
            expect(result).toStrictEqual({
                success: true,
                type: "json",
                result: {
                    xpub: "xpub",
                    bip32Path: "path",
                    rootFingerprint: "xfp",
                }
            })
        });
    })

    describe("parseFile", () => {
        it('should parse wallet file', () => {
            const interaction = makeInteraction();
            const result = interaction.parseFile(JSON.stringify({
                xpub: "xpub",
                path: "path",
                xfp: "xfp"
            }));
            expect(result).toStrictEqual({
                success: true,
                type: "json",
                result: {
                    xpub: "xpub",
                    bip32Path: "path",
                    rootFingerprint: "xfp",
                }
            })
        });
    })
});

describe("CoboVaultSignMultisigTransaction", () => {
    function makeInteraction() {
        const fixture = TEST_FIXTURES.transactions[0];
        return new CoboVaultSignMultisigTransaction(fixture);
    }

    describe("message", () => {
        it('should has messages about sign multisig transaction', () => {
            const interaction = makeInteraction();
            expect(interaction.hasMessagesFor({
                state: PENDING,
                level: INFO,
                code: "cobo.command",
                mode: "wallet",
                text: "Scan this QR code into CoboVault and sign the transaction.",
            }))
        });
    })

    describe("request", () => {
        it('should generate psbt', () => {
            const interaction = makeInteraction();
            const psbt = interaction.request();
            expect(psbt).toBe("70736274ff0100c50100000003845266686d5d2473fb09982c72da0d6d66b057c3e13a6eb4bfda304076efe7650100000000ffffffff2a023ec5a05681f4bcb56b9e45884f625a96658e1da16f802e102e31a81a9eae0100000000ffffffff44ae6108a1c6e0eee65edfc7e91b72026263769cb87714a99dd45db8fbc143f20000000000ffffffff02067304000000000017a914e3ba1151b75effbf7adc4673c83c8feec3ddc367876f1d00000000000017a914c34d63a6720866070490a8cb244c6bdc7ce2fa138700000000000100f70200000000010149c912d0e5e46f6ef933038c7fb7e1d665db9ae56b67fa57fe4c3476a95cf954000000001716001400e2f78f987a5a4493cf062994dbde49d040a922feffffff02631418000000000017a914c7ab6d103180a48181847d35732e93e0ce9ab07387a08601000000000017a9148479072d5a550ee0900b5af7e70af575527a879d870247304402202f538752e408b4817e7751ef243eee67d2242ca2061e8e6c9f22873247f10a8d02205b4622314efd733f12fc6557bc2f323ff2cbc1604ad97a351807e1be80875bc8012102e92335f6ecb1862f0eea0b99297f21bdb9beb9a1e8f41113788f5add306ca9fcee9b1800010447522102a8513d9931896d5d3afc8063148db75d8851fd1fc41b1098ba2a6a766db563d42103938dd09bf3dd29ddf41f264858accfa40b330c98e0ed27caf77734fac00139ba52ae220602a8513d9931896d5d3afc8063148db75d8851fd1fc41b1098ba2a6a766db563d418f57ec65d2d00008001000080640000800000000000000000220603938dd09bf3dd29ddf41f264858accfa40b330c98e0ed27caf77734fac00139ba18000000012d00008001000080640000800000000000000000000100f70200000000010101745e1daa28c1705dbf73edd183e5ef91ad0918d97ad3e2ec2c69b548086f4d00000000171600142b0b522ba87db1646898118860449fcb2c69dae3feffffff02329642000000000017a9140f894f7e3b70b8741f830e066b6ef508a9f7479d87a08601000000000017a9148479072d5a550ee0900b5af7e70af575527a879d870247304402202dc887e5d623bd974968285e9c8165cfa9facd943caf0f8472e7acef632fb94302205c60434061e6a4e45360d3b3c901a9c1dd148b38dd6c9623cd8fa2677587e632012102366538692ffb9622e75a05dc2004d85efa0ebc27b99961e694d88f9ede2b57cae49b1800010447522102a8513d9931896d5d3afc8063148db75d8851fd1fc41b1098ba2a6a766db563d42103938dd09bf3dd29ddf41f264858accfa40b330c98e0ed27caf77734fac00139ba52ae220602a8513d9931896d5d3afc8063148db75d8851fd1fc41b1098ba2a6a766db563d418f57ec65d2d00008001000080640000800000000000000000220603938dd09bf3dd29ddf41f264858accfa40b330c98e0ed27caf77734fac00139ba18000000012d00008001000080640000800000000000000000000100f702000000000101e5d6a0ffc5f8387a90c463bf614ae53609b72988c44afc6a577f22666bc971a7000000001716001428386489d15b1cddfd245b506b8ff2d909b18d36feffffff02a08601000000000017a9148479072d5a550ee0900b5af7e70af575527a879d8786ce18050000000017a914d2fb0a8958e55d4c6c3ff58f970fdbba3006ec078702473044022007a7186e6afb93de749b3a905d1c7437f470f97095ea410538b6ac33d15a947802205a66118c7dc2e14d7325a122eb0021f54e1dbd5dfb8fd56b253fa3782716af3d012103f5951ccccf00964d54eefa78280ae083e0f0f0cc6382fd27b3fbfdfeda8dd2c7b29b1800010447522102a8513d9931896d5d3afc8063148db75d8851fd1fc41b1098ba2a6a766db563d42103938dd09bf3dd29ddf41f264858accfa40b330c98e0ed27caf77734fac00139ba52ae220602a8513d9931896d5d3afc8063148db75d8851fd1fc41b1098ba2a6a766db563d418f57ec65d2d00008001000080640000800000000000000000220603938dd09bf3dd29ddf41f264858accfa40b330c98e0ed27caf77734fac00139ba18000000012d0000800100008064000080000000000000000000000100475221021a049747120345fa9017fb42d8ff3d4fb1d2ef4c80546872c5da513babd515852103a00095df48367ed21e5c6edd50af4352311bf060eb100425cb7af4331aa1aad052ae2202021a049747120345fa9017fb42d8ff3d4fb1d2ef4c80546872c5da513babd5158518000000012d00008001000080640000800100000000000000220203a00095df48367ed21e5c6edd50af4352311bf060eb100425cb7af4331aa1aad018f57ec65d2d0000800100008064000080010000000000000000");
        });
    })
    describe("parse", () => {
        it('should parse signature from psbt', () => {
            const interaction = makeInteraction();
            const signed = TEST_FIXTURES.multisigs[0].psbtPartiallySigned;
            const hex = Buffer.from(signed, 'base64').toString('hex');
            const urs = encodeUR(hex, 800);
            const result = interaction.parse(urs);
            expect(result).toStrictEqual({
                    current: 5,
                    success: true,
                    result:
                        {
                            '02a8513d9931896d5d3afc8063148db75d8851fd1fc41b1098ba2a6a766db563d4':
                                [
                                    '3045022100c82920c7d99e0a4055a8459c53362d15f5f8ce275322be8fd2045b43a5ae7f8d0220478b3856327a4b7809a1f858159bd437e4d93ca480e35bbe21c5cd914b6d722a01',
                                    '304402200464b13a701b9ac16eea29d1604a73d82ba5b3aed1435a8c2c3d4f940a2499ce02206be000a5cc605b284ab6c40039d56d49b7af304fea53079ec9ac838732b8765d01',
                                    '30450221008af4884f2bfbd4565e58c1e7d0f4cb36f8ebc210466d165c48311ddc40df7dc8022017196f4355f66621de0fed97002cfbd6ef7163c882a709f04e5dd0bbe960bcbd01'
                                ]
                        },
                    type: 'ur',
                    total: 5,
                    workloads: []
                }
            )
        });
    })
    describe("parse file", () => {
        it('should parse signature from psbt file', () => {
            const interaction = makeInteraction();
            const result = interaction.parseFile(TEST_FIXTURES.multisigs[0].psbtPartiallySigned);
            expect(result).toStrictEqual({
                    success: true,
                    result:
                        {
                            '02a8513d9931896d5d3afc8063148db75d8851fd1fc41b1098ba2a6a766db563d4':
                                [
                                    '3045022100c82920c7d99e0a4055a8459c53362d15f5f8ce275322be8fd2045b43a5ae7f8d0220478b3856327a4b7809a1f858159bd437e4d93ca480e35bbe21c5cd914b6d722a01',
                                    '304402200464b13a701b9ac16eea29d1604a73d82ba5b3aed1435a8c2c3d4f940a2499ce02206be000a5cc605b284ab6c40039d56d49b7af304fea53079ec9ac838732b8765d01',
                                    '30450221008af4884f2bfbd4565e58c1e7d0f4cb36f8ebc210466d165c48311ddc40df7dc8022017196f4355f66621de0fed97002cfbd6ef7163c882a709f04e5dd0bbe960bcbd01'
                                ]
                        },
                    type: 'psbt'
                }
            )
        });
    })
});

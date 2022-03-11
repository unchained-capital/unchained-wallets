import {KeystoneReader, KeystoneExportExtendedPublicKey, KeystoneSignMultisigTransaction} from "./keystone";
import {
    MAINNET, P2SH, P2WSH,
    TEST_FIXTURES,
} from "unchained-bitcoin";
import {ACTIVE, INFO, PENDING, ERROR} from "./interaction";
import {CryptoPSBT} from "@keystonehq/bc-ur-registry";

describe("KeystoneReader", () => {
    function makeInteraction() {
        return new KeystoneReader();
    }

    describe("message", () => {
        it('should has messages about reader', () => {
            const interaction = makeInteraction();
            expect(interaction.hasMessagesFor({
                state: ACTIVE,
                level: INFO,
                code: "keystone.scanning",
                text: "Scan Keystone QR code now.",
            }))
        });
    })

    describe("parse", () => {
        it('should parse ur', () => {
            const interaction = makeInteraction();
            const result = interaction.parse("UR:CRYPTO-ACCOUNT/OEADCYJYLKSWPKAOLYTAADMETAADDLOLAOWKAXHDCLAOBZPKGYIHSTRLLKCHLSRKEEBBBSRDTEUTBGLPMWWDCXNYIDSSHHFXWMLPHGRSFGDNAAHDCXVEVDBKWKSEHEDAFLTAIEHTBWHLSOHKONFDSBAHWKWDVTSSVLDLLFNSMDCYMOGTHDAHTAADEHOEADADAOAEAMTAADDYOTADLOCSDYYKAEYKAEYKAOYKAOCYJYLKSWPKAXAAAYCYTLAHGOCLSEOYAAPE")
            expect(result.result.cbor.toString("hex")).toBe("a2011a748cc6aa0281d90191d9012fa602f40358210215aa5165c7b78c1783bb34140fbad3dd128594ea209a62c45c43eb8557bf462b045820e4e70af4c15f2547d9645a135dc959a548cb05f4eae0c4e32f829c951a924d5805d90131a20101020006d90130a301881830f500f500f502f5021a748cc6aa0304081ad5055521");
        });
    })
})

describe('KeystoneExportExtendedPublicKey', () => {
    function makeInteraction() {
        const network = MAINNET;
        const bip32Path = "m/45'";
        const includeXFP = true;
        return new KeystoneExportExtendedPublicKey({
            network,
            bip32Path,
            includeXFP,
            addressType: P2SH,
        });
    }

    describe("message", () => {
        it('should has messages about export extended public key', () => {
            const interaction = makeInteraction();
            expect(interaction.hasMessagesFor({
                state: PENDING,
                level: INFO,
                code: "keystone.command",
                mode: "wallet",
                text: "①Please open Keystone, go to Menu > Multisig Wallet > More > Show/Export  XPUB.",
            }))
            expect(interaction.hasMessagesFor({
                state: PENDING,
                level: INFO,
                code: "keystone.command",
                mode: "wallet",
                text: "②Click the camera icon above and scan the QR Code of XPUB displays on Keystone",
            }))
        });

        it("should has error message if bip32Path is invalid", () => {
            const network = MAINNET;
            const bip32Path = "m/45'/1'/1'";
            const includeXFP = true;
            const interaction = new KeystoneExportExtendedPublicKey({
                network,
                bip32Path,
                includeXFP,
                addressType: P2SH,
            })
            expect(interaction.hasMessagesFor({
                state: PENDING,
                level: ERROR,
                code: "bip32_path"
            }))
        })
    })

    describe('parseResult', () => {
        it('should parse wallet', () => {
            const interaction = makeInteraction();
            const result = interaction.parseResult({
                xpub: "xpub",
                path: "m/45'",
                xfp: "xfp"
            });
            expect(result).toStrictEqual({
                success: true,
                result: {
                    xpub: "xpub",
                    bip32Path: "m/45'",
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
            expect(() => {
                interaction.parseResult({
                    xpub: "xpub",
                    xfp: "xfp",
                    path: "path"
                });
            }).toThrow(new Error("Got wrong bip32 key, expected key: m/45', received key: path, please check the exported key in you Keystone."))
        });
    });

    describe("parse", () => {
        it('should parse wallet qrCode', () => {
            const network = MAINNET;
            const bip32Path = "m/48'/0'/0'/2'";
            const includeXFP = true;
            const interaction = new KeystoneExportExtendedPublicKey({
                network,
                bip32Path,
                includeXFP,
                addressType: P2WSH,
            })
            const result = interaction.parse("UR:CRYPTO-ACCOUNT/OEADCYJYLKSWPKAOLYTAADMETAADDLOLAOWKAXHDCLAOBZPKGYIHSTRLLKCHLSRKEEBBBSRDTEUTBGLPMWWDCXNYIDSSHHFXWMLPHGRSFGDNAAHDCXVEVDBKWKSEHEDAFLTAIEHTBWHLSOHKONFDSBAHWKWDVTSSVLDLLFNSMDCYMOGTHDAHTAADEHOEADADAOAEAMTAADDYOTADLOCSDYYKAEYKAEYKAOYKAOCYJYLKSWPKAXAAAYCYTLAHGOCLSEOYAAPE");
            expect(result).toStrictEqual({
                result: {
                    xpub: "xpub6F6iZVTmc3KMgAUkV9JRNaouxYYwChRswPN1ut7nTfecn6VPRYLXFgXar1gvPUX27QH1zaVECqVEUoA2qMULZu5TjyKrjcWcLTQ6LkhrZAj",
                    bip32Path: "m/48'/0'/0'/2'",
                    rootFingerprint: "748cc6aa",
                },
                success: true
            })
        });
    })

    describe("parseFile", () => {
        it('should parse wallet file', () => {
            const interaction = makeInteraction();
            const result = interaction.parseFile(JSON.stringify({
                xpub: "xpub",
                path: "m/45'",
                xfp: "xfp"
            }));
            expect(result).toStrictEqual({
                success: true,
                result: {
                    xpub: "xpub",
                    bip32Path: "m/45'",
                    rootFingerprint: "xfp",
                }
            })
        });
    })
});

describe("KeystoneSignMultisigTransaction", () => {
    function makeInteraction() {
        const fixture = TEST_FIXTURES.transactions[0];
        return new KeystoneSignMultisigTransaction(fixture);
    }

    describe("message", () => {
        it('should has messages about sign multisig transaction', () => {
            const interaction = makeInteraction();
            expect(interaction.hasMessagesFor({
                state: PENDING,
                level: INFO,
                code: "keystone.command",
                mode: "wallet",
                text: "Scan this QR code into Keystone and sign the transaction.",
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
            const psbt = Buffer.from(signed, 'base64');
            const cryptoPSBT = new CryptoPSBT(psbt);
            const ur = cryptoPSBT.toUREncoder(100000).nextPart();
            const result = interaction.parse(ur);
            expect(result).toStrictEqual({
                    progress: 100,
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

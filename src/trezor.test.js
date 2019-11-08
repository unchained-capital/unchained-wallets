import { NETWORKS } from "unchained-bitcoin";
import { P2SH, generateMultisigFromHex } from 'unchained-bitcoin';
// import { ACTIVE } from "../unchained-wallets"

import { TrezorSignMultisigTransaction, TrezorExportPublicKey } from "./trezor";
import BigNumber from "bignumber.js";

function mockHdNodes() {
    return [
        { "path": [2147483693, 2147483649, 2147483648, 0], "serializedPath": "m/45'/1'/0'/0", "childNum": 0, "xpub": "tpubDF17mBZYUi35iCPDfFAa3jFd23L5ZF49tpS1AS1cEqNwhNaS8qVVD8ZPj67iKEarhPuMapZHuxr7TBDYA4DLxAoz25FN8ksyakdbc2V4X2Q", "chainCode": "ae5fd427f2cd537df4fe7c923b25e7c92b09106b79117611971619cb3c3dec8a", "publicKey": "02d393457d46d1381b5f22fc0383de23e485ca94073f9f8cba02e15e1077e80477", "fingerprint": 2502288493, "depth": 4 },
        { "path": [2147483693, 2147483649, 2147483648, 1], "serializedPath": "m/45'/1'/0'/1", "childNum": 1, "xpub": "tpubDF17mBZYUi35mAwDiKU1fdGhxvGFkteU3fCvbDXTaYjRh4XaRMuD4hbWgXPCUrJDLKzFLppyr3LHHQtmoQFNeVHvYwfunFH5UgBQUmDfFGC", "chainCode": "d930f21f81f476c92d194f0e2231dc7a678294a35f1702f1cb135bc640270256", "publicKey": "032c2224ecd101e556eb2cbbb5bac908560f8b1d7d00e58c736fad9b414c87f7af", "fingerprint": 2502288493, "depth": 4 },
        {error: "test bad call"}
    ]}
    jest.mock("trezor-connect", () => {
    return {
        default: {
            getPublicKey: jest.fn()
                .mockImplementation(params => {
                    switch (params.path) {
                        case "m/45'/1'/0'/0":
                            return { success: true, payload: mockHdNodes()[0] }
                        case "m/45'/1'/0'/1":
                            return { success: true, payload: mockHdNodes()[1] }
                        case "m/45'/0'/0'/0":
                                return { success: true, payload: mockHdNodes()[0] }
                        case "m/45'/0'/0'/1":
                                return { success: true, payload: mockHdNodes()[1] }
                        default:
                            return {success: false, payload: mockHdNodes()[2]}
                    }
                })
            ,
            manifest: () => { },
            signTransaction: () => {
                return { success: true, payload: { signatures: ["3045022100e6a78f457953c692d0472afe41f1b7e7bc821ebb059f30676715403f12d175b802204442aebea5a77de2a4093994759f769464d9eae3f2c5f8071d266267995b2b31"] } }
            }
        }
    }
})

const sigs = ["3045022100e6a78f457953c692d0472afe41f1b7e7bc821ebb059f30676715403f12d175b802204442aebea5a77de2a4093994759f769464d9eae3f2c5f8071d266267995b2b31"]
const redeem = "522103a90d10bf3794352bb1fa533dbd4ea75a0ffc98e0d05124938fcc3e10cdbe1a4321030d60e8d497fa8ce59a2b3203f0e597cd0182e1fe0cc3688f73497f2e99fbf64b2102b79dc8fda9d447f1928d64f95d61dc1f51a440f3c36650e5da74e5d6a98ea58653ae"

const input = {
    txid: "8d276c76b3550b145e44d35c5833bae175e0351b4a5c57dc1740387e78f57b11",
    index: 1,
    multisig: generateMultisigFromHex(NETWORKS.TESTNET, P2SH, redeem),
    amountSats: BigNumber(1234000)
}
const output = {
    amountSats: BigNumber(1299659),
    address: "2NGHod7V2TAAXC1iUdNmc6R8UUd4TVTuBmp"
}

describe("Test trezor lib", () => {
    describe("Test TrezorExportPublicKey", () => {
        it('should properly retrieve a public key on testnet', async (next) => {
            ["m/45'/1'/0'/0", "m/45'/1'/0'/1"].forEach(async (derivationPath, i) => {
                const hdnode = new TrezorExportPublicKey({ network: NETWORKS.TESTNET, bip32Path: derivationPath })
                const result = await hdnode.run()
                expect(result).toEqual(mockHdNodes()[i].publicKey)
                if(i===1) next();
            })
        });

        it('should properly retrieve a public key on mainnet', async (next) => {
            ["m/45'/0'/0'/0", "m/45'/0'/0'/1"].forEach(async (derivationPath, i) => {
                const hdnode = new TrezorExportPublicKey({ network: NETWORKS.MAINNET, bip32Path: derivationPath })
                const result = await hdnode.run()
                expect(result).toEqual(mockHdNodes()[i].publicKey)
                if(i===1) next();
            })
        });

        it('should properly report a request failure', async (next) => {
            const hdnode = new TrezorExportPublicKey({ network: NETWORKS.TESTNET, bip32Path: "m/45'/1'/0'/99" })
            try {
                await hdnode.run()
                throw("I should not get here")
            } catch (e) {
                expect(e.message).toBe(mockHdNodes()[2].error)
                next();
            }
        });

    })

    describe("Test TrezorSignMultisigTransaction", () => {
        it('should properly retrieve a signature on mainnet', async (next) => {
            const sig = new TrezorSignMultisigTransaction({ network: NETWORKS.MAINNET, inputs: [input], outputs: [output], bip32Paths: ["m/45'/0'/0'/0"] })
            const result = await sig.run()
            expect(result).toEqual(sigs)
            next();
        });

        it('should properly retrieve a signature on testnet', async (next) => {
            const sig = new TrezorSignMultisigTransaction({ network: NETWORKS.TESTNET, inputs: [input], outputs: [output], bip32Paths: ["m/45'/1'/0'/0"] })
            const result = await sig.run()
            expect(result).toEqual(sigs)
            next();
        });
    });

    describe("Test interactions.", () => {
        describe("Test public key export interactions.", () => {

            const interaction = new TrezorExportPublicKey({network: NETWORKS.TESTNET, bip32Path: "m/45'/1'/0'/1"});

            it("should properly report messages for wallet state active", () => {
                //const actives =
                interaction.messagesFor({walletState:"active", excludeCodes: ["bip32"]});
                // console.log(actives); // TODO: what to test for
            })

            it("should properly report messages for wallet state pending", () => {
                //const pendings =
                interaction.messagesFor({walletState:"pending", excludeCodes: ["bip32"]});
                // console.log(pendings); // TODO: what to test for
            })

            it("should not report error for a valid state", () => {
                const hasError = interaction.hasMessagesFor({walletState:"active", level: 'error', code: "bip32"});
                expect(hasError).toBe(false);
            })

            const badInteraction = new TrezorExportPublicKey({network: NETWORKS.TESTNET, bip32Path: "m/45'/1"});
            it("should not report error for not meeting the minimum path length for wallet state active", () => {
                const hasError = badInteraction.hasMessagesFor({walletState:"active", level: 'error', code: "trezor.bip32_path.minimum"});
                expect(hasError).toBe(false);
            })

            it("should properly report error for not meeting the minimum path length for wallet state pending", () => {
                const hasError = badInteraction.hasMessagesFor({walletState:"pending", level: 'error', code: "trezor.bip32_path.minimum"});
                expect(hasError).toBe(true);
            })

            const interactionTestPathMAINNET = new TrezorExportPublicKey({network: NETWORKS.MAINNET, bip32Path: "m/45'/1'/0'/1"});
            it("should properly report error for a testnet derivation path on mainnet for wallet state pending", () => {
                const hasError = interactionTestPathMAINNET.hasMessagesFor({walletState:"pending", level: 'error', code: "trezor.bip32_path.mismatch"});
                expect(hasError).toBe(true);
            })

            const interactionMainPathTESTNET = new TrezorExportPublicKey({network: NETWORKS.TESTNET, bip32Path: "m/45'/0'/0'/1"});
            it("should properly report error for a mainnet derivation path on testnet for wallet state pending", () => {
                const hasError = interactionMainPathTESTNET.hasMessagesFor({walletState:"pending", level: 'error', code: "trezor.bip32_path.mismatch"});
                expect(hasError).toBe(true);
            })

            const interactionTestPathTESTNET = new TrezorExportPublicKey({network: NETWORKS.TESTNET, bip32Path: "m/45'/1'/0'/1"});
            it("should not report an error for correctly matching derivation path on testnet", () => {
                const hasError = interactionTestPathTESTNET.hasMessagesFor({walletState:"pending", level: 'error', code: "trezor.bip32_path.mismatch"});
                expect(hasError).toBe(false);
            })

            const interactionMainPathMAINNET = new TrezorExportPublicKey({network: NETWORKS.MAINNET, bip32Path: "m/45'/0'/0'/1"});
            it("should not report an error for correctly matching derivation path on mainnet", () => {
                const hasError = interactionMainPathMAINNET.hasMessagesFor({walletState:"pending", level: 'error', code: "trezor.bip32_path.mismatch"});
                expect(hasError).toBe(false);
            })

        })
    })

    describe("Test signing interactions.", () => {

        const interaction = new TrezorSignMultisigTransaction({ network: NETWORKS.TESTNET, inputs: [input], outputs: [output], bip32Paths: ["m/45'/1'/0'/0"] })

        it("should not report error for wallet state active", () => {
            const hasError = interaction.hasMessagesFor({walletState:"active", level: 'error'});
            expect(hasError).toBe(false);
        })

        it("should properly report messages for wallet state active", () => {
            const messages = interaction.hasMessagesFor({walletState:"active", level: 'info'});
            expect(messages).toBe(true);
        })
    })

});
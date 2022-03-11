/**
 * This module provides classes for interacting with Keystone.
 * Including reading wallet info QR from Keystone, generating multisig QR
 * to Keystone and reading signature QR from Keystone
 *
 * @module keystone
 */

import {
    convertExtendedPublicKey,
    deriveChildExtendedPublicKey,
    getRelativeBIP32Path,
    MAINNET, P2SH, P2SH_P2WSH, P2WSH,
    parseSignaturesFromPSBT, TESTNET,
    unsignedMultisigPSBT,
    validateBIP32Path,
} from "unchained-bitcoin";
import {Bytes, CryptoAccount, CryptoPSBT} from "@keystonehq/bc-ur-registry";
import {URDecoder} from "@ngraveio/bc-ur";

export const KEYSTONE = "keystone";

const KEYSTONE_BIP32_PATHS_BASES = {
    [MAINNET]: {
        "m/45'": P2SH,
        "m/48'/0'/0'/1'": P2SH_P2WSH,
        "m/48'/0'/0'/2'": P2WSH,
    },
    [TESTNET]: {
        "m/45'": P2SH,
        "m/48'/1'/0'/1'": P2SH_P2WSH,
        "m/48'/1'/0'/2'": P2WSH
    }
}

import {
    IndirectKeystoreInteraction,
    PENDING,
    ACTIVE,
    INFO, ERROR,
} from "./interaction";

let urDecoder = null;

/**
 * @param {string} qr - UR piece
 * @returns {Object} parsed result
 * {
 *     success: boolean,
 *     result: UR | undefined,
 *     progress: number,
 * }
 */
function smartParseQR(qr) {
    if (!qr) {
        return {
            success: false,
            progress: 0,
        };
    }
    if (!qr.toUpperCase().startsWith("UR")) {
        throw new Error("Unknown QR code");
    }
    if (urDecoder === null) {
        urDecoder = new URDecoder();
    }
    urDecoder.receivePart(qr);
    if (urDecoder.isSuccess()) {
        const result = {
            success: true,
            result: urDecoder.resultUR(),
            progress: urDecoder.getProgress(),
        };
        urDecoder = new URDecoder();
        return result;
    }
    if (urDecoder.isError()) {
        urDecoder = new URDecoder();
        throw new Error("Invalid Keystone Wallet QR code, invalid checksum");
    }
    return {
        success: false,
        progress: urDecoder.getProgress(),
    };
}

function commandMessage(data) {
    return {
        ...{
            state: PENDING,
            level: INFO,
            code: "keystone.command",
            mode: "wallet",
        },
        ...{text: `${data.instructions}`},
        ...data,
    };
}

/**
 * Base class for interactions with Keystone.
 *
 * @extends {module:interaction.IndirectKeystoreInteraction}
 */
export class KeystoneInteraction extends IndirectKeystoreInteraction {
}

/**
 * Base class for interactions which read a QR code displayed by a
 * Keystone command.
 *
 * @extends {module:keystone.KeystoneInteraction}
 */

export class KeystoneReader extends KeystoneInteraction {
    constructor() {
        super();
        this.reader = true;
    }

    messages() {
        const messages = super.messages();
        messages.push({
            state: ACTIVE,
            level: INFO,
            code: "keystone.scanning",
            text: "Scan Keystone QR code now.",
        });
        return messages;
    }

    /**
     * Parse QR code in UR format
     *
     * @param {string} qr - the raw response
     * @returns {
     * {success: boolean, progress: number}|
     * {result: Object, success: boolean, progress: number}|
     * {success: boolean, progress: number}} the parsed response
     *
     */
    parse(qr) {
        return smartParseQR(qr);
    }
}

export class KeystoneWalletReader extends KeystoneReader {
    parse(qr) {
        const {
            success,
            result,
            progress,
        } = super.parse(qr);
        if (!success) {
            return {
                success: false,
                progress
            };
        }
        if (result.type === "bytes") {
            const bytes = Bytes.fromCBOR(result.cbor).getData();
            const jsonStr = bytes.toString('utf-8');
            return {
                success: true,
                result: jsonStr,
                progress
            }
        } else {
            throw new Error("Unknown QR code");
        }
    }

}

/**
 * Base class for interactions which display data as a QR code for
 * Keystone to read and then read the QR code Keystone displays in
 * response.
 *
 * @extends {module:keystone.KeystoneInteraction}
 */
export class KeystoneDisplayer extends KeystoneInteraction {
    constructor() {
        super();
        this.displayer = true;
    }
}

export class KeystonePSBTPlayer extends KeystoneDisplayer {
    encode(psbtHex) {
        return new CryptoPSBT(Buffer.from(psbtHex, 'hex')).toUREncoder(400);
    }
}

export class KeystoneWalletPlayer extends KeystoneDisplayer {
    encode(hex) {
        return new Bytes(Buffer.from(hex, 'hex')).toUREncoder(400);
    }
}

/**
 * Reads an extended public key from data in a Keystone QR code.
 *
 * @extends {module:keystone.KeystoneReader}
 * @example
 * const interaction = new KeystoneExportExtendedPublicKey();
 * const encodedString = readKeystoneQRCode(); // application dependent
 * const {xpub, bip32Path} = interaction.parse(encoodedString);
 * console.log(xpub);
 * // "xpub..."
 * console.log(bip32Path);
 * // "m/45'/0'/0'"
 */

export class KeystoneExportExtendedPublicKey extends KeystoneReader {
    constructor({
                    network,
                    bip32Path,
                    includeXFP,
                    addressType
                }) {
        super({
            network,
            bip32Path,
            includeXFP,
        });
        if ([MAINNET, TESTNET].find((net) => net === network)) {
            this.network = network;
        } else {
            throw new Error("Unknown network.");
        }
        this.bip32Path = bip32Path;
        this.includeXFP = includeXFP;
        this.addressType = addressType;
        this.bip32ValidationErrorMessage = {};
        this.bip32ValidationError = this.validateBip32Path();
    }

    isSupported() {
        return !this.bip32ValidationError.length;
    }

    validateBip32Path() {
        const bip32PathError = validateBIP32Path(this.bip32Path);
        if (bip32PathError.length) {
            this.bip32ValidationErrorMessage = {
                text: bip32PathError,
                code: "keystone.bip32_path.path_error",
            };
            return bip32PathError;
        }
        const pathBase = this.getPathBase();
        if (pathBase) {
            if (pathBase === this.bip32Path) {
                // asking for known base path, no deeper derivation
                return "";
            }
            const relativePath = getRelativeBIP32Path(pathBase, this.bip32Path);
            const relativePathError = validateBIP32Path(relativePath, {
                mode: "unhardened",
            });
            if (relativePathError) {
                this.bip32ValidationErrorMessage = {
                    text: relativePathError,
                    code: "keystone.bip32_path.no_hardened_relative_path_error",
                };
                return relativePathError;
            }

            const pathDepth = this.getPathDepth();
            if (pathDepth > 8) {
                const invalidBip32PathDepthError = `The bip32Path depth should not exceed 8, current: ${pathDepth}`;
                this.bip32ValidationErrorMessage = {
                    text: invalidBip32PathDepthError,
                    code: "keystone.bip32_path.invalid_path_depth",
                };
                return invalidBip32PathDepthError;
            }
            return "";
        }
        const unknownParentBip32PathError = `The bip32Path must begin with the expected ${this.addressType} path: ${this.getExpectedPathBase()}`;
        this.bip32ValidationErrorMessage = {
            text: unknownParentBip32PathError,
            code: "keystone.bip32_path.unknown_path_base_error",
        };
        return unknownParentBip32PathError;
    }

    getPathBase() {
        const pathBaseMap = KEYSTONE_BIP32_PATHS_BASES[this.network];
        const pathBases = Object.keys(KEYSTONE_BIP32_PATHS_BASES[this.network]);
        let result;
        pathBases.forEach(path => {
            if (this.bip32Path.startsWith(path)) {
                result = path;
            }
        })
        if (pathBaseMap[result] === this.addressType) return result;
        return null;
    }

    getExpectedPathBase() {
        const pathBaseMap = KEYSTONE_BIP32_PATHS_BASES[this.network];
        const pathBases = Object.keys(KEYSTONE_BIP32_PATHS_BASES[this.network]);
        let result;
        pathBases.forEach(path => {
            if (pathBaseMap[path] === this.addressType) {
                result = path;
            }
        })
        return result;
    }

    getPathDepth() {
        return this.bip32Path.split("/").length - 1;
    }


    messages() {
        const messages = super.messages();
        messages.push(
            commandMessage({
                instructions:
                    "①Please open Keystone, go to Menu > Multisig Wallet > More > Show/Export  XPUB.",
            })
        );
        messages.push(
            commandMessage({
                instructions:
                    "②Click the camera icon above and scan the QR Code of XPUB displays on Keystone",
            })
        );
        if (Object.entries(this.bip32ValidationErrorMessage).length) {
            messages.push({
                state: PENDING,
                level: ERROR,
                code: this.bip32ValidationErrorMessage.code,
                text: this.bip32ValidationErrorMessage.text,
            });
        }

        return messages;
    }

    deriveDeeperXpubIfNecessary(xpub) {
        const pathBase = this.getPathBase();
        let relativePath = getRelativeBIP32Path(
            pathBase,
            this.bip32Path
        );
        return relativePath.length
            ? deriveChildExtendedPublicKey(xpub, relativePath, this.network)
            : xpub;
    }


    parseResult(result) {
        const {
            xpub,
            path: bip32Path,
            xfp
        } = result;
        if (!xpub) {
            throw new Error("No Extended PublicKey.");
        }
        if (!bip32Path) {
            throw new Error("No BIP32 path.");
        }
        if (!this.bip32Path.startsWith(bip32Path)) {
            throw new Error(`Got wrong bip32 key, expected key: ${this.getExpectedPathBase()}, received key: ${bip32Path}, please check the exported key in you Keystone.`);
        }
        result.xpub = this.deriveDeeperXpubIfNecessary(xpub);
        result.bip32Path = this.bip32Path;
        result.rootFingerprint = xfp;
        Reflect.deleteProperty(result, "xfp");
        Reflect.deleteProperty(result, "path");
        return {
            success: true,
            result,
        };
    }

    parse(qr) {
        const {
            success,
            result
        } = super.parse(qr);
        if (!success) {
            return {
                success: false,
            };
        }
        if (result.type === "crypto-account") {
            const cryptoAccount = CryptoAccount.fromCBOR(result.cbor);
            const xfpBuffer = cryptoAccount.getMasterFingerprint();
            if (!xfpBuffer) {
                throw new Error(
                    "Invalid Keystone Wallet QR code, no master fingerprint found"
                );
            }
            const xfp = xfpBuffer.toString("hex");
            const cryptoOutput = cryptoAccount.getOutputDescriptors()[0];
            if (!cryptoOutput) {
                throw new Error(
                    "Invalid Keystone Wallet QR code, no expected crypto output found"
                );
            }
            const cryptoHDKey = cryptoOutput.getHDKey();
            if (!cryptoHDKey) {
                throw new Error(
                    "Invalid Keystone Wallet QR code, no expected crypto hd key found"
                );
            }
            const xpub = cryptoHDKey.getBip32Key();
            const path = `m/${cryptoHDKey.getOrigin().getPath()}`;
            const prefix = this.network === TESTNET ? "tpub" : "xpub";
            return this.parseResult({
                xfp,
                path,
                xpub: convertExtendedPublicKey(xpub, prefix),
            });
        } else {
            throw new Error("Unknown QR code");
        }
    }

    parseFile(jsonString) {
        try {
            const result = JSON.parse(jsonString);
            return this.parseResult(result);
        } catch (e) {
            throw new Error(`Unable to parse file, ${e.message}`);
        }
    }
}

/**
 * Returns signature request data to display in a QR code for Keystone
 * and reads the signature data passed back by Keystone in another QR
 * code.
 *
 * NOTE: Transactions with inputs & outputs to non-P2SH addresses are not supported by Keystone.
 *
 * @extends {module:keystone.KeystoneDisplayer}
 * @example
 * const interaction = new KeystoneSignMultisigTransaction({inputs, outputs, bip32Paths});
 * console.log(interaction.request());
 * // "IJQXGZI..."
 *
 * // Display a QR code containing the above data to Keystone running
 * // `sign-bitcoin` and it will return another QR code which needs
 * // parsed.
 * const encodedString = readKeystoneQRCode(); // application dependent
 * const signatures = interaction.parse(encoodedString);
 * console.log(signatures);
 * // ["ababa...01", ... ]
 *
 */
export class KeystoneSignMultisigTransaction extends KeystoneReader {

    /**
     *
     * @param {object} options - options argument
     * @param {array<object>} options.inputs - inputs for the transaction
     * @param {array<object>} options.outputs - outputs for the transaction
     * @param {array<string>} options.bip32Paths - BIP32 paths
     */
    constructor({
                    network,
                    inputs,
                    outputs,
                    bip32Paths,
                    psbt
                }) {
        super();
        this.network = network;
        this.inputs = inputs;
        this.outputs = outputs;
        this.bip32Paths = bip32Paths;

        if (psbt) {
            this.psbt = psbt;
        } else {
            try {
                this.psbt = unsignedMultisigPSBT(network, inputs, outputs);
            } catch (e) {
                throw new Error(
                    "Unable to build the PSBT from the provided parameters."
                );
            }
        }
    }

    isSupported() {
        return true;
    }

    messages() {
        const messages = super.messages();
        messages.push(
            commandMessage({
                instructions:
                    "Scan this QR code into Keystone and sign the transaction.",
            })
        );
        return messages;
    }

    request() {
        if (typeof this.psbt === "string") {
            if (this.psbt.startsWith("70736274")) {
                return this.psbt;
            } else {
                return Buffer.from(this.psbt, "base64").toString("hex");
            }
        }
        return this.psbt.toHex();
    }

    parse(qr) {
        const {
            success,
            result,
            progress,
        } = super.parse(qr);
        if (!success) {
            return {
                success,
                progress,
            };
        }
        if (result.type === "crypto-psbt") {
            const cryptoPSBT = CryptoPSBT.fromCBOR(result.cbor);
            const psbt = cryptoPSBT.getPSBT().toString('hex');
            return {
                success,
                progress: 100,
                result: parseSignaturesFromPSBT(psbt),
            }
        } else {
            throw new Error("Unknown QR code");
        }
    }

    parseFile(psbtB64) {
        return {
            success: true,
            result: parseSignaturesFromPSBT(psbtB64),
            type: "psbt",
        };
    }
}

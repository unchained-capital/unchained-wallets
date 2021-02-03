/**
 * This module provides classes for interacting with Cobo Vault.
 * Including reading wallet info QR from Cobo Vault, generating multisig QR
 * to Cobo Vault and reading signature QR from Cobo Vault
 *
 * @module cobovault
 */

import {parseSignaturesFromPSBT, unsignedMultisigPSBT} from "unchained-bitcoin";

export const COBOVAULT = 'cobovault';

import {
    IndirectKeystoreInteraction,
    PENDING,
    ACTIVE,
    INFO,
} from "./interaction";

import {encodeUR, decodeUR, extractSingleWorkload} from '@cvbb/bc-ur'

function onlyUniq(value, index, self) {
    return self.indexOf(value) === index;
}

/**
 * @param {array<string>} qrs - the PSBT
 * @returns {Object} parsed result
 * {
 *     success: boolean,
 *     result: string | object
 *     type: 'text' | 'ur' | 'json'
 *     current: number,
 *     total: number,
 *     workloads: array<string>
 * }
 */
function smartParseQR(qrs) {
    const enhancedQRS = qrs.filter(onlyUniq);
    const first = enhancedQRS[0];
    try {
        //JSON
        return parseJSON(first)
    }
    catch(e) {
        if (first.startsWith("UR")) {
            //UR
            return parseUR(enhancedQRS)
        }
        else {
            //raw text
            return {
                success: true,
                result: first,
                type: "text",
            }
        }
    }
}

function parseJSON(jsonString) {
    return {
        success: true,
        result: JSON.parse(jsonString),
        type: "json"
    };
}

function parseUR(enhancedQRs) {
    if (enhancedQRs.length > 0) {
        // eslint-disable-next-line no-unused-vars
        const [index, total] = extractSingleWorkload(enhancedQRs[0]);
        if (enhancedQRs.length === total) {
            return {
                success: true,
                current: enhancedQRs.length,
                total,
                workloads: [],
                result: decodeUR(enhancedQRs),
                type: "ur"
            };
        } else {
            return {
                success: false,
                current: enhancedQRs.length,
                total,
                workloads: enhancedQRs,
                result: "",
                type: "ur"
            };
        }
    } else {
        return {
            success: false,
            current: 0,
            total: 0,
            workloads: [],
            result: "",
            type: "ur"
        };
    }
}

function commandMessage(data) {
    return {
        ...{
            state: PENDING,
            level: INFO,
            code: "cobo.command",
            mode: "wallet",
        },
        ...{text: `${data.instructions}`},
        ...data,
    };
}

/**
 * Base class for interactions with CoboVault.
 *
 * @extends {module:interaction.IndirectKeystoreInteraction}
 */
export class CoboVaultInteraction extends IndirectKeystoreInteraction {
}

/**
 * Base class for interactions which read a QR code displayed by a
 * CoboVault command.
 *
 * @extends {module:cobovault.CoboVaultInteraction}
 */

export class CoboVaultReader extends CoboVaultInteraction {
    constructor() {
        super();
        this.reader = true;
    }

    messages() {
        const messages = super.messages();
        messages.push({
            state: ACTIVE,
            level: INFO,
            code: "cobovault.scanning",
            text: "Scan Cobo Vault QR code now.",
        });
        return messages;
    }

    parse(qrs) {
        return smartParseQR(qrs)
    }
}

/**
 * Base class for interactions which display data as a QR code for
 * CoboVault to read and then read the QR code CoboVault displays in
 * response.
 *
 * @extends {module:cobovault.CoboVaultInteraction}
 */
export class CoboVaultDisplayer extends CoboVaultInteraction {

    constructor() {
        super();
        this.displayer = true;
    }

    encodeUR(data) {
        // 800~900 characters will make the most smooth QR reading experience for Cobo Vault
        return encodeUR(data, 800);
    }
}


/**
 * Reads an extended public key from data in a CoboVault QR code.
 *
 * @extends {module:cobovault.CoboVaultReader}
 * @example
 * const interaction = new CoboVaultExportExtendedPublicKey();
 * const encodedString = readCoboVaultQRCode(); // application dependent
 * const {xpub, bip32Path, rootFingerprint} = interaction.parse(encodedString);
 * console.log(xpub);
 * // "xpub..."
 * console.log(bip32Path);
 * // "m/45'/0'/0'"
 */

export class CoboVaultExportExtendedPublicKey extends CoboVaultReader {
    messages() {
        const messages = super.messages();
        messages.push(commandMessage({
            instructions: "①Please open Cobo Vault, go to Menu > Multisig Wallet > More > Show/Export  XPUB.",
        }));
        messages.push(commandMessage({
            instructions: "②Click the camera icon above and scan the QR Code of XPUB displays on Cobo Vault",
        }));
        return messages;
    }

    parseResult(result) {
        const {xpub, path: bip32Path, xfp} = result;
        if (!xpub) {
            throw new Error('No Extended PublicKey.');
        }
        if (!bip32Path) {
            throw new Error("No BIP32 path.");
        }
        result.bip32Path = bip32Path;
        result.xpub = xpub;
        result.rootFingerprint = xfp;
        Reflect.deleteProperty(result, "xfp");
        return {
            success: true,
            result,
            type: "json",
        };
    }

    parse(workloads) {
        try{
            const {result} = super.parse(workloads);
            return this.parseResult(result)
        }catch (e) {
            throw new Error("Unable to parse qr code")
        }
    }

    parseFile(jsonString) {
        try{
            const result = JSON.parse(jsonString);
            return this.parseResult(result)
        }catch (e) {
            throw new Error("Unable to parse file")
        }
    }
}

/**
 * Returns signature request data to display in a QR code for CoboVault
 * and reads the signature data passed back by CoboVault in another QR
 * code or a psbt file.
 *
 * @extends {module:cobovault.CoboVaultDisplayer}
 * @example
 * const interaction = new CoboVaultSignMultisigTransaction({inputs, outputs, bip32Paths});
 * console.log(interaction.request());
 * // "IJQXGZI..."
 *
 * // Display a QR code containing the above data to CoboVault running
 * // `sign-bitcoin` and it will return another QR code which needs
 * // parsed.
 * const encodedString = readCoboVaultQRCode(); // application dependent
 * const signatures = interaction.parse(encodedString);
 * console.log(signatures);
 * // ["ababa...01", ... ]
 *
 */
export class CoboVaultSignMultisigTransaction extends CoboVaultReader {

    /**
     *
     * @param {object} options - options argument
     * @param {array<object>} options.inputs - inputs for the transaction
     * @param {array<object>} options.outputs - outputs for the transaction
     * @param {array<string>} options.bip32Paths - BIP32 paths
     */
    constructor({network, inputs, outputs, bip32Paths, psbt}) {
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
                throw new Error("Unable to build the PSBT from the provided parameters.");
            }
        }
    }

    isSupported() {
        return true
    }

    messages() {
        const messages = super.messages();
        messages.push(commandMessage({
            instructions: "Scan this QR code into CoboVault and sign the transaction.",
        }));
        return messages;
    }

    request() {
        return this.psbt.toHex();
    }

    parse(qrs) {
        const parsed = super.parse(qrs);
        if (parsed.success) {
            return {
                ...parsed,
                result: parseSignaturesFromPSBT(parsed.result)
            }
        }
        else {
            return parsed
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


/**
 * @module ledger
 */
import BigNumber from "bignumber.js";
import {
  compressPublicKey,
  scriptToHex,
  multisigRedeemScript,
  multisigWitnessScript,
  NETWORKS,
  MULTISIG_ADDRESS_TYPES,
  multisigAddressType,
} from "unchained-bitcoin";

import {
  ACTIVE,
  PENDING,
  INFO,
  WARNING,
  WalletInteraction,
} from "./interaction";

const bitcoin = require('bitcoinjs-lib');

const TransportU2F = require("@ledgerhq/hw-transport-u2f").default;
const LedgerBtc    = require("@ledgerhq/hw-app-btc").default;

/**
 * Interaction with Ledger hardware wallets
 * @extends {module:interaction.WalletInteraction}
 */
export class LedgerInteraction extends WalletInteraction {

  messages() {
    const messages = super.messages();
    messages[PENDING].push({level: INFO, text: "Make sure your Ledger hardware wallet is plugged in.", code: "ledger.device.connect"});
    messages[PENDING].push({level: INFO, text: "Make sure you have unlocked your Ledger hardware wallet.", code: "ledger.device.unlocked"});
    messages[ACTIVE].push({level: INFO, text: "Communicating with Ledger hardware wallet...", code: "ledger.active"});
    return messages;
  }

}

/**
 * Retrieve Ledger device metadata.
 * @extends {module:ledger.LedgerInteraction}
 */
export class LedgerGetMetadata extends LedgerInteraction {

  messages() {
    const messages = super.messages();
    messages[PENDING].push({level: INFO, text: "Make sure you are in the main Ledger dashboard, NOT the Bitcoin app.", code: "ledger.app.none"});
    messages[ACTIVE].push({level: INFO, text: "Make sure you are in the main Ledger dashboard, NOT the Bitcoin app.", code: "ledger.app.none"});
    return messages;
  }

  /**
   * Retrieve metadata from Ledger device
   * @override
   * @example
   * const interaction = new LedgerGetMetadata();
   * const result = await interaction.run();
   * console.log(resultKey);
   * @returns {object} object containing metadata
   */
  async run() {
    const transport = await TransportU2F.create();
    transport.setScrambleKey('B0L0S');
    const rawResult = await transport.send(0xe0, 0x01, 0x00, 0x00);
    return this.parseMetadata(rawResult);
  }

  parseMetadata(res) {
    // From
    //
    //   https://github.com/LedgerHQ/ledger-live-common/blob/master/src/hw/getVersion.js
    //   https://github.com/LedgerHQ/ledger-live-common/blob/master/src/hw/getDeviceInfo.js
    //   https://git.xmr.pm/LedgerHQ/ledger-live-common/commit/9ffc75acfc7f1e9aa9101a32b3e7481770fb3b89

    const PROVIDERS = {
      "": 1,
      das: 2,
      club: 3,
      shitcoins: 4,
      ee: 5
    };
    const ManagerAllowedFlag = 0x08;
    const PinValidatedFlag = 0x80;

    const MODEL_S = "Nano S";
    const MODEL_X = "Nano X";
    const MODEL_S_IDS = [823132164, 823132163];
    const MODEL_X_IDS = [855638020];


    const byteArray = [...res];
    const data = byteArray.slice(0, byteArray.length - 2);
    const targetIdStr = Buffer.from(data.slice(0, 4));
    const targetId = targetIdStr.readUIntBE(0, 4);
    const seVersionLength = data[4];
    let seVersion = Buffer.from(data.slice(5, 5 + seVersionLength)).toString();
    const flagsLength = data[5 + seVersionLength];
    let flags = Buffer.from(
      data.slice(5 + seVersionLength + 1, 5 + seVersionLength + 1 + flagsLength)
    );

    const mcuVersionLength = data[5 + seVersionLength + 1 + flagsLength];
    let mcuVersion = Buffer.from(
      data.slice(
        7 + seVersionLength + flagsLength,
        7 + seVersionLength + flagsLength + mcuVersionLength
      )
    );
    if (mcuVersion[mcuVersion.length - 1] === 0) {
      mcuVersion = mcuVersion.slice(0, mcuVersion.length - 1);
    }
    mcuVersion = mcuVersion.toString();

    if (!seVersionLength) {
      seVersion = "0.0.0";
      flags = Buffer.allocUnsafeSlow(0);
      mcuVersion = "";
    }

    const isOSU = seVersion.includes("-osu");
    const version = seVersion.replace("-osu", "");
    const m = seVersion.match(/([0-9]+.[0-9]+)(.[0-9]+)?(-(.*))?/);
    const [, majMin, , , providerName] = m || [];
    const providerId = PROVIDERS[providerName] || 1;
    const isBootloader = (targetId & 0xf0000000) !== 0x30000000;
    const flag = flags.length > 0 ? flags[0] : 0;
    const managerAllowed = !!(flag & ManagerAllowedFlag);
    const pin = !!(flag & PinValidatedFlag);

    const [majorVersion, minorVersion, patchVersion] = (version || '').split('.');
    const [mcuMajorVersion, mcuMinorVersion] = (mcuVersion || '').split('.');

    let model = 'Unknown';
    if (MODEL_S_IDS.includes(targetId)) {
      model = MODEL_S;
    }
    if (MODEL_X_IDS.includes(targetId)) {
      model = MODEL_X;
    }

    let spec = `${model} v.${version} (MCU v${mcuVersion})`;
    // if (pin) {
    //   spec += " w/PIN";
    // }

    return {
      spec,
      model,
      version: {
        major: majorVersion,
        minor: minorVersion,
        patch: patchVersion,
      },
      mcuVersion: {
        major: mcuMajorVersion,
        minor: mcuMinorVersion,
      },
      // pin,
    };

  }

}

/**
 * Interaction with the Ledger BTC app
 * @extends {module:ledger.LedgerInteraction}
 */
export class LedgerBitcoinInteraction extends LedgerInteraction {

  messages() {
    const messages = super.messages();
    messages[PENDING].push({level: INFO, text: "Make sure you have opened your Ledger hardware wallet to the Bitcoin app.", code: "ledger.app.bitcoin"});
    messages[ACTIVE].push({level: INFO, text: "Make sure you have opened your Ledger hardware wallet to the Bitcoin app.", code: "ledger.app.bitcoin"});
    return messages;
  }

}



/**
 * Class for wallet interaction at a given BIP32 path.
 * @extends {module:ledger.LedgerBitcoinInteraction}
 */
export class LedgerExportHDNode extends LedgerBitcoinInteraction {

  /**
   * @param {object} options
   * @param {string} bip32Path - the BIP32 path from which to retrieve public key
   * @example
   * const ledgerNode = new LedgerExportHDNode({bip32Path: "m/48'/0'/0'/2'/0"})
   */
  constructor({bip32Path}) {
    super();
    this.bip32Path = bip32Path;
  }

  messages() {
    const messages = super.messages();
    messages[ACTIVE].push({level: WARNING, text: "Your Ledger's screen  may display a 'WARNING!' message.  Click both buttons on your Ledger to proceed to confirming the BIP32 path.", code: "ledger.bip32.warning"});
    messages[ACTIVE].push({level: WARNING, text: `Your Ledger will display part of the BIP32 path ${this.bip32Path} and claim it is 'unusual'.  Click both buttons on your Ledger to proceed.  You may need to do this multiple times.`, code: "ledger.bip32.instructions"});
    return messages;
  }

  /**
   * Retrieve key from Ledger device for a given instance
   * @override
   * @example
   * const ledgerNode = new LedgerExportHDNode({bip32Path: "m/48'/0'/0'/2'/0"});
   * const result = await ledgerNode.run();
   * console.log(result.publicKey);
   * @returns {object} object containing public key and extended public key for the BIP32 path of a given instance
   */
  async run() {
    const transport = await TransportU2F.create();
    const ledgerbtc = new LedgerBtc(transport);
    const result = await ledgerbtc.getWalletPublicKey(this.bip32Path, {verify: true});
    return result;
  }
}

/**
 * Class for wallet public key interaction at a given BIP32 path.
 * @extends {module:ledger.LedgerExportHDNode}
 */
export class LedgerExportPublicKey extends LedgerExportHDNode {

  /**
   * Retrieve public key from Ledger device for a given instance
   * @example
   * const ledgerKeyExporter = new LedgerExportPublicKey({bip32Path: "m/48'/0'/0'/2'/0"});
   * const publicKey = await ledgerKeyExporter.run();
   * console.log(publicKey);
   * @returns {string} public key for the BIP32 path of a given instance
   */
  async run() {
    const result = await super.run();
    if (result.publicKey) {
      const compressedPublicKey = compressPublicKey(result.publicKey);
      return compressedPublicKey;
    } else {
      throw new {message: "Unable to export public key."};
    }
  }

}

export class LedgerExportExtendedPublicKey extends LedgerExportHDNode {

  async run() {
    /*const result = */await super.run();
    // FIXME
    return {error: "Unable to export extended public key."};
  }

}

/**
 * Class for wallet signing interaction.
 * @extends {module:ledger.LedgerBitcoinInteraction}
 */
export class LedgerSignMultisigTransaction extends LedgerBitcoinInteraction {

  /**
   * @param {object} options
   * @param {string} options.network - bitcoin network
   * @param {array<object>} options.inputs - inputs for the transaction
   * @param {array<object>} options.outputs - outputs for the transaction
   * @param {array<string>} options.bip32Paths - BIP32 paths
   */
  constructor({network, inputs, outputs, bip32Paths}) {
    super();
    this.network = network;
    this.inputs = inputs;
    this.outputs = outputs;
    this.bip32Paths = bip32Paths;
  }

  messages() {
    const messages = super.messages();
    // TODO: what is needed here?
    return messages;
  }


  /**
   * Retrieve signatures from Ledger device for a given transaction
   * @example
   * import {generateMultisigFromHex, NETWORKS, MULTISIG_ADDRESS_TYPES} from "unchained-bitcoin";
   * ...
   * const input = {
   *     txid: "8d276c76b3550b145e44d35c5833bae175e0351b4a5c57dc1740387e78f57b11",
   *     index: 1,
   *     multisig: generateMultisigFromHex(NETWORKS.TESTNET, MULTISIG_ADDRESS_TYPES.P2SH, redeemScript),
   *     amountSats: BigNumber(1234000)
   * }
   * const output = {
   *     amountSats: BigNumber(1299659),
   *     address: "2NGHod7V2TAAXC1iUdNmc6R8UUd4TVTuBmp"
   * }
   * const ledgerSigner = new LedgerSignMultisigTransaction({
   *   network: "testnet",
   *   inputs: [input],
   *   outputs: [output],
   *   bip32Paths: ["m/45'/0'/0'/0"]
   * });
   * const signatures = await ledgerSigner.run();
   * console.log(signatures);
   * @returns {string} string representation of an array of signatures
   */
   async run() {
    const transport = await TransportU2F.create();
    transport.setExchangeTimeout(20000*this.outputs.length)
    const ledgerbtc = new LedgerBtc(transport);

    return signMultisigSpendLedger(this.bip32Paths[0], this.inputs, this.outputs, isTestnet(this.network), ledgerbtc)
  }


}

function isTestnet(network) {
  return network === NETWORKS.TESTNET
}

export async function exportLedgerPubKey(path, ledgerbtc) {
    try {
        const result = await ledgerbtc.getWalletPublicKey(path, {verify: true});
        if (result.publicKey) {
          const compressedPublicKey = compressPublicKey(result.publicKey);
          return { success: true, publicKey: compressedPublicKey };
        } else { return null; }
    } catch(e) {
        return { success: false, text: e.message };
    }
}

export async function signMultisigSpendLedger(path,
                                       inputs,
                                       outputs,
                                       testnet,
                                       ledgerbtc) {

    // OUTPUTS
    let txTmp = new bitcoin.TransactionBuilder();
    txTmp.setVersion(1);
    if (testnet) {
        txTmp.network = bitcoin.networks.testnet;
    }

    for (var i = 0; i < outputs.length; i++) {
      txTmp.addOutput(outputs[i].address, new BigNumber(outputs[i].amountSats).toNumber());
    }
    for (var j = 0; j < inputs.length; j++) {
      txTmp.addInput(inputs[j].txid, inputs[j].index)
    }


    let txToSign = txTmp.buildIncomplete();

    const txHex = txToSign.toHex()

    const addressType = multisigAddressType(inputs[0].multisig); // TODO: multiple inputs?
    const segwit = addressType == MULTISIG_ADDRESS_TYPES.P2SH_P2WSH || addressType == MULTISIG_ADDRESS_TYPES.P2WSH

    let splitTx = await ledgerbtc.splitTransaction(txHex, segwit);

    let outputScriptHex = await ledgerbtc.serializeTransactionOutputs(splitTx).toString('hex');

    const ledgerIns = inputs.map(input => ledgerInput(ledgerbtc, input));

    // BIP32 PATH
    let ledger_bip32_path = path.split("/").slice(1).join("/");
    let ledgerKeySets = Array(inputs.length).fill(ledger_bip32_path); //array[bip32]

    // SIGN
    let signatures = await ledgerbtc.signP2SHTransaction(
        ledgerIns,
        ledgerKeySets,
        outputScriptHex
        ,
        0, // locktime
        1, // sighash type
        segwit,
        1 // tx version
    );

    return signatures
}

function ledgerInput(ledgerbtc, input) {
  const addressType = multisigAddressType(input.multisig);
  const tx = ledgerbtc.splitTransaction(input.transactionHex, true)
  if (addressType == MULTISIG_ADDRESS_TYPES.P2SH) {
    return [tx, input.index, scriptToHex(multisigRedeemScript(input.multisig))];
  } else {
    return [tx, input.index, scriptToHex(multisigWitnessScript(input.multisig))];
  }

}

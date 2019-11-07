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

export class LedgerInteraction extends WalletInteraction {

  installInstructions() {
    return []; // ?
  }

  messages() {
    const messages = super.messages();
    messages[PENDING].push({level: INFO, text: "Make sure your Ledger hardware wallet is plugged in.", code: "ledger.device.connect"});
    messages[PENDING].push({level: INFO, text: "Make sure you have unlocked your Ledger hardware wallet.", code: "ledger.device.unlocked"});
    messages[PENDING].push({level: INFO, text: "Make sure you have opened your Ledger hardware wallet to the Bitcoin app.", code: "ledger.app.bitcoin"});
    messages[ACTIVE].push({level: INFO, text: "Communicating with Ledger hardware wallet...", code: "ledger.active"});
    return messages;
  }

}

export class LedgerExportHDNode extends LedgerInteraction {

  constructor({network, bip32Path}) {
    super({network});
    this.bip32Path = bip32Path;
  }

  messages() {
    const messages = super.messages();
    messages[ACTIVE].push({level: WARNING, text: "Your Ledger's screen  may display a 'WARNING!' message.  Click both buttons on your Ledger to proceed to confirming the BIP32 path.", code: "ledger.bip32.warning"});
    messages[ACTIVE].push({level: WARNING, text: `Your Ledger will display part of the BIP32 path ${this.bip32Path} and claim it is 'unusual'.  Click both buttons on your Ledger to proceed.  You may need to do this multiple times.`, code: "ledger.bip32.instructions"});
    return messages;
  }

  async run() {
    const transport = await TransportU2F.create();
    const ledgerbtc = new LedgerBtc(transport);
    const result = await ledgerbtc.getWalletPublicKey(this.bip32Path, {verify: true});
    return result;
  }
}

export class LedgerExportPublicKey extends LedgerExportHDNode {

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
    const result = await super.run();
    // FIXME
    return {error: "Unable to export extended public key."}; 
  }

}

export class LedgerSignMultisigTransaction extends LedgerInteraction {
  
  constructor({network, inputs, outputs, bip32Paths}) {
    super({network});
    this.inputs = inputs;
    this.outputs = outputs;
    this.bip32Paths = bip32Paths;
  }

  messages() {
    const messages = super.messages();
    // TODO: what is needed here?
    return messages;
  }


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
};

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
        txTmp.addOutput(outputs[i].address, outputs[i].amountSats.toNumber());
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

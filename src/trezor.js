import {
  NETWORKS,
  bip32PathToSequence,
  multisigPublicKeys,
  multisigRequiredSigners,
  multisigAddressType,
  MULTISIG_ADDRESS_TYPES,
} from "unchained-bitcoin";

import {
  WalletInteraction,
  PENDING,
  ACTIVE,
  INFO,
  ERROR,
} from "./interaction";

const TrezorConnect = require("trezor-connect").default;

TrezorConnect.manifest({email: "foo@bar.com", appUrl: "https://localhost:3000"});

export class TrezorInteraction extends WalletInteraction {

  constructor({network}) {
    super({network});
    this.trezorCoin = coin(network);
  }

  // installInstructions() {
  //   return ["Make sure you have installed the Trezor bridge software.  Test your installation at https://trezor.io/start"];
  // }

  messages() {
    const messages = super.messages();
    messages[PENDING].push({level: INFO, text: "Make sure your Trezor hardware wallet is plugged in.", code: "trezor.device.connect"});
    messages[ACTIVE].push({level: INFO, text: "Your browser should open a new Trezor Connect window.  If you do not see this window, ensure you have enabled popups for this site.", code: "trezor.popup.generic"});
    return messages;
  }

}

export class TrezorExportHDNode extends TrezorInteraction {

  constructor({network, bip32Path}) {
    super({network});
    this.bip32Path = bip32Path;
  }

  messages() {
    const messages = super.messages();

    const bip32PathSegments = (this.bip32Path || '').split('/');
    if (bip32PathSegments.length < 4) { // m, 45', 0', 0', ...
      messages[PENDING].push({level: ERROR, text: "BIP32 path must be at least depth 3.", code: "trezor.bip32_path.minimum"});
    } else {
      const coinPath = bip32PathSegments[2];
      if (this.network === NETWORKS.MAINNET) {
        if (! coinPath.match(/^0'/)) {
          messages[PENDING].push({level: ERROR, text: "Mainnet BIP32 path must have a second component of 0'", code: "trezor.bip32_path.mismatch"});
        }
      }
      if (this.network === NETWORKS.TESTNET) {
        if (! coinPath.match(/^1'/)) {
          messages[PENDING].push({level: ERROR, text: "Testnet BIP32 path must have a second component of 1'", code: "trezor.bip32_path.mismatch"});
        }
      }
    }

    messages[ACTIVE].push({level: INFO, text: "Confirm in the Trezor Connect window that you want to 'Export public key'.  You may be prompted to enter your PIN.", code: "trezor.popup.export_hdnode"});

    return messages;
  }

  async run() {
    // console.log(`Exporting HD node at BIP32 path ${this.bip32Path} from Trezor device (${this.network})`);
    const result = await TrezorConnect.getPublicKey({
      path: this.bip32Path,
      coin: this.trezorCoin,
    });
    if (!result.success) {
      throw new Error(result.payload.error);
    }
    return result.payload;
  }

}

export class TrezorExportPublicKey extends TrezorExportHDNode {

  async run() {
    const payload = await super.run();
    return payload.publicKey;
  }

}

export class TrezorExportExtendedPublicKey extends TrezorExportHDNode {

  async run() {
    const payload = await super.run();
    return payload.xpub;
  }

}


export class TrezorSignMultisigTransaction extends TrezorInteraction {

  constructor({network, inputs, outputs, bip32Paths}) {
    super({network});
    this.inputs = inputs;
    this.outputs = outputs;
    this.bip32Paths = bip32Paths;
  }

  messages() {
    const messages = super.messages();
    messages[ACTIVE].push({level: INFO, text: `Confirm in the Trezor Connect window that you want to 'Sign ${this.network} transaction'.  You may be prompted to enter your PIN.`, code: "trezor.popup.sign"});
    messages[ACTIVE].push({level: INFO, text: `You Trezor device will ask you to confirm each output address above with its corresponding output amount.  Check each address and amount carefully against both the values displayed in this application and your own expectations.`, code: "trezor.signing.outputs"});
    messages[ACTIVE].push({level: INFO, text: `Finally, your Trezor device will ask you to confirm the overall transaction output amount and fee.  Check both carefully against both the values displayed in this application and your own expectations.`, code: "trezor.signing.final"});
    return messages;
  }

  async run() {
    const trezorInputs = this.inputs.map((input, inputIndex) => trezorInput(input, this.bip32Paths[inputIndex]));
    const trezorOutputs = this.outputs.map((output) => trezorOutput(output));
    const transaction = {
      inputs: trezorInputs,
      outputs: trezorOutputs,
      coin: coin(this.network),
    };
    // console.log("Signing multisig transaction with Trezor device:", transaction);
    const result = await TrezorConnect.signTransaction(transaction);
    if (!result.success) {
      throw new Error(result.payload.error);
    }
    return result.payload.signatures;
  }

}

function coin(network) {
  return (network === NETWORKS.MAINNET ? "Bitcoin" : "Testnet");
}

const addressScriptTypes = {
  [MULTISIG_ADDRESS_TYPES.P2WSH]: 'SPENDWITNESS',
  [MULTISIG_ADDRESS_TYPES.P2SH]: 'SPENDMULTISIG',
  [MULTISIG_ADDRESS_TYPES.P2SH_P2WSH]: 'SPENDP2SHWITNESS',
}
function trezorInput(input, bip32Path) {
  const requiredSigners = multisigRequiredSigners(input.multisig);
  const addressType = multisigAddressType(input.multisig)
  const spendType = addressScriptTypes[addressType]
  return {
    script_type: spendType,
    multisig: {
      m: requiredSigners,
      pubkeys: multisigPublicKeys(input.multisig).map((publicKey) => trezorPublicKey(publicKey)),
      signatures: Array(requiredSigners).fill(''),
    },
    prev_hash: input.txid,
    prev_index: input.index,
    address_n: bip32PathToSequence(bip32Path),
    amount: input.amountSats.toString()
  };
}

function trezorPublicKey(publicKey) {
  return {
    address_n: [],
    node: {
      // FIXME are all these 0's OK?
      depth: 0,
      child_num: 0,
      fingerprint: 0,
      chain_code: '0'.repeat(64),
      public_key: publicKey,
    },
  };
}

function trezorOutput(output) {
  return {
    amount: output.amountSats.toFixed(0),
    address: output.address,
    script_type: 'PAYTOADDRESS',
  };
}

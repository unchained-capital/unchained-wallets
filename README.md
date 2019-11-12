# Unchained Capital Wallet Utilities

[![Build Status](https://travis-ci.com/unchained-capital/unchained-wallets.svg?branch=master)](https://travis-ci.com/unchained-capital/unchained-wallets)

This library provides classes for integrating bitcoin wallet
functionality into JavaScript applications.

Full API documentation can be found at
[unchained-wallets](https://unchained-capital.github.io/unchained-wallets).

This library was built and is maintained by [Unchained
Capital](https://www.unchained-capital.com).

## Installation

`unchained-wallets` is distributed as an NPM package.  Add it to your
application's dependencies:

```
$ npm install --save unchained-wallets
```

## Usage

This library provides classes meant to wrap the interactions between
an application and wallets, e.g. - exporting a public key at a certain
BIP32 path from a Trezor ONE device.

The classes are designed to be stateless; all wallet interaction state
is meant to be stored by the calling application.

The classes will also provide messages back to the developer suitable
for display in user interfaces.

The examples below provide an initial idea of how to use this library,
but see the [API
documentation](https://unchained-capital.github.io/unchained-wallets)
for full details.

### Interaction classes

Interactions with wallets are mediated via objects which implement the
`WalletInteraction` API:

* Wallet interaction subclasses accept required arguments via their
  constructor.  These arguments are exposed as properties of the
  resulting object.

```javascript
import {MAINNET} from "unchained-bitcoin";
import {TrezorExportPublicKey} from "unchained-wallets";
const interaction = new TrezorExportPublicKey({network: MAINNET, bip32Path: "m/45'/0'/0'/0/0"});
console.log(interaction.network);   // "mainnet"
console.log(interaction.bip32Path); // "m/45'/0'/0'/0/0"
```

* All objects implement an `isSupported()` method which returns `true`
  or `false` based on whether the wallet supports the given
  interaction with the given arguments.

* All objects implement a `messages()` method which returns feedback
  about the interaction given the current environment, wallet state,
  &c.

* A message is an object with the following keys:

  * `code` -- a string describing the message (e.g. - `trezor.device.connect`)
  * `text` -- a string containing the message (e.g. - `Make sure your Trezor hardware wallet is plugged in.`)
  * `level` -- a string categorizing the message (e.g. - `info`)
  
* Messages may have additional keys depending on the wallet.  Several
  methods such as `messageTextFor()` are available to filter and
  extract data from messages.

* All objects implement a `async run()` method which performs the
  interaction with the wallet and returns the required data.
  
Developers who want to support new wallets or new interactions should
subclass the `WalletInteraction` class and implement a constructor,
`messages()`, and `run()`.

### Application Usage

The following minimal React example shows how an application developer
would use an interaction class to export a public key from a Trezor
hardware wallet.

```javascript
// This is a React example but a similar
// pattern would work for other frameworks.
import React from "react";
import PropTypes from 'prop-types';

// The `unchained-bitcoin` library is used by `unchained-wallets`.
import {MAINNET} from "unchained-bitcoin";

import {
  HardwareWalletExportPublicKey,// This is our interaction.
  TREZOR, LEDGER,               // These are supported wallets.
  PENDING, ACTIVE, UNSUPPORTED, // These are wallet states.
} from "unchained-wallets";


export class HardwareWalletPublicKeyImporter extends React.Component {

  // For this example, the required arguments are
  // passed into this component via `props`.
  static propTypes = {
    network: PropTypes.string.isRequired,
    bip32Path: PropTypes.string.isRequired,
	walletType: PropTypes.string.isRequired,
  };


  // The interaction is stateless so can be instantiated
  // on the fly as needed, with appropriate arguments.
  interaction() {
    const {walletType, network, bip32Path} = this.props;
    return HardwareWalletExportPublicKey({walletType, network, bip32Path});
  }


  constructor(props) {
    super(props);
    // Wallet state is kept in the React component
    // and passed to the library.
    this.state = {
      walletState: (this.interaction().isSupported() ? PENDING : UNSUPPORTED),
      publicKey: '',
      error: '',
    };
  }


  render() {
    const {walletState, publicKey, error} = this.state;
    const {bip32Path} = this.props;
    if (publicKey) {
      return (
        <div>
          <p>Public key for BIP32 path {bip32Path}:</p>
          <p><code>{publicKey}</code></p>
        </div>
      );
    } else {
      return (
        <div>
          <p>Click here to import public key for BIP32 path {bip32Path}.</p>
          <button disabled={walletState !== PENDING} onClick={this.importPublicKey}>Import Public Key</buttton>
          {this.renderMessages()}
          {error && <p>{error}</p>}
        </div>
      );
    }
  }


  renderMessages() {
    const {walletState} = this.state;
    // Here we grab just the messages relevant for the
    // current wallet state, but more complex filtering is possible...
    const messages = this.interaction().messagesFor({walletState});
    return (
      <ul>
        {messages.map(this.renderMessage)}
      </ul>
    );
  }


  renderMessage(message, i) {
    // The `message` object will always have a `text` property
    // but may have additional properties useful for display.
    return <li key={i}>{message.text}</li>;
  }


  async importPublicKey() {
    this.setState({walletState: ACTIVE});
    try {
      // This is where we actually talk to the hardware wallet.
      const publicKey = await this.interaction().run();
      // If we succeed, revert the wallet state
	  // and store the imported public key.
      this.setState({walletState: PENDING, publicKey});
    } catch(e) {
      // Something went wrong; revert the wallet
	  // state and track the error message.
      this.setState({walletState: PENDING, error: e.message});
    }
  }
}
```

This simple example illustrates several useful patterns:

* The `interaction()` method builds an entire interaction object from
  the relevant parameters, `bip32Path` and `network`.  In this
  example, these parameters are passed in via `props` but they could
  be specified by the user or a server application.  The interaction
  object has no internal state and is cheap to create so building it
  "fresh" each time it is needed is fine and actually the preferred
  approach.

* The `walletState` is stored in and controlled by the component.  In
  `importPublicKey` the component explictly handles changes to
  `walletState`.  In `renderMessages` the component queries the
  interaction with the `walletState` (via
  `this.interaction().messagesFor({walletState})`.

* The `messagesFor` and `renderMessages` methods will work regardless
  of the values of `network`, `bip32Path`, or `walletType`.  If a user
  is allowed to change these input values, appropriate warning and
  informational messages will be rendered for each wallet type given
  the arguments.  This makes handling "edge cases" between wallets
  much easier for developers.

## Developers

Developers who want to work on this library should clone the source
code and install dependencies:

```
$ git clone https://github.com/unchained-capital/unchained-wallets`
...
$ cd unchained-wallets
$ npm install
```

### Testing

Unit tests are implemented in Jest and can be run via

```
$ npm test
```

### Contributing

Unchained Capital welcomes bug reports, new features, and better documentation for this library.

If you are fixing a bug or adding a feature, please first check the [GitHub issues page](https://github.com/unchained-capital/unchained-wallets/issues) to see if there is any existing discussion about it.

To contribute, create a pull request (PR) on GitHub against the [Unchained Capital fork of unchained-wallets](https://github.com/unchained-capital/unchained-wallets).

Before you submit your PR, make sure to update and run the test suite!

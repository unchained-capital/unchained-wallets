# Unchained Capital Keystore Utilities

[![Build Status](https://travis-ci.com/unchained-capital/unchained-wallets.svg?branch=master)](https://travis-ci.com/unchained-capital/unchained-wallets)

This library provides classes for integrating functionality from the
following keystores into JavaScript applications:

* Trezor hardware wallets  (models: One, T)
* Ledger hardware wallets  (models: Nano)
* [Hermit](https://github.com/unchained-capital/hermit)

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
an application and a keystore, e.g. - exporting a public key at a
certain BIP32 path from a Trezor model T.

The classes are designed to be stateless; all keystore interaction
state (are we currrently talking to the Trezor?) is meant to be stored
by the calling application.

The classes will also provide messages back to the developer suitable
for display in user interfaces.  All errors will also be percolated up
to the developer to handle how they see fit.


### API

The following top-level functions are the entry points to this API:

* `GetMetadata({keystore})` - obtain metadata about a device
* `ExportPublicKey({keystore, network, bip32Path})` - export an HD public key
* `ExportExtendedPublicKey({keystore,  network, bip32Path})` - export an HD extended public key
* `SignMultisigTransaction({keystore, network,  inputs,  outputs, bip32Paths})` - sign a transaction with some multisig inputs
* `ConfirmMultisigAddress({keystore, network, bip32Path, multisig})` - confirm a multisig address

Not every keystore supported by this library implements each of these
interactions.

Each interaction takes different arguments. See the [API
documentation](https://unchained-capital.github.io/unchained-wallets)
for full details.

### Applications

The following minimal React example shows how an application developer
would use the `ExportPublicKey` API function of this library to export
a public key from a Trezor hardware wallet.

```javascript
// This is a React example but a similar
// pattern would work for other frameworks.
import React from "react";
import PropTypes from 'prop-types';

// The `unchained-bitcoin` library is used by `unchained-wallets`.
import {MAINNET} from "unchained-bitcoin";

import {
  // This is the interaction we are implementing.
  ExportPublicKey, 

  // These are the keystores we want to support.  They both
  // work identically as far as this minimal UI is concerned.
  // Other keystores are supported but they would require a
  // different UI.
  TREZOR, LEDGER,

  // These are  possible states our keystore could be in.
  PENDING, ACTIVE, UNSUPPORTED,
} from "unchained-wallets";

export class HardwareWalletPublicKeyImporter extends React.Component {

  // For this example, the required arguments are
  // passed into this component via `props`.
  //
  // A more realistic example would provide a UI for
  // entering this or pull it from somewhere else.
  static propTypes = {
    network: PropTypes.string.isRequired,
    bip32Path: PropTypes.string.isRequired,
    keystore: PropTypes.string.isRequired,
  };


  // The interaction is stateless so can be instantiated
  // on the fly as needed, with appropriate arguments.
  interaction() {
    const {keystore, network, bip32Path} = this.props;
    return ExportPublicKey({keystore, network, bip32Path});
  }


  constructor(props) {
    super(props);
    // Keystore state is kept in the React component
    // and passed to the library.
    this.state = {
      keystoreState: (this.interaction().isSupported() ? PENDING : UNSUPPORTED),
      publicKey: '',
      error: '',
    };
  }


  render() {
    const {keystoreState, publicKey, error} = this.state;
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
          <button disabled={keystoreState !== PENDING} onClick={this.importPublicKey}>Import Public Key</buttton>
          {this.renderMessages()}
          {error && <p>{error}</p>}
        </div>
      );
    }
  }


  renderMessages() {
    const {keystoreState} = this.state;
    // Here we grab just the messages relevant for the
    // current keystore state, but more complex filtering is possible...
    const messages = this.interaction().messagesFor({state: keystoreState});
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
    this.setState({keystoreState: ACTIVE});
    try {
      // This is where we actually talk to the hardware wallet.
      const publicKey = await this.interaction().run();
      // If we succeed, reset the keystore state
      // and store the imported public key.
      this.setState({keystoreState: PENDING, publicKey});
    } catch(e) {
      // Something went wrong; revert the keystore
      // state and track the error message.
      this.setState({keystoreState: PENDING, error: e.message});
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

* The `keystoreState` is stored in and controlled by the React
  component.  In `importPublicKey` the component explicitly handles
  changes to `keystoreState`.  In `renderMessages` the component
  queries the interaction for messages, passing in the current
  `keystoreState` as a filter.

* The `messagesFor` and `renderMessages` methods will work regardless
  of the values of `network`, `bip32Path`, or `keystore`.  If a user
  is allowed to change these input values, appropriate warning and
  informational messages will be rendered for each keeystore given the
  arguments.  This makes handling "edge cases" between keystores much
  easier for developers.

### More on Messages

Interactions with keystores are mediated via objects which implement
the `Interaction` API.  This API surfaces rich data to the user via
the `messages()` and related methods.

The `messages()` method returns an array of messages (see below) about
the interaction.  The application calling `messages()` is expected to
pass in the keystore `state`, and other filtering properties.

A message in the `messages()` array is an object with the following
keys:

* `code` -- a dot-separrated string describing the message (e.g. - `device.connect`)
* `state` -- the keystore state the message is for (e.g. - `pending`, `active`, or `unsupported`)
* `level` -- the level of the message (e.g. - `info`, `warning`, or `error`)
* `text` -- the message text (e.g. - `Make sure your Trezor hardware wallet is plugged in.`)
* `version` -- (optional) a version string or range/spec describing which versions of the keystore this message applies to
* `image` -- (optional) an object with `label`, `mimeType`, and base64-encoded `data` for an image
* `steps` -- (optional) an array of sub-messages for this message.  `code`, `state`, and `level` are optional for submessages.
  
Messages are hierachical and well-structured, allowing applications to
display them appropriately.

Several methods such as `hasMessage`, `messageTextFor()`, &c. are
available to filter and extract data from messages.

See the [API
documentation](https://unchained-capital.github.io/unchained-wallets)
for more details on messages..

## Developers

Developers who want to work on this library should clone the source
code and install dependencies:

```
$ git clone https://github.com/unchained-capital/unchained-wallets`
...
$ cd unchained-wallets
$ npm install
```

Development proceeds in one of three ways:

1) Working on the `unchained-wallets` library itself.

2) Implementing interactions to support a new keystore.

3) Adding or modifying existing interactions for a supported
keystores.

Work on (1) should hopefully slow over time as this library reaches a
mature state of flexibility.

Work on (2) should be considered carefully.  If a new keystore doesn't
support most of the existing API of this library, then integration may
be a poorer return than expected.

Work on (3) should proceed in an even-handed way.  Most of all we want
inter-compatibility between keystores.  Implementing features which
increase complexity and reduce inter-compatibility should be
discouraged.

### DirectInteraction classes

Some devices (such as a Trezor) support "direct" interactions --
JavaScript code directly obtain a response from the device.

Developers implementing these kinds of interactions should subclass
`DirectInteraction` and provide an `async run()` method which performs
the interaction with the keystore and returns the required data.

### IndirectInteraction classes

Some devices (such as a QR-code based air-gapped laptop) support
"indirect" interactions -- JavaScript code cannot directly obtain a
response from the device.  A user must manually relay a request and
then separately input a response.

Developers implementing these kinds of interactions should subclass
`IndirectInteraction` and provide two methods:

* `request()` which returns appropriate data for a request
* `parse(response)` which parses a response
  
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

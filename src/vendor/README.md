## BC-UR

There is no JavaScript library on NPM that suitably encodes/decodes
BC-UR data. JavaScript code to do the same does exist, but embedded
with projects such as Specter Desktop or Cobo Vault.

This code is copied from Cobo Vault's implementation: https://github.com/CoboVault/cobo-vault-blockchain-base/tree/master/packages

## ledger-bitcoin

Similarly, the ledger-bitcoin js client for v2 of the bitcoin app is not published anywhere
as a package that could be installed.

The code is copied from the develop branch of https://github.com/LedgerHQ/app-bitcoin-new as of 2022-02-10,
commit [871ad247a44a473d85c0696725552cc4f886d484](https://github.com/LedgerHQ/app-bitcoin-new/commit/871ad247a44a473d85c0696725552cc4f886d484).
It isn't clear how much longer the main reference project will
be maintained as the long term plan is to primarily work in rust and maintain
bindings for various languages. Hopefully there isn't a need to
too actively maintain this vendor code and keep it up to date with the reference.

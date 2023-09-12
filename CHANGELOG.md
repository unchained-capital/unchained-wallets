# Changelog

## [0.5.3](https://github.com/unchained-capital/unchained-wallets/compare/unchained-wallets-v0.5.2...unchained-wallets-v0.5.3) (2023-09-08)


### Bug Fixes

* update packages audit and uc-bitcoin ([3ba84c8](https://github.com/unchained-capital/unchained-wallets/commit/3ba84c87366921ec769fff7a3daee03208eeefbb))

## [0.5.2](https://github.com/unchained-capital/unchained-wallets/compare/unchained-wallets-v0.5.1...unchained-wallets-v0.5.2) (2023-04-11)


### Bug Fixes

* change old cjs require to esm imports ([4361e47](https://github.com/unchained-capital/unchained-wallets/commit/4361e47887e5dc807a8e881fcb9b7d437ea4fe5b))

## [0.5.1](https://github.com/unchained-capital/unchained-wallets/compare/unchained-wallets-v0.5.0...unchained-wallets-v0.5.1) (2023-03-31)


### Bug Fixes

* **dependencies:** bump uc-bitocin dependency ([cfa65ba](https://github.com/unchained-capital/unchained-wallets/commit/cfa65ba5443f711eb925bdf2779a78235b5e84e5))

## [0.5.0](https://github.com/unchained-capital/unchained-wallets/compare/unchained-wallets-v0.4.1...unchained-wallets-v0.5.0) (2023-03-31)


### Features

* **policy:** order key origins when instantiating wallet policy ([80afda2](https://github.com/unchained-capital/unchained-wallets/commit/80afda2e8f9f89994e399386f5c89cb5aaab3727))
* **policy:** prefer uuid over name from wallet config ([95a9fd5](https://github.com/unchained-capital/unchained-wallets/commit/95a9fd55633cd7bac49c498c999bbb12ebda005f))


### Bug Fixes

* update readme with instructions on how to develop and use locally ([9098e67](https://github.com/unchained-capital/unchained-wallets/commit/9098e671d4d62a63e8bb16680792fda4df93b1dc))

## Changelog
## Version 0.1.0
## Changed
* Using webusb for ledger interactions rather than u2f
* not requiring verification for public key export
* updating ledger dependencies

## Version 0.0.11

### Changed
* (Minor) bumped dependency versions

## Version 0.0.10

### Added

* `ExportExtendedPublicKey` API works for Ledger devices now.

## Version 0.0.9

### Changed

* Major refactoring of API, interaction class hierarchy, and documentation.

## Version 0.0.8

### Added

* `CHANGELOG.md` file
* Implemented `GetMetadata` for Trezor & Ledger devices

### Changed

* API is unified, instead of calling `HardwareWalletExportPublicKey`
  and `HermitExportPubliicKey` you can now call `ExportPublicKey` and
  you will get back an instance of the correct class.  This is a
  breaking change, as `HardwareWalletExportPublicKey` is no longer
  defined.
* Refactored Ledger API classes to no longer pass around an unneeded
  `network` parameter.
* Refactored Hermit API classes with properties & methods to make it
  easier to understand whether they read vs. display AND read QR codes
  as well as to more easily extract their encoded data.  This is a
  breaking change, as encoded data was previously returned in the
  `messages` object; it is now available directly on the interaction
  via the `request()` method.
* Input & output amounts are forced to BigNumber.
* Updated dependency on `unchained-bitcoin` to `^0.0.6`

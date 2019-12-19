# Changelog

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

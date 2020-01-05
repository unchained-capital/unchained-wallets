// Compiles images in this directory into base64 encoded data in a .js
// file, suitable for import in a browser context.
//
// FIXME there is probably a smart babel-based way to do this.


const fs = require('fs');
const path = require('path');
const imagesDir = path.dirname(__filename);

function base64Data(imagePath) {
  const bytes = fs.readFileSync(path.join(imagesDir, imagePath));
  return Buffer.from(bytes).toString('base64');
}

const IMAGES = {
  ledger: {
    bip32PathWarningV1: [
      {
        label: "Ledger screen displaying a `WARNING!` message.",
        mimeType: "image/png",
        data: base64Data("ledger/bip32PathWarningV1/1-Warning.png"),
      },
      {
        label: "Ledger screen displaying a message about an 'unusual path'.",
        mimeType: "image/png",
        data: base64Data("ledger/bip32PathWarningV1/2-PathUnusual.png"),
      },
      {
        label: "Ledger screen displaying a derivation path.",
        mimeType: "image/png",
        data: base64Data("ledger/bip32PathWarningV1/3-Path.png"),
      },
      {
        label: "Ledger screen displaying a prompt about being sure.",
        mimeType: "image/png",
        data: base64Data("ledger/bip32PathWarningV1/4-NotSure.png"),
      },
      {
        label: "Ledger screen displaying a bitcoin address.",
        mimeType: "image/png",
        data: base64Data("ledger/bip32PathWarningV1/5-Address.png"),
      },
    ],
  }
};

fs.writeFileSync(path.join(imagesDir, '../src/images.js'), "export default " + JSON.stringify(IMAGES) + ";");

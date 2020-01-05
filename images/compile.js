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
    warning: {
      label: "Ledger screen displaying a `WARNING!` message.",
      mimeType: "image/png",
      data: base64Data("ledger/warning.png"),
    },
    derivationPathIsUnusualV1: {
      label: "Ledger screen displaying a message about an 'unusual path'.",
      mimeType: "image/png",
      data: base64Data("ledger/derivationPathIsUnusualV1.png"),
    },
    derivationPathV1: {
      label: "Ledger screen displaying a derivation path.",
      mimeType: "image/png",
      data: base64Data("ledger/derivationPathV1.png"),
    },
    rejectIfNotSureV1: {
      label: "Ledger screen displaying a prompt about being sure.",
      mimeType: "image/png",
      data: base64Data("ledger/rejectIfNotSureV1.png"),
    },
    addressScrollV1: {
      label: "Ledger screen displaying a bitcoin address.",
      mimeType: "image/png",
      data: base64Data("ledger/addressScrollV1.png"),
    },
  }
};

fs.writeFileSync(path.join(imagesDir, '../lib/images.js'), "export default " + JSON.stringify(IMAGES) + ";");

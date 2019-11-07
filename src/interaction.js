import Bowser from "bowser";

export const UNSUPPORTED = "unsupported";
export const PENDING = "pending";
export const ACTIVE = "active";

export const INFO    = "info";
export const WARNING = "warning";
export const ERROR   = "error";

export class WalletInteraction {

  constructor({network}) {
    this.network = network;
    this.environment = Bowser.getParser(window.navigator.userAgent);
    this.failureText = '';
    this.failureCode = '';
  }

  //
  // Uses Bowser syntax in a subclass to make assertions about which
  // environments are supported.
  //
  //   isSupported() {
  //     return this.environment.satisfies({
  //       // declare browsers per OS
  //       windows: {
  //         "internet explorer": ">10",
  //       },
  //       macos: {
  //         safari: ">10.1"
  //       },
  //
  //       // per platform (mobile, desktop or tablet)
  //       mobile: {
  //         safari: '>=9',
  //         'android browser': '>3.10'
  //       },
  //
  //       // or in general
  //       chrome: "~20.1.1432",
  //       firefox: ">31",
  //       opera: ">=22",
  //
  //       // also supports equality operator
  //       chrome: "=20.1.1432", // will match particular build only
  //
  //       // and loose-equality operator
  //       chrome: "~20",        // will match any 20.* sub-version
  //       chrome: "~20.1"       // will match any 20.1.* sub-version (20.1.19 as well as 20.1.12.42-alpha.1)
  //     });
  //   }
  //
  // See https://github.com/lancedikson/bowser for more details.
  // 
  isSupported() {
    return true;
  }

  messages() {
    const messages = {};
    messages[PENDING] = [];
    messages[ACTIVE] = [];
    messages[UNSUPPORTED] = [];
    return messages;
  }

  hasMessages() {
    return this.messages().length > 0;
  }

  messagesFor({walletState, level, code, text}) {
    const allMessages = this.messages();
    let messages;
    if (walletState) {
      messages = allMessages[walletState];
    } else {
      messages = allMessages[UNSUPPORTED].concat(allMessages[PENDING]).concat(allMessages[ACTIVE]);
    }
    const matchingMessages = [];
    for (var i=0; i < messages.length; i++) {
      const message = messages[i];
      if (level && message.level !== level) {
        continue;
      }
      if (code && !(message.code || '').includes(code)) {
        continue;
      }
      if (text && !(message.text || '').includes(text)) {
        continue;
      }
      matchingMessages.push(message);
    }
    return matchingMessages;
  }

  hasMessagesFor({walletState, level, code, text}) {
    return this.messagesFor({walletState, level, code, text}).length > 0;
  }

  messageFor({walletState, level, code, text}) {
    const messages = this.messagesFor({walletState, level, code, text});
    if (messages.length > 0) { return messages[0]; }
    return null;
  }

  messageTextFor({walletState, level, code, text}) {
    const message = this.messageFor({walletState, level, code, text});
    return (message ? message.text : null);
  }

  // Should return a promise
  async run() {
  }
  
};

export class UnsupportedInteraction extends WalletInteraction {

  constructor({network, failureText, failureCode}) {
    super({network});
    this.failureText = failureText;
    this.failureCode = failureCode;
  }

  messages() {
    const messages = super.messages();
    messages[PENDING].push({level: ERROR, code: this.failureCode, text: this.failureText});
  }

  isSupported() {
    return false;
  }

}

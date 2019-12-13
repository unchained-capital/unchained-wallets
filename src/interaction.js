/**
 * This module provides a base class for interactive messages for wallet interactions.
 * Constants are provided for easier interaction with the messages based on state and level
 * of the wallet
 * @module interaction
 */

import Bowser from "bowser";

/**
 * Unsupported wallet state constant
 * @type {string}
 */
export const UNSUPPORTED = "unsupported";

/**
 * Pending wallet state constant
 * @type {string}
 */
export const PENDING = "pending";

/**
 * Active wallet state constant
 * @type {string}
 */
export const ACTIVE = "active";

/**
 * Info message level constant
 * @type {string}
 */
export const INFO    = "info";

/**
 * Warning message level constant
 * @type {string}
 */
export const WARNING = "warning";

/**
 * Error message level constant
 * @type {string}
 */
export const ERROR   = "error";

/**
 * Base class for wallet interaction.  Derived classes will inherit these methods for
 * messaging and will be extended with additional functionality for key exports and signing.
 * @example
 * class MyWalletInteraction extends WalletInteraction {   *
 *   constructor({network}) {
 *     super();
 *     this.network = network;
 *   }
 *   // additional class member definitions
 * }
 *
 * const myInteraction = new MyWalletInteraction({network: "mainnet"})
 */
export class WalletInteraction {

  /**
   * Base class constructor.  Child classes can pass in necessary options.
   * @constructor
   * @param {object} options
   */
  constructor() {
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

  /**
   * Override this method for derived classes
   * @returns {boolean}
   */
  isSupported() {
    return true;
  }

  /**
   * Retrieves default empty messages object for supported states
   * @returns {object} {pending:[], active:[], unsupported:[]}
   */
  messages() {
    const messages = {};
    messages[PENDING] = [];
    messages[ACTIVE] = [];
    messages[UNSUPPORTED] = [];
    return messages;
  }

  /**
   * Determine whether or not any messages are currently available
   * @example
   * if (interaction.hasMessages()) {
   *  // Code to report messages here
   * }
   * @returns {boolean}
   */
  hasMessages() {
    return this.messages().length > 0;
  }

  /**
   * Retrieve filtered messages about the wallet
   * @param {object} options
   * @param {string} options.walletState - filter by the provided wallet state
   * @param {string} options.level - filter by the provided message level
   * @param {string} options.code - filter messages containing this string in the 'code' field
   * @param {string} options.text - filter messages containing this string in the 'text' field
   * @example
   * const messages = interaction.messagesFor({walletState: ACTIVE, level: INFO});
   * messages.foreEach(msg => console.log(msg.text));
   * @returns {Array<object>} the filtered list of message objects
   * @public
   */
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

  /**
   * Determines if filtered messages are available
   * @param {object} options
   * @param {string} options.walletState - filter by the provided wallet state
   * @param {string} options.level - filter by the provided message level
   * @param {string} options.code - filter messages containing this string in the 'code' field
   * @param {string} options.text - filter messages containing this string in the 'text' field
   * @example
   * const hasActiveInfo = interaction.hasMessagesFor({walletState: ACTIVE, level: INFO})) {
   * if (hasActiveInfo) {
   *  // do something
   * }
   * @returns {boolean}
   */
  hasMessagesFor({walletState, level, code, text}) {
    return this.messagesFor({walletState, level, code, text}).length > 0;
  }

  /**
   * Retrieve the first filtered messages about the wallet
   * @param {object} options
   * @param {string} options.walletState - filter by the provided wallet state
   * @param {string} options.level - filter by the provided message level
   * @param {string} options.code - filter messages containing this string in the 'code' field
   * @param {string} options.text - filter messages containing this string in the 'text' field
   * @example
   * const message = interaction.messageFor({walletState: ACTIVE, level: INFO});
   * console.log(message.text);
   * @returns {object} the first filtered message object
   */
  messageFor({walletState, level, code, text}) {
    const messages = this.messagesFor({walletState, level, code, text});
    if (messages.length > 0) { return messages[0]; }
    return null;
  }

  /**
   * Retrieve the first filtered messages about the wallet
   * @param {object} options
   * @param {string} options.walletState - filter by the provided wallet state
   * @param {string} options.level - filter by the provided message level
   * @param {string} options.code - filter messages containing this string in the 'code' field
   * @param {string} options.text - filter messages containing this string in the 'text' field
   * @example
   * const message = interaction.messageFor({walletState: ACTIVE, level: INFO});
   * console.log(message);
   * @returns {string} the text for the first filtered message
   */
  messageTextFor({walletState, level, code, text}) {
    const message = this.messageFor({walletState, level, code, text});
    return (message ? message.text : null);
  }

  // Should return a promise
  /**
   * implement this in derived class to interact with your device
   */
  async run() {
  }

}

/**
 * Simple interaction messages for unsupported devices
 * @extends {module:interaction.WalletInteraction}
 */
export class UnsupportedInteraction extends WalletInteraction {

  /**
   * @param {object} options
   * @param {string} options.failureText - text to describe the nature of the failure
   * @param {string} options.failureCode - failure code
   */
  constructor({failureText, failureCode}) {
    super();
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

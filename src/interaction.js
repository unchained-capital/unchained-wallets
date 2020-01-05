/**
 * This module provides base classes for modeling interactions with
 * keystores.
 *
 * It also defines several constants used throughout the API for
 * categorizing messages.
 *
 * Integrations with new wallets should begin by creating a base class
 * for that wallet by subclassing either `DirectKeystoreInteraction`
 * or `IndirectKeystoreInteraction`.
 * 
 * @module interaction
 */

import Bowser from "bowser";

/**
 * Constant representing a keystore which is unsupported due to the
 * kind of interaction or combination of paramters provided.
 * 
 * @type {string}
 */
export const UNSUPPORTED = "unsupported";

/**
 * Constant representing a keystore pending activation by the user.
 * 
 * @type {string}
 */
export const PENDING = "pending";

/**
 * Constant representing a keystore in active use.
 * 
 * @type {string}
 */
export const ACTIVE = "active";

/**
 * Constant for messages at the "info" level.
 * 
 * @type {string}
 */
export const INFO    = "info";

/**
 * Constant for messages at the "warning" level.
 * 
 * @type {string}
 */
export const WARNING = "warning";

/**
 * Constant for messages at the "error" level.
 * 
 * @type {string}
 */
export const ERROR   = "error";

/**
 * Enumeration of possible keystore states ([PENDING]{@link module:interaction.PENDING}|[ACTIVE]{@link module:interaction.ACTIVE}|[UNSUPPORTED]{@link module:interaction.UNSUPPORTED}).
 * 
 * @constant
 * @enum {string}
 * @default
 * 
 */
export const STATES = [PENDING, ACTIVE, UNSUPPORTED];

/**
 * Enumeration of possible message levels ([INFO]{@link module:interaction.INFO}|[WARNING]{@link module:interaction.WARNING}|[ERROR]{@link module:interaction.ERROR}).
 * 
 * @constant
 * @enum {string}
 * @default
 * 
 */
export const LEVELS = [INFO, WARNING, ERROR];


/**
 * Represents an image in a message returned by an interaction.
 *
 * @typedef module:interaction.MessageImage
 * @type {Object}
 * @property {string} label - a human-readable label for the image
 * @property {string} mimeType - the MIME type of the image
 * @property {string} data - base64-encoded image data
 */

/**
 * Represents a message returned by an interaction.
 *
 * Message objects may have additional properties.
 *
 * @typedef module:interaction.Message
 * @type {Object}
 * @property {string} text - message text
 * @property {string} code - a dot-separated message code, e.g. `device.connect` (*Optional for submessages*)
 * @property {module:interaction.STATES} state - keystore state (*Optional for submessages*)
 * @property {module:interaction.LEVELS} level - message level (*Optional for submessages*)
 * @property {string} version - keystore version (can be a single version string or a range/spec) (*Optional*)
 * @property {module:interaction.MessageImage} image - image for this message (*Optional*)
 * @property {Message[]} steps - submessages (*Optional*)
 */

/**
 * Abstract base class for all keystore interactions.
 *
 * Concrete subclasses will want to subclass either
 * `DirectKeystoreInteraction` or `IndirectKeystoreInteraction`.
 *
 * Defines an API for subclasses to leverage and extend.
 *
 * - Subclasses should not have any internal state.  External tools
 *   (UI frameworks such as React) will maintain state and pass it
 *   into the interaction in order to display properly.
 *
 * - Subclasses may override the default constructor in order to allow
 *   users to pass in parameters.
 * 
 * - Subclasses should override the `messages` method to customize
 *   what messages are surfaced in applications at what state of the
 *   user interface.
 *
 * - Subclasses should not try to catch all errors, instead letting
 *   them bubble up the stack.  This allows UI developers to deal with
 *   them as appropriate.
 *
 * @example
 * import {KeystoreInteraction, PENDING, ACTIVE, INFO} from "unchained-wallets";
 * class DoNothingInteraction extends KeystoreInteraction {
 *
 *   constructor({param}) {
 *     super();
 *     this.param = param;
 *   }
 *
 *   messages() {
 *     const messages = super.messages()
 *     messages.push({state: PENDING, level: INFO, text: `Interaction pending: ${this.param}` code: "pending"});
 *     messages.push({state: ACTIVE, level: INFO, text: `Interaction active: ${this.param}` code: "active"});
 *     return messages;
 *   }
 * 
 * }
 *
 * // usage
 * const interaction = new DoNothingInteraction({param: "foo"});
 * console.log(interaction.messageTextFor({state: ACTIVE})); // "Interaction active: foo"
 * console.log(interaction.messageTextFor({state: PENDING})); // "Interaction pending: foo"
 * 
 */
export class KeystoreInteraction {

  /**
   * Base constructor.
   *
   * Subclasses will often override this constructor to accept options.
   *
   * Just make sure to call `super()` if you do that!
   * 
   * @constructor
   */
  constructor() {
    this.environment = Bowser.getParser(window.navigator.userAgent);
  }

  /**
   * Subclasses can override this method to indicate they are not
   * supported.
   *
   * This method has access to whatever options may have been passed
   * in by the constructor as well as the ability to interact with
   * `this.environment` to determine whether the functionality is
   * supported.  See the Bowser documentation for more details:
   * https://github.com/lancedikson/bowser
   * 
   * @returns {boolean}
   * @example
   * isSupported() {
   *   return this.environment.satisfies({
   *     * declare browsers per OS
   *     windows: {
   *       "internet explorer": ">10",
   *     },
   *     macos: {
   *       safari: ">10.1"
   *     },
   *
   *     * per platform (mobile, desktop or tablet)
   *     mobile: {
   *       safari: '>=9',
   *       'android browser': '>3.10'
   *     },
   *
   *     * or in general
   *     chrome: "~20.1.1432",
   *     firefox: ">31",
   *     opera: ">=22",
   *
   *     * also supports equality operator
   *     chrome: "=20.1.1432", * will match particular build only
   *
   *     * and loose-equality operator
   *     chrome: "~20",        * will match any 20.* sub-version
   *     chrome: "~20.1"       * will match any 20.1.* sub-version (20.1.19 as well as 20.1.12.42-alpha.1)
   *   });
   * }
   */
  isSupported() {
    return true;
  }

  /**
   * Return messages array for this interaction.
   *
   * The messages array is a (possibly empty) array of [`Message`]{@link module:interaction.Message} objects.
   *
   * Subclasses should override this method and add messages as
   * needed.  Make sure to call `super.messages()` to return an empty
   * messages array for you to begin populating.
   * 
   * @returns {module:interaction.Message[]} []
   */
  messages() {
    const messages = [];
    return messages;
  }

  /**
   * Return messages filtered by the given options.
   *
   * Multiple options can be given at once to filter along multiple
   * dimensions.
   * 
   * @param {object} options
   * @param {string} options.state - must equal this keystore state
   * @param {string} options.level - must equal this message level
   * @param {string|regexp} options.code - code must match this regular expression
   * @param {string|regexp} options.text - text must match this regular expression
   * @param {string|regexp} options.version - version must match this regular expression
   * @returns {module:interaction.Message[]} matching `Message` objects
   * @example
   * import {PENDING, ACTIVE} from "unchained-bitcoin";
   * // Create any interaction instance
   * interaction.messages().forEach(msg => console.log(msg));
   *   { code: "device.connect", state: "pending", level: "info", text: "Please plug in your device."}
   *   { code: "device.active", state: "active", level: "info", text: "Communicating with your device..."}
   *   { code: "device.active.warning", state: "active", level: "warning", text: "Your device will warn you about...", version: "2.x"}
   * interaction.messagesFor({state: PENDING}).forEach(msg => console.log(msg));
   *   { code: "device.connect", state: "pending", level: "info", text: "Please plug in your device."}
   * interaction.messagesFor({code: ACTIVE}).forEach(msg => console.log(msg));
   *   { code: "device.active", state: "active", level: "info", text: "Communicating with your device..."}
   *   { code: "device.active.warning", state: "active", level: "warning", text: "Your device will warn you about...", version: "2.x"}
   * interaction.messagesFor({version: /^2/}).forEach(msg => console.log(msg));
   *   { code: "device.active", state: "active", level: "warning", text: "Your device will warn you about...", version: "2.x"}
   */
  messagesFor({state, level, code, text, version}) {
    return this.messages().filter((message, i) => {
      if (state && message.state !== state) {
        return false;
      }
      if (level && message.level !== level) {
        return false;
      }
      if (code && !(message.code || '').match(code)) {
        return false;
      }
      if (text && !(message.text || '').match(text)) {
        return false;
      }
      if (version && !(message.version || '').match(version)) {
        return false;
      }
      return true;
    });
  }

  /**
   * Return whether there are any messages matching the given options.
   * 
   * @param {object} options
   * @param {string} options.state - must equal this keystore state
   * @param {string} options.level - must equal this message level
   * @param {string|regexp} options.code - code must match this regular expression
   * @param {string|regexp} options.text - text must match this regular expression
   * @param {string|regexp} options.version - version must match this regular expression
   * @returns {boolean}
   */
  hasMessagesFor({state, level, code, text}) {
    return this.messagesFor({state, level, code, text}).length > 0;
  }

  /**
   * Return the first message matching the given options (or `null` if none is found).
   * 
   * @param {object} options
   * @param {string} options.state - must equal this keystore state
   * @param {string} options.level - must equal this message level
   * @param {string|regexp} options.code - code must match this regular expression
   * @param {string|regexp} options.text - text must match this regular expression
   * @param {string|regexp} options.version - version must match this regular expression
   * @returns {module:interaction.Message|null} the first matching `Message` object (or `null` if none is found)
   */
  messageFor({state, level, code, text}) {
    const messages = this.messagesFor({state, level, code, text});
    if (messages.length > 0) { return messages[0]; }
    return null;
  }

  /**
   * Retrieve the text of the first message matching the given options
   * (or `null` if none is found).
   * 
   * @param {object} options
   * @param {string} options.state - must equal this keystore state
   * @param {string} options.level - must equal this message level
   * @param {string|regexp} options.code - code must match this regular expression
   * @param {string|regexp} options.text - text must match this regular expression
   * @param {string|regexp} options.version - version must match this regular expression
   * @returns {string|null} the text of the first matching message (or `null` if none is found)
   */
  messageTextFor({state, level, code, text}) {
    const message = this.messageFor({state, level, code, text});
    return (message ? message.text : null);
  }

}

/**
 * Class used for describing an unsupported interaction.
 *
 * - Always returns `false` when the `isSupported` method is called.
 *
 * - Has a keystore state `unsupported` message at the `error` level.
 *
 * - Throws errors when attempting to call API methods such as `run`,
 *   `request`, and `parse`.
 *
 * @extends {module:interaction.KeystoreInteraction}
 * @example
 * import {UnsupportedInteraction} from "unchained-wallets";
 * const interaction = new UnsupportedInteraction({text: "failure text", code: "fail"});
 * console.log(interaction.isSupported()); // false
 * 
 */
export class UnsupportedInteraction extends KeystoreInteraction {

  /**
   * Accepts parameters to describe what is unsupported and why.
   *
   * The `text` should be human-readable.  The `code` is for machines.
   * 
   * @param {object} options
   * @param {string} options.text - the text of the error message
   * @param {string} options.code - the code of the error message
   * @constructor
   */
  constructor({text, code}) {
    super();
    this.text = text;
    this.code = code;
  }

  /**
   * Always returns false.
   * 
   * @returns {false}
   */
  isSupported() {
    return false;
  }

  /**
   * Returns a single `error` level message at the `unsupported`
   * state.
   *
   * @returns {module:interaction.Message[]}
   */
  messages() {
    const messages = super.messages();
    messages.push({state: UNSUPPORTED, level: ERROR, code: this.code, text: this.text});
    return messages;
  }

  /**
   * Throws an error.
   * 
   */
  async run() {
    throw new Error(this.text);
  }

  /**
   * Throws an error.
   * 
   */
  request() {
    throw new Error(this.text);
  }

  /**
   * Throws an error.
   * 
   */
  parse() {
    throw new Error(this.text);
  }

}

/**
 * Base class for direct keystore interactions.
 *
 * Subclasses *must* implement a `run` method which communicates
 * directly with the keystore.  This method must be asynchronous
 * (return a `Promise`) to accommodate delays with network, devices,
 * &c.
 *
 * @example
 * import {DirectKeystoreInteraction} from "unchained-wallets";
 * class SimpleDirectInteraction extends DirectKeystoreInteraction {   *
 *
 *   constructor({param}) {
 *     super();
 *     this.param = param;
 *   }
 *
 *   async run() {
 *     // Or do something complicated...
 *     return this.param;
 *   }
 * }
 *
 * const interaction = new SimpleDirectInteraction({param: "foo"});
 * 
 * const result = await interaction.run();
 * console.log(result);
 * // "foo"
 * 
 */
export class DirectKeystoreInteraction extends KeystoreInteraction {

  /**
   * Sets the `this.direct` property to `true`.  This property can be
   * utilized when introspecting on interaction classes..
   *
   * @constructor
   */
  constructor() {
    super();
    this.direct = true;
  }

  /**
   * Initiate the intended interaction and return a result.
   *
   * Subclasses *must* override this function.  This function must
   * always return a promise as it is designed to be called within an
   * `await` block.
   *
   * @returns {Promise}
   * 
   */
  async run() {
    throw new Error("Override the `run` method in this interaction.");
  }

  /**
   * Throws an error.
   * 
   */
  request() {
    throw new Error("This interaction is direct and does not support a `request` method.");
  }

  /**
   * Throws an error.
   * 
   */
  parse() {
    throw new Error("This interaction is direct and does not support a `parse` method.");
  }

}


/**
 * Base class for indirect keystore interactions.
 *
 * Subclasses *must* implement two methods: `request` and `parse`.
 * Application code will pass the result of calling `request` to some
 * external process (HTTP request, QR code, &c.) and pass the response
 * to `parse` which should return a result.
 *
 * @example
 * import {IndirectKeystoreInteraction} from "unchained-wallets";
 * class SimpleIndirectInteraction extends IndirectKeystoreInteraction {   *
 *
 *   constructor({param}) {
 *     super();
 *     this.param = param;
 *   }
 *
 *   async request() {
 *     // Or do something complicated...
 *     return this.param;
 *   }
 *
 *   parse(response) {
 *     // Or do something complicated with `response`...
 *     return response;
 *   }
 *
 * }
 *
 * const interaction = new SimpleIndirectInteraction({param: "foo"});
 * 
 * const request = interaction.request();
 * const response = "bar"; // Or do something complicated with `request`
 * const result = interaction.parse(response);
 * console.log(result);
 * // "bar"
 * 
 */
export class IndirectKeystoreInteraction extends KeystoreInteraction {

  /**
   * Sets the `this.indirect` property to `true`.  This property can
   * be utilized when introspecting on interaction classes..
   *
   * @constructor
   */
  constructor() {
    super();
    this.indirect = true;
  }

  /**
   * Provide the request.
   *
   * Subclasses *may* override this function.  It can return any kind
   * of object.  Strings, data for QR codes, HTTP requests, command
   * lines, functions, &c. are all allowed.  Whatever is appropriate
   * for the interaction.
   *
   * @returns {Object}
   *
   */
  request() {
  }

  /**
   * Parse the response into a result.
   *
   * Subclasses *must* override this function.  It must accept an
   * appropriate kind of `response` object and return the final result
   * of this interaction.
   *
   * @param {Object} response
   * @returns {Object}
   *
   */
  parse(response) {
  }

  /**
   * Throws an error.
   * 
   */
  async run() {
    throw new Error("This interaction is indirect and does not support a `run` method.");
  }

}

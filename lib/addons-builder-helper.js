/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { Cc, Ci, Cu } = require('chrome');
const windowManager = Cc['@mozilla.org/appshell/window-mediator;1'].
                      getService(Ci.nsIWindowMediator);

const { PageMod } = require("addon-kit/page-mod");

const { AddonInstall } = require("addon-install");
const { createTemporaryFileFromData } = require("file-utils");

const CONFIG_FILENAME = "addon-config.json";
const CONFIG_PREF = "extensions.addonBuilderHelper.trustedOrigins";


/**
 * Utility method to toggle the XUL JS Console.
 * Return `message` attribute send back to webpage.
 */
let consoleWindow = null;
function toggleConsoleWindow(command) {
  consoleWindow = windowManager.getMostRecentWindow('global:console');
  switch(command) {
    case 'open':
      consoleWindow = consoleWindow ? consoleWindow.focus() :
                                      windowManager.getMostRecentWindow(null)
                                                   .open('chrome://global/content/console.xul',
                                                         '_blank',
                                                         'chrome,extrachrome,menubar,resizable,scrollbars,status,toolbar');
      break;
    case 'close':
      consoleWindow = consoleWindow ? consoleWindow.close() : null;
      break;
    case 'isOpen':
      return consoleWindow ? true : false;
      break;
    default:
      return 'An unrecognized command was passed through the "contents" ' +
             'property of the mozFlightDeck send object. Available commands ' +
             'are "open", "close", and "isOpen"';
  }
  return null;
}

/**
 * Implement API exposed to the content script
 * @param {SingleAddonManager} addonManager
 *   Utility object that handle low level addon install/uninstall
 * @param {Array} args
 *   Arguments passed to `mozFlightDeck.send` method from webpage
 * @param {function} callback
 *   Function called to send back result to the webpage's `then` promise method
 */
function onContentScriptRequest(addonManager, args, callback) {
  try {
    // mozFlighDeck.`send` accepts n-arguments.
    // First one is always the command name,
    // next ones are specific to each command.
    let command = args[0];
    if (typeof command != 'string')
      return callback({success: false, msg: "bad request: invalid command"});
    switch (command) {
    case "isInstalled":
      callback({
        success: true,
        isInstalled: addonManager.isInstalled,
        installedID: addonManager.installedID
      });
      break;
    case "version":
      callback({
        success: true,
        msg: require('self').version
      });
      break;
    case "uninstall":
      addonManager.uninstall(function () {
        callback({
          success: true,
          msg: "uninstalled"
        });
      });
      break;
    case "install":
      let contents = args[1];
      if (typeof contents != 'string')
        return callback({
          success: false,
          msg: "need xpi contents"
        });
      addonManager.install(contents, function (success) {
        callback({
          success: success,
          msg: success ? "installed" : "failed to install"
        });
      });
      break;
    case "toggleConsole":
      let consoleCommand = args[1];
      let message = toggleConsoleWindow(consoleCommand);
      callback({
        success: true,
        msg: message
      });
      break;
    default:
      callback({
        success: false,
        msg: "unknown command: " + command
      });
      break;
    }
  }
  catch(e) {
    console.exception(e);
    callback({
      success: false,
      msg: "internal error"
    });
  }
  return null;
}

function SingleAddonManager() {
  var self = this;
  var currExtension = null;

  return {
    get isInstalled() {
      return (currExtension != null && currExtension.isInstalled);
    },

    get installedID() {
      if (!currExtension)
        return null;
      return currExtension.id;
    },

    install: function install(xpiData, callback) {
      if (currExtension) {
        let self = this;
        self.uninstall(function () {
          self.install(xpiData, callback);
        });
      }
      else
        currExtension = AddonInstall.new(createTemporaryFileFromData(xpiData), callback);
    },

    uninstall: function uninstall(callback) {
      if (currExtension) {
        var oldExtension = currExtension;
        currExtension = null;
        oldExtension.unload(callback);
      }
    }
  };
};

function safeGetConfig() {
  var config = {};

  try {
    config = JSON.parse(require("self").data.load(CONFIG_FILENAME));
  } catch (e) {
    console.error(CONFIG_FILENAME + " doesn't exist or is malformed");
    console.exception(e);
  }

  if (!('trustedOrigins' in config &&
        Array.isArray(config.trustedOrigins)))
    config.trustedOrigins = [];

  return config;
}

exports.main = function main() {
  // Read config file from data folder
  var config = safeGetConfig();

  // Read trusted-origins from preference
  var pref = require("preferences-service").get(CONFIG_PREF, null);
  if (typeof(pref) == "string") {
    try {
      config.trustedOrigins = config.trustedOrigins.concat(pref.split(","));
    } catch (e) {
      console.log("Error when reading preference " + CONFIG_PREF);
      console.exception(e);
    }
  }

  PageMod({
    include: config.trustedOrigins,
    attachTo: ["existing", "top"],
    contentScriptWhen: "start",
    contentScript: "new " + function ContentScriptScope() {

      // Utility class to build a promise pattern
      function Promise(self) {
        let done = false;
        let args = null;
        let listeners = [];
        return {
          listen: function listen(callback) {
            if (done)
              callback.apply(self, args);
            else
              listeners.push(callback);
          },
          end: function end() {
            // Avoid multiple promises calls
            if (done)
              return;
            done = true;
            args = Array.slice(arguments);
            // Call already-registered promises
            for each(let callback in listeners)
              callback.apply(self, args);
          }
        }
      };

      // Public API we expose to web content:
      let msgCount = 1;
      let mozFlightDeck = {
        send: function () {
          let promise = Promise();
          let messageId = msgCount++;
          // First listen for the addon response,
          self.port.once(messageId, promise.end);
          // before sending our request to it:
          self.port.emit("content-request", messageId, Array.slice(arguments));

          // Return a promise
          return {
            then: promise.listen
          };
        }
      };

      // Expose `mozFlightDeck` to the web page
      unsafeWindow.mozFlightDeck = mozFlightDeck;

    },

    onAttach: function (worker) {
      let addonManager = SingleAddonManager();
      // Listen to all requests made by the content script
      worker.port.on("content-request", function (messageId, args) {
        let called = false;
        onContentScriptRequest(addonManager, args, function() {
          // Ensure sending only one response
          if (called)
            return;
          called = true;
          // Send response to the content script
          worker.port.emit.apply(null,
                                 [messageId].concat(Array.slice(arguments)));
        });
      });
    }
  });

  // Dipatch helper start/finish events to web content
  require("tab-events").dispatchTrivialEvent("addonbuilderhelperstart");
  require("unload").when(
    function() {
      require("tab-events").dispatchTrivialEvent("addonbuilderhelperfinish");
    });
};

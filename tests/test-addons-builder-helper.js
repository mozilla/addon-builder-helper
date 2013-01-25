/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { Cc, Ci, Cu } = require("chrome");
const tabs = require("addon-kit/tabs");
const { Services } = Cu.import("resource://gre/modules/Services.jsm");

const IOService = Cc["@mozilla.org/network/io-service;1"].
                  getService(Ci.nsIIOService);
function getChromeURIContent(chromeURI) {
  let channel = IOService.newChannel(chromeURI, null, null);
  let input = channel.open();
  let stream = Cc["@mozilla.org/binaryinputstream;1"].
                createInstance(Ci.nsIBinaryInputStream);
  stream.setInputStream(input);
  let content = stream.readBytes(input.available());
  stream.close();
  input.close();
  return content;
}

const TEST_ADDON_URL = require("self").data.url("abh-unit-test@mozilla.com.xpi");

// First register "data:*" URLs as being AddonBuilder trusted URLs
require("api-utils/preferences-service").set(
  "extensions.addonBuilderHelper.trustedOrigins",
  "data:*");

// Then, load Addon builder helper addon
require("addons-builder-helper").main();

// Utility function that opens a tab and attach a unit worker in it
function createTest(contentScript, onWorkerReady) {
  return function (test) {
    test.waitUntilDone();

    tabs.open({
      url: "data:text/html,",
      onReady: function(tab) {
        let worker = tab.attach({
          contentScript: [
            // Add some unit test method in global content script scope
            "new " + function ContentScriptScope() {
              assert = function assert(value, msg)
                self.port.emit("assert", value, msg);
              assertEqual = function assertEqual(a, b, msg)
                self.port.emit("assertEqual", a, b, msg);
              done = function done() self.port.emit("done")
            },
            // Add given content script
            contentScript
          ]
        });

        function done() {
          tab.close();
          test.done();
        }

        worker.port.on("assert", function (value, msg) {
          test.assert(value, msg);
        });
        worker.port.on("assertEqual", function (a, b, msg) {
          test.assertEqual(a, b, msg);
        });
        worker.port.on("done", done);

        if (typeof onWorkerReady == "function")
          onWorkerReady(test, worker, done);
      }
    });
  };
}

// Use "000" to execute this test first
exports.test000createTest = createTest(
  "new " + function ContentScriptScope() {
    assert(true, "`assert` works");
    assertEqual("a", "a", "`assertEqual` works");
    self.port.on("test-worker-events", done);
  },
  function (test, worker, done) {
    worker.port.emit("test-worker-events");
  }
);

// Use "111" to execute this test second
exports.test111Minimal = createTest(
  "new " + function ContentScriptScope() {
    assert("mozFlightDeck" in unsafeWindow, "`mozFlightDeck` is set");
    let FD = unsafeWindow.mozFlightDeck;
    assertEqual(typeof FD.send, "function", "`mozFlightDeck` has a `send` method");
    assertEqual(typeof FD.send("version").then, "function", "`send` return an object with `then` method");
    done();
  },
  function (test, worker, done) {

  }
);

exports.testVersion = createTest(
  "new " + function ContentScriptScope() {
    unsafeWindow.mozFlightDeck.send("version").then(function (data) {
      assert(data.success, "'version' succeed");
      self.port.emit("version", data.msg);
    });
  },
  function (test, worker, done) {
    worker.port.on("version", function (v) {
      let version = require("self").version;
      test.assertEqual(version, v, "'version' returns the correct version number");
      done();
    });
  }
);

exports.testIsInstalled = createTest(
  "new " + function ContentScriptScope() {
    unsafeWindow.mozFlightDeck.send("isInstalled").then(function (data) {
      assert(data.success, "'isInstalled' succeed");
      assert(!data.isInstalled, "'isInstalled' returns false before calling `install`");
      done();
    });
  },
  function (test, worker, done) {}
);

exports.testIsInstalled = createTest(
  "new " + function ContentScriptScope() {
    let toggleCount = 1;
    function toggle(command, result, callback) {
      unsafeWindow.mozFlightDeck.send("toggleConsole", command).then(function (data) {
        let n = toggleCount++;
        assert(data.success, "'toggleConsole' with '" + command + "' succeed [" + n + "]");
        assertEqual(data.msg, result, "'toggleConsole' returns " + result + " on '" + command + "' [" + n + "]");
        callback();
      });
    }
    toggle("isOpen", false, function () {
      toggle("open", null, function () {
        toggle("isOpen", true, function () {
          toggle("close", null, function () {
            toggle("isOpen", false, function () {
              done();
            });
          });
        });
      });
    });
  },
  function (test, worker, done) {}
);

exports.testInstall = createTest(
  "new " + function ContentScriptScope() {
    function assertIsInstalled(addonId, msg, next) {
      unsafeWindow.mozFlightDeck.send("isInstalled").then(function (data) {
        assert(data.success, "'isInstalled' succeed");
        if (addonId) {
          assert(data.isInstalled, msg);
          assertEqual(data.installedID, addonId, "`installedID` refer to the correct id");
        }
        else {
          assert(!data.isInstalled, msg);
          assertEqual(data.installedID, null, "`installedID` is null when isInstalled is false");
        }
        next();
      });
    }
    self.port.on("xpiData", function (xpiData) {
      assertIsInstalled(false, "'isInstalled' is false before calling `install`", install);
      function install() {
        unsafeWindow.mozFlightDeck.send("install", xpiData).then(function (data) {
          assert(data.success, "'install' succeed");
          assertEqual(data.msg, "installed", "'install' msg is valid");
          assertIsInstalled("abh-unit-test@mozilla.com", "'isInstalled' is true after successfull `install`", uninstall);
        });
      }
    });
    function uninstall() {
      unsafeWindow.mozFlightDeck.send("uninstall").then(function (data) {
        assert(data.success, "'uninstall' succeed");
        assertEqual(data.msg, "uninstalled", "'uninstall' msg is valid");
        assertIsInstalled(false, "'isInstalled' is false after calling `uninstall`", end);
      });
    }
    function end() {
      self.port.emit("uninstalled");
    }
  },
  function (test, worker, done) {

    // Save all events distpatched by bootstrap.js of the installed addon
    let events = [];
    let eventsObserver = {
      observe: function (subject, topic, data) {
        events.push(data);
      }
    };
    Services.obs.addObserver(eventsObserver, "abh-unit-test", false);

    // We can't use self.data.load as it doesn't read in binary mode!
    let xpiData = getChromeURIContent(TEST_ADDON_URL);
    worker.port.emit("xpiData", xpiData);

    worker.port.on("uninstalled", function () {
      Services.obs.removeObserver(eventsObserver, "abh-unit-test");
      test.assertEqual(JSON.stringify(events),
                       JSON.stringify(["install", "startup", "shutdown", "uninstall"]),
                       "addon's bootstrap.js functions have been called");
      test.done();
    });
  }
);

var {Cu, Ci, Cc} = require("chrome");
var errors = require("errors");

const XPI_FILENAME = "simple1.xpi";
const XPI_NAME = "simple";
const XPI_VERSION = "1.0";
const XPI_JID = "jid0-PZshXA4AIoK0D0dt0Cvtf9ZjBHs";
const XPI_ID = XPI_JID + "@jetpack";
const XPI_CONTRACT_ID = "@mozilla.org/harness-service;1?id=" + XPI_JID;
const XPI_APP_READY_TOPIC = XPI_JID + "_APPLICATION_READY";

function getDataFile(filename) {
  var myFilename = require("url").toFilename(__url__);
  var file = Cc['@mozilla.org/file/local;1']
             .createInstance(Ci.nsILocalFile);
  file.initWithPath(myFilename);
  file = file.parent.parent;
  file.append('examples');
  file.append('sample-web-page');
  file.append(filename);
  return file;
}

function getAddonManager() {
  var jsm = {};
  Cu.import("resource://gre/modules/AddonManager.jsm", jsm);
  return jsm.AddonManager;
}

function cleanseEnvironment() {
  // TODO: XPIs really shouldn't be looking at the environment
  // before checking for harness-options.json, but they
  // currently are. Here we remove the environment variable
  // so the XPI we load actually looks at its own
  // harness-options.json.
  var environ = Cc["@mozilla.org/process/environment;1"]
                .getService(Ci.nsIEnvironment);
  environ.set("HARNESS_OPTIONS", null);
}

exports.testXPI = function(test) {
  function failIfThrows(cb) {
    return errors.catchAndLog(cb, null, function(e) {
      console.exception(e);
      test.done();
    });
  }

  var AddonManager = getAddonManager();
  var file = getDataFile(XPI_FILENAME);
  var appReadyTopicHasFired = false;

  cleanseEnvironment();

  AddonManager.getInstallForFile(file, function(install) {
    test.assertEqual(install.version, XPI_VERSION,
                     "Addon version is " + XPI_VERSION);

    test.assertEqual(install.name, XPI_NAME,
                     "Addon name is " + XPI_NAME);

    require("observer-service").add(XPI_APP_READY_TOPIC, function() {
      appReadyTopicHasFired = true;
    });

    install.addListener({
      onInstallEnded: failIfThrows(function(install, addon) {
        test.assertEqual(addon.id, XPI_ID,
                         "Addon id is " + XPI_ID);
        test.assert(addon.appDisabled === false,
                    "Addon is not disabled");
        test.assert(addon.isActive, "Addon is currently functional");

        test.assert(appReadyTopicHasFired,
                    "App ready topic has fired: " + XPI_APP_READY_TOPIC);

        var factory = require("xpcom").getClass(XPI_CONTRACT_ID);
        test.pass("Factory exists w/ contract ID " + XPI_CONTRACT_ID);

        var hsvc = factory.wrappedJSObject.singleton;
        test.assertEqual(hsvc.contractID, XPI_CONTRACT_ID,
                         "harnessService contract ID is correct");
        test.done();
      })
    });
    install.install();
  }, null);
  test.waitUntilDone();
};

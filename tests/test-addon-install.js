/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { Cc, Ci, Cu } = require("chrome");
const { AddonInstall } = require("addon-install");
const { Services } = Components.utils.import("resource://gre/modules/Services.jsm");

const SELF = require("self");
const ADDON_URL = SELF.data.url("abh-unit-test@mozilla.com.xpi");
const ADDON_PATH = require("file-utils").createTemporaryFileFromURL(ADDON_URL);

exports.testInstall = function (test) {
  test.waitUntilDone();

  // Save all events distpatched by bootstrap.js of the installed addon
  let events = [];
  let eventsObserver = {
    observe: function (subject, topic, data) {
      events.push(data);
    }
  };
  Services.obs.addObserver(eventsObserver, "abh-unit-test", false);

  // Install the test addon
  let install = AddonInstall.new(ADDON_PATH, function onInstalled(success) {
    test.assert(success, "Installed successfully");
    test.assertEqual(install.id, "abh-unit-test@mozilla.com", "`install.id` is valid");
    test.assert(install.isInstalled, "`install.isInstalled` is true on 'onInstalled' call");

    // Now uninstall it
    install.unload(function () {
      test.assert(!install.isInstalled, "`install.isInstalled` is false when unload callback is called");
      test.assert(!install.id, "`install.id` is empty after uninstall");

      // Ensure that bootstrap.js methods of the addon have been called
      // successfully and in the right order
      Services.obs.removeObserver(eventsObserver, "abh-unit-test");
      test.assertEqual(JSON.stringify(events),
                       JSON.stringify(["install", "startup", "shutdown", "uninstall"]),
                       "addon's bootstrap.js functions have been called");

      test.done();
    });
  });
}

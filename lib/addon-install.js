/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { Cc, Ci, Cu } = require('chrome');
const { AddonManager } = Cu.import("resource://gre/modules/AddonManager.jsm");

const { Base } = require("api-utils/base");

/**
 * Class to manage an addon: install and uninstall it.
 */
exports.AddonInstall = Base.extend({
  /**
   * Immediatly install an addon. Note that the given xpi file will be
   * automatically removed when `callback` is being called.
   *
   * @param {String} xpiPath
   *   file path to an xpi to install
   * @param {Function} callback
   *   function called when addon install finished. First argument being a
   *   boolean to say if the installation was successfull
   */
  initialize: function (xpiPath, callback) {

    let self = this;
    let installListener = {
      onInstallEnded: function(aInstall, aAddon) {
        self._addon = aAddon;
        onInstalled(aInstall, true);
      },
      onInstallFailed: function (aInstall) {
        onInstalled(aInstall, false);
      }
    };
    function onInstalled(aInstall, success) {
      aInstall.removeListener(installListener);
      file.remove(xpiPath);
      callback(success);
    }

    // Create nsIFile for the xpi file
    let file = Cc['@mozilla.org/file/local;1'].createInstance(Ci.nsILocalFile);
    file.initWithPath(xpiPath);

    // Order AddonManager to install it!
    AddonManager.getInstallForFile(file, function(aInstall) {
      aInstall.addListener(installListener);
      aInstall.install();
    });

  },

  get id() this._addon ? this._addon.id : null,

  get isInstalled() "_addon" in this,

  unload: function (callback) {
    // Order Addonmanager to uninstall our addon
    if (!"_addon" in this)
      return callback();
    let addon = this._addon;
    let self = this;
    let uninstallListener = {
      onUninstalled: function onUninstalled(aAddon) {
        if (aAddon.id != addon.id)
          return;
        AddonManager.removeAddonListener(uninstallListener);
        delete self._addon;
        callback();
      }
    };
    AddonManager.addAddonListener(uninstallListener);
    addon.uninstall();
  }
});

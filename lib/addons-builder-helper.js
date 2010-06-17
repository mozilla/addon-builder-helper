var file = require("file");
var shellUtils = require("shell-utils");
var print;

function installAndRun(installPath, xpiPath) {
  // TODO: If the XPI is corrupted, Firefox will crash. Figure out how
  // to bail gracefully.
  if (file.exists(installPath))
    shellUtils.removeDirRecursive(installPath);
  shellUtils.makeDir(installPath);
  var zip = require("zip-file").open(xpiPath);
  zip.extractAll(installPath);
  var manifestFile = file.join(installPath, "harness-options.json");
  var manifest = JSON.parse(file.read(manifestFile));
  return {
    id: manifest.jetpackID,
    __proto__: require("bootstrap").run(manifest, installPath, print)
  };
}

function installExtension(xpiData) {
  var profileDir = require("directory-service").getPath("ProfD");
  var tempXPI = file.join(profileDir, "temp.xpi");
  var myDir = file.join(profileDir, "flightdeck");

  var xpi = file.open(tempXPI, "wb");
  xpi.write(xpiData);
  xpi.close();

  var ext = installAndRun(myDir, tempXPI);
  return ext;
}

function channelErrorWrapper(func, console) {
  return function() {
    try {
      return func.apply(this, arguments);
    } catch (e) {
      console.exception(e);
      return {success: false, msg: "internal error"};
    }
  };
}

function attachApiToChannel(channel, addonManager) {
  function onMessage(data) {
    if (!('cmd' in data && typeof(data.cmd) == 'string'))
      return {success: false, msg: "bad request"};
    switch (data.cmd) {
    case "isInstalled":
      return {success: true,
              isInstalled: addonManager.isInstalled,
              installedID: addonManager.installedID};
    case "uninstall":
      addonManager.uninstall();
      return {success: true,
              msg: "uninstalled"};
    case "install":
      if (!('contents' in data && typeof(data.contents) == 'string'))
        return {success: false,
                msg: "need data"};
      addonManager.install(data.contents);
      return {success: true,
              msg: "installed"};
    default:
      return {success: false,
              msg: "unknown command: " + data.cmd};
    }
  }

  channel.whenMessaged(channelErrorWrapper(onMessage));
}

function SingleAddonManager(installExtension) {
  var self = this;
  var currExtension = null;

  self.__defineGetter__(
    "isInstalled",
    function isInstalled() {
      return (currExtension != null);
    });

  self.__defineGetter__(
    "installedID",
    function installedID() {
      if (!currExtension)
        return null;
      return currExtension.id;
    });

  self.install = function install(xpiData) {
    if (currExtension)
      self.uninstall();
    currExtension = installExtension(xpiData);
  };

  self.uninstall = function uninstall() {
    if (currExtension) {
      var oldExtension = currExtension;
      currExtension = null;
      oldExtension.unload();
    }
  };
};

exports.main = function main(options, callbacks) {
  const CONFIG_FILENAME = "addon-config.json";

  var manager = require("json-channel").createManager("mozFlightDeck");
  var addonManager = new SingleAddonManager(installExtension);
  var config = {};

  print = callbacks.print;

  try {
    config = JSON.parse(require("self").data.load(CONFIG_FILENAME));
  } catch (e) {
    console.error(CONFIG_FILENAME + " doesn't exist or is malformed");
  }

  if (!('trustedOrigins' in config &&
        config.trustedOrigins &&
        config.trustedOrigins.constructor &&
        config.trustedOrigins.constructor.name == 'Array'))
    config.trustedOrigins = [];

  require("tab-browser").whenContentLoaded(
    require("trusted-origin-filter").wrap(
      config.trustedOrigins,
      function(window) {
        attachApiToChannel(manager.addChannel(window), addonManager);
      }));
};

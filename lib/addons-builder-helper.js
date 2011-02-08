var file = require("file");
var shellUtils = require("shell-utils");
var print;

var {Cc,Ci} = require('chrome');
var windowManager = Cc['@mozilla.org/appshell/window-mediator;1'].getService(Ci.nsIWindowMediator);
var consoleWindow = null;

const CONFIG_FILENAME = "addon-config.json";
const CONFIG_PREF = "extensions.addonBuilderHelper.trustedOrigins";

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
	case "toggleConsole":
		consoleWindow = windowManager.getMostRecentWindow('global:console');
		var message = null;
		switch(data.contents){
			case 'open': consoleWindow = (consoleWindow) ? consoleWindow.focus() : windowManager.getMostRecentWindow(null).open('chrome://global/content/console.xul', '_blank', 'chrome,extrachrome,menubar,resizable,scrollbars,status,toolbar');
				break;
			case 'close': consoleWindow = (consoleWindow) ? consoleWindow.close() : null;
				break;
			case 'isOpen': message = (consoleWindow) ? true : false;
				break;
			default:
				message = 'An unrecognized command was passed through the "contents" property of the mozFlightDeck send object. Available commands are "open", "close", and "isOpen"';
		}
		return {
			success: true,
			msg: message
		};
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

function safeGetConfig() {
  var config = {};

  try {
    config = JSON.parse(require("self").data.load(CONFIG_FILENAME));
  } catch (e) {
    console.error(CONFIG_FILENAME + " doesn't exist or is malformed");
    console.exception(e);
  }

  if (!('trustedOrigins' in config &&
        config.trustedOrigins &&
        config.trustedOrigins.constructor &&
        config.trustedOrigins.constructor.name == 'Array'))
    config.trustedOrigins = [];

  return config;
}

exports.main = function main(options, callbacks) {
  var manager = require("json-channel").createManager("mozFlightDeck");
  var addonManager = new SingleAddonManager(installExtension);
  var config = safeGetConfig();

  print = callbacks.print;

  var pref = require("preferences-service").get(CONFIG_PREF, null);

  if (typeof(pref) == "string") {
    try {      
      config.trustedOrigins = config.trustedOrigins.concat(pref.split(","));
    } catch (e) {
      console.log("Error when reading preference " + CONFIG_PREF);
      console.exception(e);
    }
  }

  function attach(window) {
    attachApiToChannel(manager.addChannel(window), addonManager);
  }

  attach = require("trusted-origin-filter").wrap(config.trustedOrigins,
                                                 attach);

  require("tab-browser").whenContentLoaded(attach);
  require("tab-events").forEachWindow(attach);
  require("tab-events").dispatchTrivialEvent("addonbuilderhelperstart");
  require("unload").when(
    function() {
      manager.unload();
      require("tab-events").dispatchTrivialEvent("addonbuilderhelperfinish");
    });
};

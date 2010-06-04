var tabBrowser = require("tab-browser");
var file = require("file");
var shellUtils = require("shell-utils");
var xhr = require("xhr");

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
  return require("bootstrap").run(manifest, installPath);
};

exports.main = function main(options, callbacks) {
  var manager = require("json-channel").createManager("mozFlightDeck");
  var currExtension = null;

  function bootstrapXPI(xpiData) {
    if (currExtension) {
      console.log("Unloading current extension.");
      currExtension.unload();
      console.log("Extension uninstalled.");
      currExtension = null;
    }

    var profileDir = require("directory-service").getPath("ProfD");
    var tempXPI = file.join(profileDir, "temp.xpi");
    var myDir = file.join(profileDir, "flightdeck");

    console.log("Writing", xpiData.length, "bytes to", tempXPI);
    var xpi = file.open(tempXPI, "wb");
    xpi.write(xpiData);
    xpi.close();

    console.log("Installing XPI to", myDir);
    currExtension = installAndRun(myDir, tempXPI);
    console.log("Extension installed.");
  }

  tabBrowser.whenContentLoaded(
    function(window) {
        var channel = manager.addChannel(window);
        channel.whenMessaged(
          function(data) {
            if (data.cmd == "install" && data.path) {
              try {
                console.log("Retrieving XPI at", data.path);
                var req = new xhr.XMLHttpRequest();
                req.open("GET", data.path);
                req.overrideMimeType('text/plain; charset=x-user-defined');
                req.onreadystatechange = function() {
                  if (req.readyState == 4) {
                    if (req.status == 200) {
                      console.log("Retrieved file.");
                      bootstrapXPI(req.responseText);
                      channel.send({msg: "installed", path: data.path});
                    } else {
                      channel.send({msg: "failed", path: data.path,
                                    status: req.status});
                      console.log("Failed to retrieve file", req.status);
                    }
                  }
                };
                req.send(null);
              } catch (e) {
                console.exception(e);
              }
            }
          });
    });
};

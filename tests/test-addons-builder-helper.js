function getModuleGlobal(module) {
  var sb = require("cuddlefish").parentLoader.findSandboxForModule(module);
  return sb.globalScope;
}

var abh = getModuleGlobal("addons-builder-helper");

exports.testAttachApiToChannel = function(test) {
  var onMessage;
  var fakeChannel = {
    whenMessaged: function(cb) {
      onMessage = cb;
    }
  };
  var lastXpiData;
  var uninstallCalled = 0;
  var fakeManager = {
    isInstalled: false,
    installedID: null,
    install: function(xpiData) {
      lastXpiData = xpiData;
    },
    uninstall: function() {
      uninstallCalled++;
    }
  };
  abh.attachApiToChannel(fakeChannel, fakeManager);

  test.assertEqual(JSON.stringify(onMessage({})),
                   JSON.stringify({success: false, msg: "bad request"}));
  test.assertEqual(JSON.stringify(onMessage({cmd: 'isInstalled'})),
                   JSON.stringify({success: true, isInstalled: false,
                                   installedID: null}));
  fakeManager.isInstalled = true;
  fakeManager.installedID = 'bleh';
  test.assertEqual(JSON.stringify(onMessage({cmd: 'isInstalled'})),
                   JSON.stringify({success: true, isInstalled: true,
                                   installedID: 'bleh'}));
  test.assertEqual(JSON.stringify(onMessage({cmd: 'install'})),
                   JSON.stringify({success: false, msg: "need data"}));

  test.assertEqual(lastXpiData, undefined);
  test.assertEqual(JSON.stringify(onMessage({cmd: 'install',
                                             contents: 'u'})),
                   JSON.stringify({success: true, msg: "installed"}));
  test.assertEqual(lastXpiData, 'u');
  test.assertEqual(uninstallCalled, 0);
  test.assertEqual(JSON.stringify(onMessage({cmd: 'uninstall'})),
                   JSON.stringify({success: true, msg: "uninstalled"}));
  test.assertEqual(uninstallCalled, 1);
  test.assertEqual(JSON.stringify(onMessage({cmd: 'blap'})),
                   JSON.stringify({success: false,
                                   msg: "unknown command: blap"}));
};

exports.testSingleAddonManager = function(test) {
  var unloadCalled = 0;

  function fakeInstallExtension(xpiData) {
    test.assertEqual(typeof(xpiData), "string");
    return {
      id: 'blargle',
      unload: function() {
        unloadCalled++;
      }
    };
  };

  var sam = new abh.SingleAddonManager(fakeInstallExtension);
  test.assertEqual(sam.isInstalled, false);
  test.assertEqual(sam.installedID, null);
  sam.install("foo");
  test.assertEqual(sam.isInstalled, true);
  test.assertEqual(sam.installedID, 'blargle');
  test.assertEqual(unloadCalled, 0);
  sam.install("bar");
  test.assertEqual(sam.isInstalled, true);
  test.assertEqual(unloadCalled, 1);
  sam.uninstall();
  test.assertEqual(unloadCalled, 2);
  sam.uninstall();
  test.assertEqual(unloadCalled, 2);
};

exports.testChannelErrorWrapper = function(test) {
  var func = abh.channelErrorWrapper(function() { return {msg: 'hi'}; });
  test.assertEqual(JSON.stringify(func()),
                   JSON.stringify({msg: 'hi'}),
                   "channelErrorWrapper must passthrough return values");

  var exceptions = [];
  var mockConsole = {
    exception: function(e) {
      exceptions.push(e);
    }
  };

  func = abh.channelErrorWrapper(function() { o(); },
                                 mockConsole);
  test.assertEqual(JSON.stringify(func()),
                   JSON.stringify({success: false, msg: "internal error"}),
                   "channelErrorWrapper must return JSON response on err");

  test.assertEqual(exceptions[0].toString(),
                   "ReferenceError: o is not defined",
                   "channelErrorWrapper must log exceptions");
};

var timer = require("timer");
var tabBrowser = require("tab-browser");
var tof = require("trusted-origin-filter");

// TODO: Replace arb timeout w/ "real" deterministic event handling.
const ARB_TIMEOUT = 100;

exports.testMalformedOriginThrows = function(test) {
  test.assertRaises(function() { tof.wrap([1]); },
                    "malformed origin URI: 1");
  test.assertRaises(function() { tof.wrap(["chrome://nou"]); },
                    "malformed origin URI: chrome://nou");
  tof.wrap(["http://localhost:8000/"]);
  test.pass("wrapping a valid URL doesn't throw");
};

exports.testBasic = function(test) {
  var urlsToLoad = [__url__,
                    "data:text/html,hi"];
  var expectedLog = [__url__ + " is trusted",
                     "data:text/html,hi is untrusted"];
  var wasTrustedCalled;

  function loadNextUrl() {
    if (urlsToLoad.length > 0) {
      tabBrowser.addTab(urlsToLoad.pop());
    } else {
      timer.setTimeout(function() { tracker.unload();
                                    test.done(); },
                       ARB_TIMEOUT);
    }
  }

  var trustedFunc = tof.wrap(
    [__url__],
    function(window) {
      wasTrustedCalled = true;
    });

  var tracker = tabBrowser.whenContentLoaded(
    function(window) {
      wasTrustedCalled = false;
      trustedFunc(window);
      var log;
      if (wasTrustedCalled)
        log = window.location.href + " is trusted";
      else
        log = window.location.href + " is untrusted";
      test.assertEqual(log, expectedLog.pop());
      window.close();
      loadNextUrl();
    });

  loadNextUrl();
  test.waitUntilDone(5000);
};

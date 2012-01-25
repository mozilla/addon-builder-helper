var tabEvents = require("tab-events");
var tabBrowser = require("api-utils/tab-browser");
var timer = require("api-utils/timer");

// TODO: Replace arb timeout w/ "real" deterministic event handling.
const ARB_TIMEOUT = 100;

exports.testDispatchTrivialEvent = function(test) {
  var indexUrl = require("self").data.url("test-tab-events.html");

  var tracker = tabBrowser.whenContentLoaded(
    function(window) {
      if (window.location == indexUrl) {
        function checkGotFoo() {
          test.assertEqual(window.wrappedJSObject.gotFoo, true,
                           "foo event should have been dispatched");
          window.close();
          timer.setTimeout(function() {
                             tracker.unload();
                             test.done();
                           }, ARB_TIMEOUT);
        }

        test.assertEqual(window.wrappedJSObject.gotFoo, false,
                         "foo event should not have been dispatched yet");

        timer.setTimeout(function() {
                           tabEvents.dispatchTrivialEvent("foo");
                           timer.setTimeout(checkGotFoo, 10);
                         }, 10);
      }
    });

  tabBrowser.addTab(indexUrl);
  test.waitUntilDone(5000);
};

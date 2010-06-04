var timer = require("timer");
var tabBrowser = require("tab-browser");

// TODO: Replace arb timeout w/ "real" deterministic event handling.
const ARB_TIMEOUT = 100;

exports.testBasic = function(test) {
  var manager = require("json-channel").createManager("boop");
  var indexUrl = require("url").resolve(__url__, "test-json-channel.html");
  
  var tracker = tabBrowser.whenContentLoaded(
    function(window) {
      if (window.location == indexUrl) {
        var foo = window.document.getElementById("foo");
        var channel = manager.addChannel(window);
        channel.whenMessaged(
          function(data) {
            test.assertEqual(data, "HAI2u!",
                             "chrome channel.whenMessaged() works.");
            channel.send("O YEA!");
            timer.setTimeout(
              function() {
                test.assertEqual(foo.textContent,
                                 'got "O YEA!"',
                                 "content channel.whenMessaged works.");
                test.assertEqual(manager.channels.length,
                                 1,
                                 "channel count is correct");
                window.close();
                timer.setTimeout(function() {
                                   test.assertEqual(
                                     manager.channels.length,
                                     0,
                                     "channel closed on window close"
                                   );
                                   manager.unload();
                                   tracker.unload();
                                   test.done();
                                 }, ARB_TIMEOUT);
              },
              ARB_TIMEOUT);
          });
      }
    });

  tabBrowser.addTab(indexUrl);
  test.waitUntilDone(5000);
};

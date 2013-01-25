var forEachWindow = exports.forEachWindow = function forEachWindow(cb) {
  forEachBrowser(
    function(browser) {
      if (browser.contentWindow)
        cb(browser.contentWindow);
    });
};

var forEachBrowser = exports.forEachBrowser = function forEachBrowser(cb) {
  var delegate = {
    onTrack: function onTrack(tabbrowser) {
      var browsers = tabbrowser.browsers;
      for (var i = 0; i < browsers.length; i++)
        cb(browsers[i]);
    },
    onUntrack: function onUntrack(tabbrowser) {
    }
  };

  var Tracker = require("sdk/deprecated/tab-browser").Tracker;
  var tracker = new Tracker(delegate);
  tracker.unload();
};

exports.dispatchTrivialEvent = function dispatchTrivialEvent(name) {
  forEachBrowser(
    function(browser) {
      if (browser.contentDocument) {
        var document = browser.contentDocument;
        if (document.body) {
          var event = document.createEvent("Events");
          event.initEvent(name, true, false);
          document.body.dispatchEvent(event);
        }
      }
    });
};

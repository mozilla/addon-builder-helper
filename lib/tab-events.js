exports.dispatchTrivialEvent = function dispatchTrivialEvent(name) {
  var delegate = {
    onTrack: function onTrack(tabbrowser) {
      var browsers = tabbrowser.browsers;
      for (var i = 0; i < browsers.length; i++) {
        var browser = browsers[i];
        if (browser.contentDocument) {
          var document = browser.contentDocument;
          if (document.body) {
            var event = document.createEvent("Events");
            event.initEvent(name, true, false);
            document.body.dispatchEvent(event);
          }
        }
      }
    },
    onUntrack: function onUntrack(tabbrowser) {
    }
  };

  var Tracker = require("tab-browser").Tracker;
  var tracker = new Tracker(delegate);
  tracker.unload();
};

exports.wrap = function wrap(origins, func) {
  var ios = Cc['@mozilla.org/network/io-service;1']
            .getService(Ci.nsIIOService);
  var ssm = Cc["@mozilla.org/scriptsecuritymanager;1"]
            .getService(Ci.nsIScriptSecurityManager);

  // Um, it's weird that we have to do this. Got it from
  // toolkit/components/places/src/nsMicrosummaryService.js.
  const NS_ERROR_MODULE_DOM = 2152923136;
  const NS_ERROR_DOM_BAD_URI = NS_ERROR_MODULE_DOM + 1012;

  var originURIs = [];
  origins.forEach(
    function(origin) {
      try {
        originURIs.push(ios.newURI(origin, null, null));
      } catch (e) {
        throw new Error("malformed origin URI: " + origin);
      }
    });

  return function(window) {
    var req = window.QueryInterface(Ci.nsIInterfaceRequestor);
    var nav = req.getInterface(Ci.nsIWebNavigation);
    var isTrusted = false;
    for (var i = 0; i < originURIs.length; i++) {
      try {
        ssm.checkSameOriginURI(nav.currentURI, originURIs[i], false);
        isTrusted = true;
      } catch (e if e.result == NS_ERROR_DOM_BAD_URI) {}
      if (isTrusted) {
        func.call(this, window);
        return;
      }
    }
  };
};

const {Cc, Ci, Cr} = require("chrome");

var dirSvc = Cc["@mozilla.org/file/directory_service;1"]
             .getService(Ci.nsIProperties);

exports.getPath = function getPath(name) {
  try {
    return dirSvc.get(name, Ci.nsIFile).path;
  } catch (e if e.result == Cr.NS_ERROR_FAILURE) {
    throw new Error("Directory service entry not found: " + name);
  }
};

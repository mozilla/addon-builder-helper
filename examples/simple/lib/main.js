exports.main = function(options, callbacks) {
  var args = options.staticArgs || {};
  if (typeof(args) == "string")
    args = JSON.parse(args);
  require("unload").when(function() {
    console.log("unload " + args.message);
  });
  console.log("load " + args.message);
}

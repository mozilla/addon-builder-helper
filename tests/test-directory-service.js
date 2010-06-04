var dirSvc = require("directory-service");

exports.testGet = function(test) {
  test.assertEqual(typeof(dirSvc.getPath("ProfD")), "string",
                   "Profile directory should exist");
  test.assertRaises(
    function() require("directory-service").getPath("blargy"),
    "Directory service entry not found: blargy",
    "Getting nonexistent entries should raise exceptions"
  );
};

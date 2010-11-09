var zipFile = require("zip-file");
var url = require("url");
var shellUtils = require("shell-utils");
var file = require("file");

var mydir = file.dirname(url.toFilename(__url__));
var fooPath = file.join(mydir, "foo.zip");
var corruptPath = file.join(mydir, "corrupt.zip");

exports.testCorrupted = function(test) {
  var zip = zipFile.open(corruptPath);
  try {
    zip.entries;
    test.fail("getting entries from corrupt zip file should fail");
  } catch (e if e.result == require("chrome").Cr.NS_ERROR_FILE_CORRUPTED) {
    test.pass("opening corrupted files throws error");
  }
};

exports.testEntries = function(test) {
  var zip = zipFile.open(fooPath);
  test.assertEqual(JSON.stringify(zip.entries),
                   '["foo/bar.txt","foo/"]',
                   "Entries should be readable.");
};

exports.testExtractAll = function(test) {
  var profileDir = require("directory-service").getPath("ProfD");
  var tempDir = file.join(profileDir, "test-zip-file-temp");
  if (file.exists(tempDir))
    shellUtils.removeDirRecursive(tempDir);
  test.assert(!file.exists(tempDir),
              "tempDir must not exist.");
  shellUtils.makeDir(tempDir);

  var zip = zipFile.open(fooPath);
  zip.extractAll(tempDir);
  test.assertEqual(file.read(file.join(tempDir, "foo", "bar.txt")),
                   "This is a test file.\n",
                   "Extraction of dirs and files should work.");

  shellUtils.removeDirRecursive(tempDir);
};

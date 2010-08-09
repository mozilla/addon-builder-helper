const {Cc, Ci, Cu} = require("chrome");

var FileUtils = {};
Cu.import("resource://gre/modules/FileUtils.jsm", FileUtils);
FileUtils = FileUtils.FileUtils;

const ZIP_DIR_REGEXP = /.*\/$/;

function MozFile(path) {
  var file = Cc['@mozilla.org/file/local;1']
             .createInstance(Ci.nsILocalFile);
  file.initWithPath(path);
  return file;
}

function withZip(file, cb, args) {
  var result;
  try {
    var zipReader = Cc["@mozilla.org/libjar/zip-reader;1"].
                    createInstance(Ci.nsIZipReader);
    memory.track(zipReader, "ZipReader");
    var finalArgs = [zipReader];
    if (args)
      finalArgs = finalArgs.concat(args);
    zipReader.open(file);
    result = cb.apply(this, finalArgs);
    zipReader.close();
  } catch (e) {
    try {
      zipReader.close();
    } catch (e2) {}
    throw e;
  }
  return result;
}

function addPath(file, path) {
  var clone = file.clone();
  path.split("/").forEach(
    function(part) {
      if (part) clone.append(part);
    });
  return clone;
}

function getEntries(zipReader) {
  var entries = [];
  var enumerator = zipReader.findEntries(null);
  while (enumerator.hasMore())
    entries.push(enumerator.getNext());
  return entries;
}

function extractAll(zipReader, baseOutDir) {
  var entries = getEntries(zipReader);
  var dirNames = [entry for each (entry in entries)
                        if (entry.match(ZIP_DIR_REGEXP))];
  dirNames.sort();
  dirNames.forEach(
    function(name) {
      var outDir = addPath(baseOutDir, name);
      if (!outDir.exists()) {
        outDir.create(Ci.nsILocalFile.DIRECTORY_TYPE,
                      FileUtils.PERMS_DIRECTORY);
      }
    });
  
  var fileNames = [entry for each (entry in entries)
                         if (!entry.match(ZIP_DIR_REGEXP))];
  fileNames.forEach(
    function(name) {
      var outFile = addPath(baseOutDir, name);
      if (!outFile.exists()) {
        zipReader.extract(name, outFile);
        outFile.permissions |= FileUtils.PERMS_FILE;
      }
    });
}

exports.open = function open(path) {
  var file = MozFile(path);

  return {
    get entries() {
      return withZip(file, getEntries);
    },
    extractAll: function(path) {
      return withZip(file, extractAll, [MozFile(path)]);
    }
  };
};

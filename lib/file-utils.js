/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Create a temporary file for a given string data
const file = require("api-utils/file");
exports.createTemporaryFileFromData = function (data, tmpName) {
  var profileDir = require("system").pathFor("ProfD");
  var path = file.join(profileDir, tmpName ? tmpName : "tmp-file");

  var tmpFile = file.open(path, "wb");
  tmpFile.write(data);
  tmpFile.close();

  return path;
}

exports.createTemporaryFileFromURL = function (url, tmpName) {
  let data = exports.readBinaryURI(url);
  return exports.createTemporaryFileFromData(data, tmpName);
}

// Utility function that synchronously reads local resource from the given
// `uri` and returns content string. Read in binary mode.
const {ByteReader} = require("api-utils/byte-streams");
const {Cc, Ci} = require("chrome");
exports.readBinaryURI = function readBinaryURI(uri) {
  let ioservice = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
  let channel = ioservice.newChannel(uri, "UTF-8", null);
  let stream = channel.open();

  let reader = new ByteReader(stream);
  let data = reader.read();
  stream.close();

  return data;
}

/*
# ***** BEGIN LICENSE BLOCK *****
# Version: MPL 1.1/GPL 2.0/LGPL 2.1
#
# The contents of this file are subject to the Mozilla Public License Version
# 1.1 (the "License"); you may not use this file except in compliance with
# the License. You may obtain a copy of the License at
# http://www.mozilla.org/MPL/
#
# Software distributed under the License is distributed on an "AS IS" basis,
# WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
# for the specific language governing rights and limitations under the
# License.
#
# The Original Code is the Extension Manager.
#
# The Initial Developer of the Original Code is Ben Goodger.
# Portions created by the Initial Developer are Copyright (C) 2004
# the Initial Developer. All Rights Reserved.
#
# Contributor(s):
#  Ben Goodger <ben@mozilla.org> (Google Inc.)
#  Benjamin Smedberg <benjamin@smedbergs.us>
#  Jens Bannmann <jens.b@web.de>
#  Robert Strong <robert.bugzilla@gmail.com>
#  Dave Townsend <dtownsend@oxymoronical.com>
#  Daniel Veditz <dveditz@mozilla.com>
#  Alexander J. Vincent <ajvincent@gmail.com>
#  Atul Varma <atul@mozilla.com>
#
# Alternatively, the contents of this file may be used under the terms of
# either the GNU General Public License Version 2 or later (the "GPL"), or
# the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
# in which case the provisions of the GPL or the LGPL are applicable instead
# of those above. If you wish to allow use of your version of this file only
# under the terms of either the GPL or the LGPL, and not to allow others to
# use your version of this file under the terms of the MPL, indicate your
# decision by deleting the provisions above and replace them with the notice
# and other provisions required by the GPL or the LGPL. If you do not delete
# the provisions above, a recipient may use your version of this file under
# the terms of any one of the MPL, the GPL or the LGPL.
#
# ***** END LICENSE BLOCK *****
*/

const {Cc, Ci, Cu} = require("chrome");

var FileUtils = {};
Cu.import("resource://gre/modules/FileUtils.jsm", FileUtils);
FileUtils = FileUtils.FileUtils;

function MozFile(path) {
  var file = Cc['@mozilla.org/file/local;1']
             .createInstance(Ci.nsILocalFile);
  file.initWithPath(path);
  return file;
}

// TODO: This should really be moved to the 'file' module.
exports.makeDir = function makeDir(path) {
  MozFile(path).create(Ci.nsILocalFile.DIRECTORY_TYPE,
                       FileUtils.PERMS_DIRECTORY);
};

/**
 * Deletes a directory and its children. First it tries nsIFile::Remove(true).
 * If that fails it will fall back to recursing, setting the appropriate
 * permissions, and deleting the current entry. This is needed for when we have
 * rights to delete a directory but there are entries that have a read-only
 * attribute (e.g. a copy restore from a read-only CD, etc.)
 * @param   dir
 *          A string path to the directory to be deleted
 */
exports.removeDirRecursive = function removeDirRecursive(dir) {
  dir = MozFile(dir);

  try {
    dir.remove(true);
    return;
  }
  catch (e) {
  }

  var dirEntries = dir.directoryEntries;
  while (dirEntries.hasMoreElements()) {
    var entry = dirEntries.getNext().QueryInterface(Ci.nsIFile);

    if (entry.isDirectory()) {
      removeDirRecursive(entry);
    }
    else {
      entry.permissions = FileUtils.PERMS_FILE;
      entry.remove(false);
    }
  }
  dir.permissions = FileUtils.PERMS_DIRECTORY;
  dir.remove(true);
};

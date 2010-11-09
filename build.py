import subprocess
import os.path
import shutil

try:
  import json
except ImportError:
  import simplejson as json

def make_simple_xpi(msg, outfile):
  dest = os.path.join("examples", "sample-web-page", outfile)
  print "creating %s..." % dest
  subprocess.check_call([
    "cfx", "xpi",
    "-p", os.path.join("examples", "simple"),
    "--static-args=%s" % json.dumps({"message": msg})
  ], stdout=subprocess.PIPE)
  shutil.move("simple.xpi", dest)

make_simple_xpi("addon ONE", "simple1.xpi")
make_simple_xpi("addon TWO", "simple2.xpi")

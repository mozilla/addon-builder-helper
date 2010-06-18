This is an addon that allows for integration between Firefox and
the Mozilla Add-ons Builder (formerly known as FlightDeck).

## Usage ##

1. If necessary, edit the file `data/addon-config.json` so
   that it contains the URL(s) for origins that host the Mozilla
   Add-ons Builder. The scheme, host, and port of each URL
   make up its "origin", meaning that the rest of the URL
   will be ignored when making trust decisions.

2. All pages under a trusted origin will automatically have a
   `mozFlightDeck` object added to their `window`
   object. See below for its API.

## API ##

<tt>window.mozFlightDeck.**send**(*request*)</tt>

Sends the JSON-able object `request` to the addon and returns a
response object. For the purposes of this documentation, we will call
the latter object `response`.

`request` must have at least one property,
`request.cmd`, which is a string specifying a command to
send the addon.

`response` has at least one boolean property,
`response.success`, indicating whether the command executed
successfully. If it is `false`, then `response.msg`
is a string explaining why.

Valid command strings are:

* `isInstalled` - Queries if an addon is currently
  installed in development mode, placing the boolean result
  in `response.isInstalled`. `response.installedID` will be
  the addon's ID.

* `uninstall` - If an addon is currently installed in development
  mode, uninstalls it.  If no addon is currently installed, this
  command does nothing.

* `install` - Installs an addon in development mode, uninstalling
  any predecessor. `obj.contents` must be a string representing binary
  XPI data; due to bug 541828, corrupt values can actually crash
  some versions of Firefox, so be careful!

See `examples/sample-web-page/index.html` for example code that uses
this API.

## Limitations ##

Haven't yet made Bugzilla bugs for these.

* It's currently only possible for one addon to be "installed in
  development mode" at a time. Could be nice in the long-term to
  allow for multiple ones to be installed.

* The Addon Builder Helper doesn't currently deal well with the case
  where addons raise exceptions while being installed or uninstalled
  in development mode.

* Addons installed in development mode don't stay installed after
  Firefox restarts. Some think this is a feature, though, not
  a bug.

* If the user has an addon installed via the Firefox Addon Manager
  and then tries installing the same addon in development mode
  using the Addon Builder Helper, an explosion occurs.

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
  in `response.isInstalled`.

* `uninstall` - If an addon is currently installed in development
  mode, uninstalls it.  If no addon is currently installed, this
  command does nothing.

* `install` - Installs an addon in development mode, uninstalling
  any predecessor. `obj.contents` must be a string representing binary
  XPI data; due to bug 541828, corrupt values can actually crash
  some versions of Firefox, so be careful!

See `examples/sample-web-page/index.html` for example code that uses
this API.

## TODOs ##

* [Make FlightDeck addon restartless](https://bugzilla.mozilla.org/show_bug.cgi?id=566256)

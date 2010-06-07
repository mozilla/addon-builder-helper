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
successfully. If it is `false`, then the string `response.msg`
explains why.

Valid values for `request.cmd` are:

* `'isInstalled'` - Returns a response with a boolean property called
  `response.isInstalled` which indicates if an addon is currently
  installed in development mode.

* `'uninstall'` - If an addon is currently installed, uninstalls it.
  If no addon is uninstalled, this command does nothing.

* `'install'` - Installs an addon. Requires `obj.contents` to be a
  string representing binary XPI data.

See `examples/sample-web-page/index.html` for example code that uses
this API.

## TODOs ##

* [Make FlightDeck addon restartless](https://bugzilla.mozilla.org/show_bug.cgi?id=566256)

This is an extension that allows for integration between Firefox and
the Mozilla Add-ons Builder (formerly known as FlightDeck).

## Usage ##

1. If necessary, edit the file <code>data/addon-config.json</code> so
   that it contains the URL(s) for origins that host the Mozilla
   Add-ons Builder. The scheme, host, and port of each URL
   make up its "origin", meaning that the rest of the URL
   will be ignored when making trust decisions.

2. All pages under a trusted origin will automatically have a
   <code>mozFlightDeck</code> object added to their <code>window</code>
   object.  See <code>examples/sample-web-page/index.html</code> for
   example code that uses this object.

## TODOs ##

* [Make FlightDeck addon restartless](https://bugzilla.mozilla.org/show_bug.cgi?id=566256)

This is an addon that allows for integration between Firefox and
the Mozilla Add-ons Builder (formerly known as FlightDeck).

## Usage ##

1. If necessary, either edit the file `data/addon-config.json` so that
   it contains the URL(s) for origins that host the Mozilla Add-ons
   Builder or set the `extensions.addonBuilderHelper.trustedOrigins`
   preference in `about:config` to a comma-delimited list of
   origins. The scheme, host, and port of each URL make up its
   "origin", meaning that the rest of the URL will be ignored when
   making trust decisions.

2. All pages under a trusted origin will automatically have a
   `mozFlightDeck` object added to their `window`
   object. See below for its API.

3. As soon as the addon is activated, an event of type
   `addonbuilderhelperstart` will be dispatched to the
   `document.body` element of every open tab.

## API ##

<tt>var promise = window.mozFlightDeck.**send**(*command*, ...)</tt>
<tt>promise.**then**(function (*response*) { ... })</tt>

Sends a command request to the addon, with first argument being the command
name, then optional arguments specific to each command. These arguments
need to be JSON-able objects. This `send` method returns a
`response` object through a promise pattern.

`response` has at least one boolean property,
`response.success`, indicating whether the command executed
successfully. If it is `false`, then `response.msg`
is a string explaining why.

Valid command strings are:

* `version` - Queries addon builder helper addon version, placing the
  integer result in `response.msg`.

* `toggleConsole` - Toggle visiblity of the XUL JS Console.

* `isInstalled` - Queries if an addon is currently installed,
  placing the boolean result in `response.isInstalled`.

* `uninstall` - If an addon is currently installed, uninstalls it.
  If no addon is currently installed, this command does nothing.

* `install` - Installs an addon, uninstalling any predecessor.
  `obj.contents` must be a string representing binary XPI data;
  due to bug 541828, corrupt values can actually crash some versions
  of Firefox, so be careful!


## Limitations ##

Haven't yet made Bugzilla bugs for these.

* The Addon Builder Helper doesn't currently deal well with the case
  where addons raise exceptions while being installed or uninstalled
  in development mode.

* If the user has an addon installed via the Firefox Addon Manager
  and then tries installing the same addon in development mode
  using the Addon Builder Helper, an explosion occurs.

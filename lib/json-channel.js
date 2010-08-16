const {Cu} = require("chrome");

// This function is decompiled and evaluated in a sandbox.
function buildChannelInContent(sandbox) {
  var sendImpl = sandbox.sendToChrome;
  var whenMessagedImpl = sandbox.whenMessaged;

  sandbox.sendToChrome = null;
  sandbox.whenMessaged = null;

  sandbox.demolish = function() {
    sendImpl = null;
    whenMessagedImpl = null;
    delete sandbox.window[sandbox.name];
  };

  sandbox.window[sandbox.name] = {
    send: function send(data) {
      var result = sendImpl(JSON.stringify(data));
      if (typeof(result) == "string")
        return JSON.parse(result);
      return result;
    },
    whenMessaged: function whenMessaged(cb) {
      whenMessagedImpl(function(data) { cb(JSON.parse(data)); });
    }
  };
}

function Channel(window, manager) {
  memory.track(this);
  this._receivedFromContent = null;
  this._sendToContent = null;
  this._manager = manager;
  this._window = window;
  this._window.addEventListener("unload", this, true);
  this._inject();
}

Channel.prototype = {
  _inject: function _inject() {
    var self = this;
    var unsafeWindow = self._window.wrappedJSObject;
    var sandbox = Cu.Sandbox(unsafeWindow);

    function whenMessaged(cb) {
      self._sendToContent = XPCSafeJSObjectWrapper(cb);
    };
    sandbox.importFunction(whenMessaged);

    function sendToChrome(data) {
      if (self._receivedFromContent) {
        data = XPCSafeJSObjectWrapper(data);
        var result = self._receivedFromContent.call(undefined,
                                                    JSON.parse(data));
        if (typeof(result) == "object")
          return JSON.stringify(result);
        return result;
      }
      return undefined;
    };
    sandbox.importFunction(sendToChrome);

    sandbox.name = self._manager.name;
    sandbox.window = unsafeWindow;
    self._sandbox = sandbox;
    Cu.evalInSandbox("(" + buildChannelInContent + ")(this);", sandbox);
  },
  handleEvent: function handleEvent(event) {
    this.close();
  },
  whenMessaged: function whenMessaged(cb) {
    this._receivedFromContent = cb;
  },
  send: function send(data) {
    if (this._sendToContent)
      this._sendToContent.call(undefined, JSON.stringify(data));
  },
  close: function close() {
    if (this._manager) {
      try {
        Cu.evalInSandbox("demolish();", this._sandbox);
      } catch (e) {
        console.exception(e);
      };
      this._sandbox = null;
      this._manager.onCloseChannel(this);
      this._window.removeEventListener("unload", this, true);
      this._receivedFromContent = null;
      this._sendToContent = null;
      this._window = null;
      this._manager = null;
    }
  }
};

require("errors").catchAndLogProps(Channel.prototype, "handleEvent");

function Manager(name) {
  memory.track(this);
  this.name = name;
  this._channels = [];
  require("unload").ensure(this);
}

Manager.prototype = {
  get channels() {
    return this._channels.slice();
  },
  addChannel: function addChannel(window) {
    var channel = new Channel(window, this);
    this._channels.push(channel);
    return channel;
  },
  onCloseChannel: function onCloseChannel(channel) {
    var index = this._channels.indexOf(channel);
    if (index == -1)
      throw new Error("unknown channel");
    this._channels.splice(index, 1);
  },
  unload: function unload() {
    this.channels.forEach(function(channel) { channel.close(); });
  }
};

exports.createManager = function createManager(name) {
  return new Manager(name);
};

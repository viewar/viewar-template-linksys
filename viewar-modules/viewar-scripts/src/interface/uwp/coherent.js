export function createEngine(global, engine, hasOnLoad) {
  'use strict';


  var VERSION = [1, 11, 1, 2];

  function Emitter() {
    this.events = {};
  }

  Emitter.prototype._createClear = function (object, name, handler) {
    return function() {
      var handlers = object.events[name];
      if (handlers) {
        var index = -1;
        // this was in native previously
        if(handler === undefined)
        {
          for(var i = 0; i < handlers.length; ++i)
          {
            if(handlers[i].wasInCPP !== undefined)
            {
              index = i;
              break;
            }
          }
        }
        else
        {
          index = handlers.indexOf(handler);
        }
        if (index != -1) {
          handlers.splice(index, 1);
          if (handlers.length === 0) {
            delete object.events[name];
          }
        }
      } else {
        if(engine.RemoveOnHandler !== undefined) {
          engine.RemoveOnHandler(name);
        }
      }
    };
  };

  Emitter.prototype.on = function (name, callback, context) {
    var handlers = this.events[name];
    if (handlers === undefined)
      handlers = this.events[name] = [];

    var handler = new Handler(callback, context || this);
    handlers.push(handler);
    return { clear: this._createClear(this, name, handler) };
  };

  Emitter.prototype.off = function (name, handler, context) {
    var handlers = this.events[name];

    if (handlers !== undefined) {
      context = context || this;

      var index;
      var length = handlers.length;
      for (index = 0; index < length; ++index) {
        var reg = handlers[index];
        if (reg.code == handler && reg.context == context) {
          break;
        }
      }
      if (index < length) {
        handlers.splice(index, 1);
        if (handlers.length === 0) {
          delete this.events[name];
        }
      }
    }
    else
    {
      engine.RemoveOnHandler(name);
    }
  };


  var isAttached = engine !== undefined;

  engine = engine || {};
  engine.isAttached = isAttached;

  Emitter.prototype.merge = function (emitter) {
    var lhs = this.events,
        rhs = emitter.events,
        push = Array.prototype.push,
        events;

    for (var e in rhs) {
      events = lhs[e] = lhs[e] || [];
      push.apply(events, rhs[e]);
    }
  };

  function Handler(code, context) {
    this.code = code;
    this.context = context;
  }

  Emitter.prototype.trigger = function(name) {
    var handlers = this.events[name];

    if (handlers !== undefined) {
      var args = Array.prototype.slice.call(arguments, 1);

      handlers.forEach(function (handler) {
        handler.code.apply(handler.context, args);
      });
    }
  };

  engine.events = {};
  for (var property in Emitter.prototype) {
    engine[property] = Emitter.prototype[property];
  }

  engine.on = function (name, callback, context) {
    var handlers = this.events[name];

    if (handlers === undefined && engine.AddOrRemoveOnHandler !== undefined) {

      // Check where to cache the handler
      var prevEvent = engine.AddOrRemoveOnHandler(name, callback, context);

      // handler cached in C++
      if(prevEvent === undefined) {
        return { clear: this._createClear(this, name, undefined) };
      }
      handlers = this.events[name] = [];

      // Add the previous handler
      var prevHandler = new Handler(prevEvent[0], prevEvent[1] || this);
      prevHandler.wasInCPP = true;
      handlers.push(prevHandler);

    } else if (handlers === undefined) {
      handlers = this.events[name] = [];
    }

    var handler = new Handler(callback, context || this);
    handlers.push(handler);
    return { clear: this._createClear(this, name, handler) };
  }

  engine._trigger = Emitter.prototype.trigger;

  var concatArguments = Array.prototype.concat;
  engine.trigger = function (name) {
    this._trigger.apply(this, arguments);
    this.TriggerEvent.apply(this, arguments);

    if (this.events['all'] !== undefined) {
      var allArguments = concatArguments.apply(['all'], arguments);
      this._trigger.apply(this, allArguments);
    }
  };

  engine._BindingsReady = false;
  engine._WindowLoaded = false;
  engine._RequestId = 0;
  engine._ActiveRequests = {};

  engine.call = function () {
    engine._RequestId++;
    var id = engine._RequestId;

    var deferred = new Promise(function (resolve, reject) {
      engine._ActiveRequests[id] = {
        resolve,
        reject,
      };
    });

    var messageArguments = Array.prototype.slice.call(arguments);
    messageArguments.splice(1, 0, id);
    engine.SendMessage.apply(this, messageArguments);
    return deferred;
  };

  engine._Errors = [ 'Success', 'ArgumentType', 'NoSuchMethod', 'NoResult' ];

  engine._ForEachError = function (errors, callback) {
    var length = errors.length;

    for (var i = 0; i < length; ++i) {
      callback(errors[i].first, errors[i].second);
    }
  };

  engine._MapErrors = function (errors) {
    var length = errors.length;

    for (var i = 0; i < length; ++i) {
      errors[i].first = engine._Errors[errors[i].first];
    }
  };

  engine._TriggerError = function (type, message) {
    engine.trigger('Error', type, message);
  };

  engine._OnError = function (requestId, errors) {
    engine._MapErrors(errors);

    if (requestId === null || requestId === 0) {
      engine._ForEachError(errors, engine._TriggerError);
    }
    else {
      var deferred = engine._ActiveRequests[requestId];

      delete engine._ActiveRequests[requestId];

      deferred.reject(errors);
    }
  };

  engine._eventHandles = {};

  engine._Register = function (eventName) {
    var trigger = (function (name, engine) {
      return function () {
        var eventArguments = [name];
        eventArguments.push.apply(eventArguments, arguments);
        engine.TriggerEvent.apply(this, eventArguments);
      };
    }(eventName, engine));

    engine._eventHandles[eventName] = engine.on(eventName, trigger);
  };

  engine._removeEventThunk = function (name) {
    var handle = engine._eventHandles[name];
    handle.clear();
    delete engine._eventHandles[name];
  };

  engine._Unregister = function (name) {
    if (typeof name === 'string') {
      engine._removeEventThunk(name);
    } else {
      name.forEach(engine._removeEventThunk, engine);
    }
  };

  engine._OnReady = function () {
    engine._BindingsReady = true;
    if (engine._WindowLoaded) {
      engine.trigger('Ready');
    }
  };

  engine._OnWindowLoaded = function () {
    engine._WindowLoaded = true;
    if (engine._BindingsReady) {
      engine.trigger('Ready');
    }
  };

  engine._ThrowError = function (error) {
    var prependTab = function (s) { return "\t" + s; };
    var errorString = error.name + ": " + error.message + "\n" +
        error.stack.split("\n").map(prependTab).join("\n");
    console.error(errorString);
  };

  engine._Result = function (requestId) {
    var deferred = engine._ActiveRequests[requestId];
    if (deferred !== undefined)
    {
      delete engine._ActiveRequests[requestId];

      var resultArguments = Array.prototype.slice.call(arguments);
      resultArguments.shift();
      deferred.resolve.apply(deferred, resultArguments);
    }
  };

  engine.initialize = function () {
    if (hasOnLoad) {
      global.addEventListener("load", function () {
        engine._OnWindowLoaded();
      });
    } else {
      engine._WindowLoaded = true;
    }

    engine.on('_Result', engine._Result, engine);
    engine.on('_Register', engine._Register, engine);
    engine.on('_Unregister', engine._Unregister, engine);
    engine.on('_OnReady', engine._OnReady, engine);
    engine.on('_OnError', engine._OnError, engine);

    const promise = new Promise(resolve => engine.on('Ready', resolve));

    engine.BindingsReady(VERSION[0], VERSION[1], VERSION[2], VERSION[3]);

    return promise;
  }

  return engine;
}

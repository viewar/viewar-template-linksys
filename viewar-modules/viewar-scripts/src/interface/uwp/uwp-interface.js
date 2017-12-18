import { parse, format } from '../../utils/utils';
import { SYNC_CALLS, ASYNC_CALLS } from '../../constants';
import { createEngine } from './coherent';

import { injector, AppConfig } from '../../dependencies';

export function createUwpInterface({window, logger}) {
  let initialized = false;
  let adapter = null;

  const eventHandlers = {};
  const resolvers = [];
  const callHistory = [];

  const appConfig = injector.resolve(AppConfig);

  let nextRequestId = 10000;

  const engine = createEngine(window, window.engine, true);

  const coreInterface = {
        initialize,
        call,
        resolveUrl,
        on: ::engine.on,
        once,
        off: ::engine.off,
        emit: ::engine.trigger,

        get platform() { return 'UWP' },
        get callHistory() { return callHistory; },
      };

  return coreInterface;

//======================================================================================================================
// INITIALIZATION
//======================================================================================================================

  async function initialize() {
    if (!initialized) {
      await engine.initialize();

      engine.on('_Result', (requestId, response) => {
        setTimeout(() => {
          if (resolvers[requestId]) {
            resolvers[requestId].resolve(response);
            delete resolvers[requestId];
          }
        })
      });
      engine.on('_OnError', (requestId, error) => {
        setTimeout(() => {
          if (requestId) {
            resolvers[requestId].reject(error);
            delete resolvers[requestId];
          }
        })
      });

      await Promise.resolve().then(() => call('scriptingLayerReady'));

      initialized = true;
    }
  }

//======================================================================================================================
// CALL
//======================================================================================================================

  function once(eventName) {
    return new Promise(resolve => {
      engine.on(eventName, function onceHandler(response) {
        engine.off(eventName, onceHandler);
        resolve(response);
      });
    });
  }

  function call(callName, ...messageArguments) {
    logCall(callName, messageArguments);

    if (isAsyncCall(callName)) {
      return callAsync(callName, messageArguments.map(format), nextRequestId++).then(response => {
        return parse(response);
      });
    } else {
      return engine.call(callName, ...messageArguments.map(format)).then(parse);
    }
  }

  function callAsync(callName, args, currentId) {
    return new Promise((resolve, reject) => {
      resolvers[currentId] = { resolve, reject };
      engine.trigger(callName, currentId, ...args);
    });
  }

  function isAsyncCall(callName) {
    return ASYNC_CALLS.includes(callName) || (eventHandlers[callName] && !SYNC_CALLS.includes(callName));
  }

  function resolveUrl(relativeUrl) {
    if (relativeUrl.includes('/Models/Images/')) {
      let results = /\/(\w+)\.\w+$/.exec(relativeUrl);
      if (results[1]) {
        return `${appConfig.host}/model/downloadImage/display:1/size:large/id:${results[1]}`;
      }
    } else if (relativeUrl.includes('/CategoryImages/')) {
      let results = /\/(\w+)\.\w+$/.exec(relativeUrl);
      if (results[1]) {
        return `${appConfig.host}/category/display:1/downloadImage/size:large/id:${results[1]}`;
      }
    } else if (relativeUrl.includes('/Models/Resources/')) {
      let results = /\/(\w+)\/([\w#]+\.\w+)$/.exec(relativeUrl);
      if (results && results[1] && results[2]) {
        return `${appConfig.host}/resources/DownloadImage/display:1/id:${results[1]}/name:${encodeURIComponent(results[2])}`;
      }
    }
    return '';
  }

//======================================================================================================================
// DEBUG
//======================================================================================================================

  function logCall(callName, requestId, messageArguments) {
    const logEntry = {
      id: requestId,
      name: callName,
      arguments: messageArguments,
      timestamp: new Date(),
      trace: new Error().stack.replace(/Error\s+/, '\t')
    };

    if (coreInterface.callHistory.push(logEntry) === 100) {
      coreInterface.callHistory.shift();
    }
  }

}

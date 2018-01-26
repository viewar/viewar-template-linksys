import toString from 'lodash/toString';
import castArray from 'lodash/castArray';
import createEmitter from 'component-emitter';

import { parse, format } from '../utils/utils';
import { injector, Window, Config } from '../dependencies';
import { Logger } from '../utils/logger';
import { CoreInterface } from '../dependencies';
import { SYNC_CALLS, ASYNC_CALLS } from '../constants';
import { resolveAdapter } from './adapters/resolve-adapter';
import { createUwpInterface } from './uwp/uwp-interface';

injector.register(CoreInterface,
    specification => createCoreInterface({...specification, resolveAdapter}),
    {window: Window, logger: Logger, config: Config});

export { CoreInterface } from '../dependencies';
export function createCoreInterface({window, logger, config, resolveAdapter}) {
  let initialized = false;
  let adapter = null;

  const emitter = createEmitter({});
  const eventHandlers = {};
  const resolvers = [];
  const callHistory = [];
  let nextRequestId = 0;

  const coreInterface = (window.engine && window.engine.AddOrRemoveOnHandler) ? createUwpInterface({window, logger}) : {
    initialize,
    call,
    resolveUrl,
    on: ::emitter.on,
    once: ::emitter.once,
    off: ::emitter.off,
    emit: ::emitter.emit,

    get platform() { return adapter && adapter.platform },
    get callHistory() { return callHistory; },
  };

  return coreInterface;

//======================================================================================================================
// INITIALIZATION
//======================================================================================================================

  async function initialize() {
    if (!initialized) {
      adapter = await resolveAdapter(window, coreInterface);

      coreInterface.on('_Result', handleResult);
      coreInterface.on('_OnError', handleError);
      coreInterface.on('_Register', handleRegisterEvent);
      coreInterface.on('_Unregister', handleUnregisterEvent);

      await adapter.initialize();
      await Promise.resolve().then(() => call('scriptingLayerReady'));

      initialized = true;
    }
  }

//======================================================================================================================
// CALL
//======================================================================================================================

  function call(callName, ...messageArguments) {
    return new Promise((resolve, reject, onCancel = () => {}) => {
      const requestId = ++nextRequestId;

      config.logCoreCalls && logCall(callName, requestId, messageArguments);

      onCancel(() => {
        adapter.sendMessage('abortDownload', toString(requestId));
        reject(new Promise.CancellationError('Download aborted'));
      });

      resolvers[requestId] = {resolve, reject};

      return isAsyncCall(callName) ?
          adapter.triggerEvent(callName, requestId, ...messageArguments.map(format)) :
          adapter.sendMessage(callName, requestId, ...messageArguments.map(format));
    }).then(parse);
  }

  function isAsyncCall(callName) {
    return ASYNC_CALLS.includes(callName) || (eventHandlers[callName] && !SYNC_CALLS.includes(callName));
  }

  function resolveUrl(relativeUrl) {
    return adapter && adapter.resolveUrl(relativeUrl);
  }

//======================================================================================================================
// EVENT HANDLERS
//======================================================================================================================

  function handleResult(requestId, response) {
    resolvers[requestId] && resolvers[requestId].resolve(response);
    delete resolvers[requestId];
  }

  function handleError(requestId, errors) {
    if (!requestId) {
      castArray(errors).forEach(error => logger.error(new Error(error.second || error)));
    } else {
      resolvers[requestId] && resolvers[requestId].reject(new Error(toString(castArray(errors)[0].second || castArray(errors)[0])));
      delete resolvers[requestId];
    }
  }

  function handleRegisterEvent(eventName) {
    const trigger = (eventName => (...args) => adapter.triggerEvent(eventName, ...args.map(format)))(eventName);
    eventHandlers[eventName] = coreInterface.on(eventName, trigger);
  }

  function handleUnregisterEvent(eventName) {
    castArray(eventName).forEach(eventName => {
      coreInterface.off(eventName, eventHandlers[eventName]);
      delete eventHandlers[eventName];
    });
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

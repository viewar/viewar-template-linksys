import createEmitter from 'component-emitter';
import { parse } from '../../utils/utils';

export function createIosAdapter(window, coreInterface) {

  return {
    platform: 'iOS',

    query,
    initialize,
    sendMessage,
    triggerEvent,
    resolveUrl,
  };

  function query() {
    return new Promise(resolve => {
      if (window.engine && window.engine.SendMessage) {
        resolve(false);
      }

      createSimpleEventTrigger('q')();
      setTimeout(() => resolve(!!window.engine), 0);
    });
  }

  function initialize() {
    Object.assign(createEmitter(window.engine), {
      checkClickThrough,
      _trigger,
    });

    return bindingsReady();
  }

  function _trigger(...args) {
    setTimeout(() => coreInterface.emit(...args.map(parse)), 0);
  }

  function bindingsReady() {
    const promise = new Promise(resolve => coreInterface.once('_OnReady', resolve));
    createSimpleEventTrigger('r')(0, window.location.href, window.parent === window ? 1 : 0);
    return promise;
  }

  function sendMessage(callName, requestId, ...messageArguments) {
    sendViaIframe('coherent-js:c:' +
        callName + ':' + requestId + ':' + encodeURIComponent(JSON.stringify(messageArguments)));
  }

  function triggerEvent(eventName, ...messageArguments) {
    sendViaIframe('coherent-js:e:' +
        eventName + ':' + encodeURIComponent(JSON.stringify(messageArguments)));
  }

  function resolveUrl(relativeUrl) {
    return `coui://${relativeUrl}`;
  }

//======================================================================================================================
// PRIVATE INTERFACE
//======================================================================================================================

  function createSimpleEventTrigger(type) {
    return (...args) => sendViaIframe(['coherent-js', type, ...args].join(':'));
  }

  function sendViaIframe(src) {
    const document = window.document;
    const frame = Object.assign(document.createElement('iframe'), {
      width: '0',
      height: '0',
      src
    });

    document.documentElement.appendChild(frame);
    if (frame && frame.parentNode) {
      frame.parentNode.removeChild(frame);
    }
  }

  function checkClickThrough(pageX, pageY) {
    return consumedByUi({pageX, pageY}) ? 'Y' : 'N';
  }

  function consumedByUi({pageX, pageY}) {
    const document = window.document;
    const elem = document.elementFromPoint(pageX, pageY);
    if (elem && elem != document.documentElement && elem != document.body && !elem.classList.contains('coui-noinput')) {
      return elem.classList.contains('coui-inputcallback') ? elem.couiInputCallback(pageX, pageY) : true;
    } else {
      return false;
    }
  }

}

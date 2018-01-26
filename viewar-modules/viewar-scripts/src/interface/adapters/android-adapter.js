import createEmitter from 'component-emitter';
import { parse } from '../../utils/utils';

export function createAndroidAdapter(window, coreInterface) {

  return {
    platform: 'Android',

    query,
    initialize,
    sendMessage,
    triggerEvent,
    resolveUrl,
  };

  function query() {
    return Promise.resolve().then(() => {
      if (window.__couiAndroid && window.__couiAndroid.initCoui) {
        (new Function(window.__couiAndroid.initCoui())());
        return !!window.engine;
      }
      return false;
    });
  }

  function initialize() {
    Object.assign(createEmitter(window.engine), {
      checkClickThrough,
      _trigger,
    });

    return bindingsReady();
  }

  function bindingsReady() {
    const document = window.document;
    const promise = new Promise(resolve => coreInterface.once('_OnReady', resolve));

    if (document.body) {
      setupCoherentForAndroid();
    } else {
      document.addEventListener('DOMContentLoaded', setupCoherentForAndroid);
    }

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

  function _trigger(...args) {
    setTimeout(() => coreInterface.emit(...args.map(parse)), 0);
  }

  function checkClickThrough(pageX, pageY) {
    return consumedByUi({pageX, pageY}) ? "Y" : "N";
  }

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

  function consumedByUi({pageX, pageY}) {
    const document = window.document;
    const elem = document.elementFromPoint(pageX, pageY);
    if (elem && elem != document.documentElement && elem != document.body && !elem.classList.contains('coui-noinput')) {
      return elem.classList.contains('coui-inputcallback') ? elem.couiInputCallback(pageX, pageY) : true;
    } else {
      return false;
    }
  }

  function setupCoherentForAndroid() {
    const document = window.document;
    const couiAndroid = window.__couiAndroid;
    const body = document.body;

    body.addEventListener('touchstart', createTouchListener(0, couiAndroid));
    body.addEventListener('touchmove', createTouchListener(1, couiAndroid));
    body.addEventListener('touchend', createTouchListener(3, couiAndroid));
    body.addEventListener('touchcancel', createTouchListener(4, couiAndroid));

    createSimpleEventTrigger('r')(0, window.location.href, window.parent === window ? 1 : 0);
  }

  function createTouchListener(phase, couiAndroid) {
    return function (event) {
      let touches = [...event.changedTouches || []];

      if (couiAndroid.inputState === 0) { // Input state: Take all

      } else if (couiAndroid.inputState === 1) { // Input state: Take none

        event.preventDefault();

        touches.forEach(function (touch) {
          couiAndroid.addTouchEvent(Number(touch.identifier), phase, touch.screenX, touch.screenY);
        });

      } else { // Input state: Transparent
        touches.forEach(function (touch) {
          let consumed = consumedByUi(touch);

          if (phase === 1 && !consumed) {
            event.preventDefault(); // Fix bug for Android 4.4+
          }

          if (!consumed) {
            couiAndroid.addTouchEvent(Number(touch.identifier), phase, touch.screenX, touch.screenY);
          }
        });
      }
    };
  }
}

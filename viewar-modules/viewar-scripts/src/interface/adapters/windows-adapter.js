import createEmitter from 'component-emitter';
import { parse } from '../../utils/utils';

export function createWindowsAdapter(window, coreInterface) {

  return {
    platform: 'Windows',

    query,
    initialize,
    sendMessage,
    triggerEvent,
    resolveUrl,
  };

  function query() {
    return Promise.resolve(!!(window.engine && window.engine.SendMessage));
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
    window.engine.BindingsReady();
    return promise;
  }

  function sendMessage(...messageArguments) {
    window.engine.SendMessage.apply(coreInterface, messageArguments);
  }

  function triggerEvent(...messageArguments) {
    window.engine.TriggerEvent.apply(coreInterface, messageArguments);
  }

  function resolveUrl(relativeUrl) {
    return `coui://${relativeUrl}`;
  }

//======================================================================================================================
// PRIVATE INTERFACE
//======================================================================================================================

  function checkClickThrough(pageX, pageY) {
    return consumedByUi({pageX, pageY}) ? "Y" : "N";
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

import compose from 'stampit/compose';
import createBaseEmitter from 'component-emitter';

import { $ } from '../dependencies';

export default createEmitter;

function createEmitter() {

  const emitter = createBaseEmitter({awaitEvent});

  return emitter;

  /**
   * Wraps an event handler set on the object into a promise. The promise is resolved when the event gets triggered.
   * @param {string} eventName - name of the event
   * @returns {Promise}
   * @memberOf Emitter
   */
  function awaitEvent(eventName) {
    return new Promise(function (resolve) {
      emitter.once(eventName, resolve);
    });
  }
}

export const ProtectedEmitter = compose({

  initializers: [function () {
    const emitter = createBaseEmitter({});

    Object.assign(this, {
      on(...args) { emitter.on(...args) },
      off(...args) { emitter.off(...args) },
      once(...args) { emitter.once(...args) },
    });

    Object.assign($(this), {
      emit(event, ...args) { emitter.emit(event, ...args) }
    });
  }],

  methods: {

  },

});


/**
 * @interface ProtectedEmitter
 */

/**
 * @method on
 * @param {string} eventName
 * @param {function} eventHandler
 * @memberof ProtectedEmitter#
 */

/**
 * @method off
 * @param {string} eventName
 * @param {function} eventHandler
 * @memberof ProtectedEmitter#
 */

/**
 * @method once
 * @param {string} eventName
 * @param {function} eventHandler
 * @memberof ProtectedEmitter#
 */

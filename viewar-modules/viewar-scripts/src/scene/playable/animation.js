import createEmitter from '../../components/emitter.js';

import { injector } from '../../dependencies';
import { CoreInterface } from '../../interface/core-interface';
import { SceneManager } from '../scene-manager';

/**
 * @interface Animation
 * @implements Playable
 */
export function Animation(specification) {
  const { register = () => {}, coreInterface } = specification;

  const { name, instanceId, duration } = specification;

  let state = 'stopped';
  let remainingDuration = -1;

  const emitter = createEmitter();

  const animation = Object.assign({
    pause,
    resume,
    start,
    stop,

    /**
     * Name of the animation.
     * @type {string}
     * @memberOf! Animation#
     */
    get name() { return name; },
    /**
     * State of the animation.
     * @type {string}
     * @memberOf! Animation#
     */
    get state() { return state; },
    /**
     * Duration of the animation in ms.
     * @type {number}
     * @memberOf! Animation#
     */
    get duration() { return duration; }
  }, emitter);

  register(instanceId, name, () => setAnimationState('stopped'));

  return animation;

//======================================================================================================================
// PUBLIC INTERFACE
//======================================================================================================================

  /**
   * Pauses playing animation.
   * @returns {Promise} resolved when done.
   * @memberOf! Animation#
   */
  function pause() {
    return coreInterface.call('pauseAnimation', instanceId, name).then(() => setAnimationState('paused'));
  }

  /**
   * Resumes paused animation.
   * @returns {Promise} resolved when done.
   * @memberOf! Animation#
   */
  function resume() {
    return coreInterface.call('resumeAnimation', instanceId, name).then(() => setAnimationState('playing'));
  }

  /**
   * Starts the animation from specified time.
   * @param {number?} timeInMs starting time
   * @param {boolean?} loop whether or not the animation should loop
   * @returns {Promise} resolved when done.
   * @memberOf! Animation#
   */
  function start(timeInMs = 0, loop = false) {
    return coreInterface.call('startAnimation', instanceId, name, timeInMs || 0, !!loop)
        .then(function () {
          setAnimationState('playing');
          remainingDuration = duration * 1000 - timeInMs;
          setTimeout(updateAnimationStatus, 100);
          return animation;
        });
  }

  /**
   * Stops playing animation. Resets current time to zero.
   * @returns {Promise} resolved when done.
   * @memberOf! Animation#
   */
  function stop() {
    return coreInterface.call('stopAnimation', instanceId, name).then(() => setAnimationState('stopped'));
  }

//======================================================================================================================
// PRIVATE FUNCTIONS
//======================================================================================================================

  function setAnimationState(newState) {
    state = newState;
    animation.emit('stateChanged', state);

    return animation;
  }

  function updateAnimationStatus() {
    // TODO: Remove all logic related to remainingDuration (and the code block below) after the notification 'animationEnded' has been implemented in the UI [VCS-917].
    if (state !== 'playing') {
      return;
    }
    remainingDuration -= 100;
    if (remainingDuration <= 0) {
      coreInterface.emit('animationEnded', name, instanceId);
    } else {
      setTimeout(updateAnimationStatus, 100);
    }
  }

}

export const createAnimation = injector.wireFactory(Animation, {
  coreInterface: CoreInterface,
});


/**
 * Interface for objects that represent streamable content
 *
 * @interface Playable
 */

/**
 * Starts the streaming.
 *
 * @function
 * @name Playable#start
 * @param timeInMs {number} timestamp to start from
 * @param loop {boolean} if true the streamable will restart after finishing
 * @returns {Promise} resolved when done.
 */

/**
 * Stops the streaming.
 *
 * @function
 * @name Playable#stop
 * @returns {Promise} resolved when done.
 */

/**
 * Resumes the streaming.
 *
 * @function
 * @name Playable#resume
 * @returns {Promise} resolved when done.
 */

/**
 * Pauses the streaming.
 *
 * @function
 * @name Playable#pause
 * @returns {Promise} resolved when done.
 */

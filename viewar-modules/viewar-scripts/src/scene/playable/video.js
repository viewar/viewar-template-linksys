import createEmitter from '../../components/emitter.js';

import { injector } from '../../dependencies';
import { CoreInterface } from '../../interface/core-interface';
import { SceneManager } from '../scene-manager';


/**
 * @interface Video
 * @implements Playable
 */
export function Video(specification) {
  const { register = () => {}, coreInterface } = specification;

  const { name, instanceId } = specification;

  let state = 'stopped';

  const emitter = createEmitter();

  const video = Object.assign({
    pause,
    resume,
    start,
    stop,

    /**
     * Name of the video.
     * @type {string}
     * @memberOf! Video#
     */
    get name() { return name; },
    /**
     * State of the video.
     * @type {string}
     * @memberOf! video#
     */
    get state() { return state; },
  }, emitter);

  register(instanceId, name, () => setVideoState('stopped'));

  return video;

//======================================================================================================================
// PUBLIC INTERFACE
//======================================================================================================================

  function init() {
    coreInterface.on('videoEnded', playableEnded);
    coreInterface.on('animationEnded', playableEnded);
  }

  function playableEnded(name, instanceId) {
    avRegistry[instanceId] && avRegistry[instanceId][name] && avRegistry[instanceId][name]();
  }

  /**
   * Pauses playing animation.
   * @returns {Promise} resolved when done.
   * @memberOf! Video#
   */
  function pause() {
    return coreInterface.call('pauseVideo', instanceId, name).then(() => setVideoState('paused'));
  }

  /**
   * Resumes paused animation.
   * @returns {Promise} resolved when done.
   * @memberOf! Video#
   */
  function resume() {
    return coreInterface.call('resumeVideo', instanceId, name).then(() => setVideoState('playing'));
  }

  /**
   * Starts the animation from specified time.
   * @param {number?} timeInMs starting time
   * @param {boolean?} loop whether or not the animation should loop
   * @returns {Promise} resolved when done.
   * @memberOf! Video#
   */
  function start(timeInMs = 0, loop = false) {
    return coreInterface.call('startVideo', instanceId, name, timeInMs, loop).then(() => setVideoState('playing'));
  }

  /**
   * Stops playing animation. Resets current time to zero.
   * @returns {Promise} resolved when done.
   * @memberOf! Video#
   */
  function stop() {
    return coreInterface.call('stopVideo', instanceId, name).then(() => setVideoState('stopped'));
  }

//======================================================================================================================
// PRIVATE FUNCTIONS
//======================================================================================================================

  function setVideoState(newState) {
    state = newState;
    video.emit('stateChanged', state);

    return video;
  }

}

export const createVideo = injector.wireFactory(Video, {
  coreInterface: CoreInterface,
});



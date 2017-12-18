import defaults from 'lodash/defaults';
import deepCopy from 'lodash/cloneDeep';

import { mixinHmdMode, mixinPoseInDirection, mixinStateUpdate } from './camera-common';
import { AR_CAMERA_DEFAULTS } from '../constants';

const STATE_LIVE = Symbol();
const STATE_FROZEN = Symbol();
const STATE_FRAME_VISIBLE = Symbol();

//======================================================================================================================
/**
 * Uses camera feed together with device sensors and various trackers to provide an AR experience for the user.
 *
 * @interface AugmentedRealityCamera
 * @extends Camera
 */

/**
 * @private
 * @returns AugmentedRealityCamera
 */
export function createAugmentedRealityCamera(specification) {
  const { sharedCameraState, coreInterface, freezeFrames = false, createFreezeFrame } = specification;
  const { name, pose } = defaults(specification, deepCopy(AR_CAMERA_DEFAULTS));

  let state = STATE_LIVE;
  let activeFreezeFrame = null;

  const camera = {
    activate,
    freeze,
    unfreeze,

    /**
     * camera pose
     * @type {ControllableCameraPose}
     * @memberOf! AugmentedRealityCamera#
     */
    get pose() { return deepCopy(pose); },
    /**
     * camera activity state
     * @type {boolean}
     * @memberOf! AugmentedRealityCamera#
     */
    get active() { return sharedCameraState.activeCamera === camera; },
    get frozen() { return state !== STATE_LIVE; },
  };


  if (freezeFrames) {
    Object.assign(camera, {
      showFreezeFrame,
      removeFreezeFrame,
      saveFreezeFrame,
      downloadFreezeFrame,
    });
    Object.defineProperty(camera, 'freezeFrames', {
      get() { return [...freezeFrames]; },
      enumerable: true,
    })
  }

  mixinPoseInDirection(camera, coreInterface);
  mixinStateUpdate(camera, () => coreInterface.call('getAugmentedRealityCameraPose', name), pose);
  mixinHmdMode(camera, name, coreInterface);

  return camera;

//======================================================================================================================
// PUBLIC INTERFACE
//======================================================================================================================

  /**
   * Activates the camera.
   * @returns {Promise} resolved on completion.
   * @memberOf! AugmentedRealityCamera#
   */
  function activate() {
    return Promise.resolve().then(() => {
      if (state === STATE_FRAME_VISIBLE && activeFreezeFrame) {
        return showFreezeFrame(activeFreezeFrame);
      } else {
        return coreInterface.call('activateStage', 'AR');
      }
    }).then(() => sharedCameraState.activeCamera = camera);
  }


  /**
   * Freezes camera feed and the scene.
   * @returns {Promise}
   * @memberOf! AugmentedRealityStage
   */
  function freeze() {
    return Promise.resolve().then(() => {
      switch (state) {
        case STATE_LIVE: return coreInterface.call('freeze').then(() => state = STATE_FROZEN);
        default: return;
      }
    });
  }

  /**
   * Unfreezes camera feed and the scene.
   * @returns {Promise}
   * @memberOf! AugmentedRealityStage
   */
  async function unfreeze() {
    switch (state) {
      case STATE_FRAME_VISIBLE: {
        await coreInterface.call('activateStage', 'AR');
        break;
      }
    }

    await coreInterface.call('unfreeze');
    state = STATE_LIVE;
  }

  /**
   * Freezes the camera feed and displays the given freezeFrame
   * @param {FreezeFrame} freezeFrame
   * @returns {Promise}
   * @memberOf! AugmentedRealityCamera#
   */
  async function showFreezeFrame(freezeFrame) {
    switch (state) {
      case STATE_LIVE: {
        await coreInterface.call('activateStage', 'Freeze');
        state = STATE_FRAME_VISIBLE;
        break;
      }
    }

    await coreInterface.call('showFreezeFrame', freezeFrame.name);
    activeFreezeFrame = freezeFrame;
  }

  /**
   * Downloads a previously saved freezeFrame from the server and creates a freezeFrame Object
   * @param name freezeFrame's name
   * @returns {Promise}
   * @memberOf! AugmentedRealityCamera#
   */
  async function downloadFreezeFrame(name) {
    const freezeFrame = createFreezeFrame({name, coreInterface});
    await coreInterface.call('downloadFreezeFrameFromServer', name)
    freezeFrames.push(freezeFrame);

    return freezeFrame;
  }

  /**
   * Freezes the camera feed and saves the current feed frame and camera pose as a new freezeFrame
   * @param {FreezeFrame} freezeFrame
   * @returns {Promise}
   * @memberOf! AugmentedRealityCamera#
   */
  function saveFreezeFrame() {
    return Promise.resolve().then(() => {
      switch (state) {
        case STATE_FROZEN: return Promise.resolve().then(() => {
          const name = 'freezeFrame__' + Date.now();

          return Promise.all([
            new Promise(resolve => coreInterface.once('freezeFrameTaken', resolve)),
            coreInterface.emit('saveFreezeFrame', name, false)
          ]).then(() => {
            const freezeFrame = createFreezeFrame({name, coreInterface});
            freezeFrames.push(freezeFrame);
            activeFreezeFrame = freezeFrame;
            return activeFreezeFrame;
          });
        });
        default: return activeFreezeFrame;
      }
    });
  }

  /**
   * Removes the given freeze frame.
   * @param {FreezeFrame} freezeFrame
   * @returns {Promise}
   * @memberOf! AugmentedRealityCamera#
   */
  function removeFreezeFrame(freezeFrame) {
    return Promise.resolve().then(() => {
      const index = freezeFrames.indexOf(freezeFrame);
      if (~index) {
        return coreInterface.call('removeFreezeFrame', freezeFrame.name).then(() => {
          freezeFrames.splice(index, 1);
          if (activeFreezeFrame === freezeFrame) {
            activeFreezeFrame = null;
            return unfreeze();
          }
        });
      }
    });
  }
}

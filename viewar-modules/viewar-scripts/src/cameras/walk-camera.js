import defaults from 'lodash/defaults';
import deepCopy from 'lodash/cloneDeep';

import { WALK_CAMERA_DEFAULTS } from '../constants';
import { mixinHmdMode, mixinPoseInDirection, mixinStateUpdate } from './camera-common';

//======================================================================================================================
/**
 * Uses camera sensors and joystick input to provide a first-person VR experience. Behaves like a first-person camera in
 * computer games (i.e. has no roll).
 *
 * @interface WalkCamera
 * @extends Camera
 */


/**
 * @private
 * @returns WalkCamera
 */
export function createWalkCamera(specification) {

  const { sharedCameraState, coreInterface } = specification;
  const { name, pose } = defaults(specification, deepCopy(WALK_CAMERA_DEFAULTS));
  let gyroscopeActive = true;

  const walkCamera = {
    activate,

    enableGyroscope,
    disableGyroscope,
    translate,
    rotate,

    get pose() { return deepCopy(pose); },
    get active() { return sharedCameraState.activeCamera === walkCamera; },
    get gyroscopeActive() { return gyroscopeActive; },
  };

  mixinPoseInDirection(walkCamera, coreInterface);
  mixinStateUpdate(walkCamera, () => coreInterface.call('getWalkCameraPose', name), pose);
  mixinHmdMode(walkCamera, name, coreInterface);

  return walkCamera;

//======================================================================================================================
// PUBLIC INTERFACE
//======================================================================================================================

  /**
   * Activates the camera.
   * @returns {Promise} resolved on completion.
   * @memberOf! WalkCamera#
   */
  function activate() {
    return coreInterface.call('activateStage', 'Experience').then(() => sharedCameraState.activeCamera = walkCamera);
  }

  /**
   * Enables the gyroscope for this camera.
   * @returns {Promise} resolved on completion.
   * @memberOf! WalkCamera#
   */
  function enableGyroscope() {
    return gyroscopeActive ? Promise.resolve() : coreInterface.call('enableGyroscopeForExperienceStage').then(() => gyroscopeActive = true);
  }

  /**
   * Disables the gyroscope for this camera.
   * @returns {Promise} resolved on completion.
   * @memberOf! WalkCamera#
   */
  function disableGyroscope() {
    return !gyroscopeActive ? Promise.resolve() : coreInterface.call('disableGyroscopeForExperienceStage').then(() => gyroscopeActive = false);
  }

  /**
   * Translates the camera using joystick input
   * @param {Vector3d} joystick axis values
   * @memberOf! WalkCamera#
   */
  function translate(controllerInputVector) {
    coreInterface.emit('translateCamera', controllerInputVector);
  }

  /**
   * Rotates the camera using joystick input
   * @param {Vector3d} joystick axis values
   * @memberOf! WalkCamera#
   */
  function rotate(controllerInputVector) {
    coreInterface.emit('rotateCamera', controllerInputVector);
  }

}

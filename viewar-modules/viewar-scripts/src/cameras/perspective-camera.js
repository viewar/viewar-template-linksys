import defaults from 'lodash/defaults';
import deepCopy from 'lodash/cloneDeep';

import { mixinHmdMode, mixinPoseInDirection, mixinStateUpdate } from './camera-common';
import { PERSPECTIVE_CAMERA_DEFAULTS } from '../constants';
import { sanitizeCameraInteraction, sanitizeCameraPose } from '../utils/utils';

//======================================================================================================================
/**
 * Uses camera sensors and joystick input to provide a first-person VR experience. Behaves like a first-person camera in
 * computer games (i.e. has no roll).
 *
 * @interface PerspectiveCamera
 * @extends Camera
 */

/**
 * @private
 * @returns PerspectiveCamera
 */
export function createPerspectiveCamera(specification) {
  const { sharedCameraState, coreInterface } = specification;
  const { name, pose, interaction } = defaults(specification, deepCopy(PERSPECTIVE_CAMERA_DEFAULTS));

  const perspectiveCamera = {
    activate,

    disableSceneInteraction,
    enableSceneInteraction,

    setInteraction,
    setPose,
    setBackgroundMaterial,

    zoomToFit,
    lookAtSceneCenter,

    get interaction() { return deepCopy(interaction); },
    get pose() { return deepCopy(pose); },
    get active() { return sharedCameraState.activeCamera === perspectiveCamera; },
  };

  mixinPoseInDirection(perspectiveCamera, coreInterface);
  mixinStateUpdate(perspectiveCamera, () => coreInterface.call('getGridCameraPose', name), pose);
  mixinHmdMode(perspectiveCamera, name, coreInterface);

  return perspectiveCamera;

//======================================================================================================================
// PUBLIC INTERFACE
//======================================================================================================================

  /**
   * Activates the camera.
   * @returns {Promise} resolved on completion.
   * @memberOf! PerspectiveCamera#
   */
  function activate() {
    return coreInterface.call('activateStage', 'Grid').then(() => sharedCameraState.activeCamera = perspectiveCamera);
  }

  /**
   * Turns off touch interaction with scene nodes. When off, touches only affect camera pose.
   * @returns {Promise} resolved on completion.
   * @memberOf! PerspectiveCamera#
   */
  function disableSceneInteraction() {
    return coreInterface.call('activateCameraManipulation');
  }

  /**
   * Turns on touch interaction with scene nodes.
   * @returns {Promise} resolved on completion.
   * @memberOf! PerspectiveCamera#
   */
  function enableSceneInteraction() {
    return coreInterface.call('deactivateCameraManipulation');
  }

  /**
   * Sets camera interaction.
   * @param {CameraInteraction} newInteraction
   * @returns {Promise} resolved on completion
   * @memberOf! PerspectiveCamera#
   */
  function setInteraction(newInteraction) {
    return Promise.resolve().then(() => {
      Object.assign(interaction, sanitizeCameraInteraction(newInteraction));
      return coreInterface.call('setGridCameraInteraction', name, interaction);
    });
  }

  /**
   * Sets camera pose.
   * @param {CameraPose} newPose
   * @returns {Promise} resolved on completion
   * @memberOf! PerspectiveCamera#
   */
  function setPose(newPose) {
    return perspectiveCamera.updatePose().then(() => {
      Object.assign(pose, sanitizeCameraPose(newPose));
      return coreInterface.call('setGridCameraPose', name, pose);
    });
  }

  /**
   * Sets the background material to a specific material id. This can only be done once,
   * @param {string} materialId
   * @returns {Promise} resolved on completion
   * @memberOf! PerspectiveCamera#
   */
  function setBackgroundMaterial(materialId) {
    return coreInterface.call('applyGridStageBackground', materialId);
  }

  /**
   * Turns and moves the camera so that all visible scene objects are in the viewport.
   * @returns {Promise} resolved on completion
   * @memberOf! PerspectiveCamera#
   */
  function zoomToFit() {
    return coreInterface.call('frameSceneContent', name).then(perspectiveCamera.updatePose);
  }

  /**
   * Turns camera towards the center of the current scene with respect to all visible scene objects.
   * @returns {Promise} resolved on completion
   * @memberOf! PerspectiveCamera#
   */
  function lookAtSceneCenter() {
    return coreInterface.call('getSceneBoundingBox', false).then(boundingBox => {
        let minX, maxX, minY, maxY, minZ, maxZ;
        for (let i = 0; i <= 7; i++) {
          let corner = boundingBox[i];
          (!minX || minX > corner.x) && (minX = corner.x);
          (!maxX || maxX < corner.x) && (maxX = corner.x);
          (!minY || minY > corner.y) && (minY = corner.y);
          (!maxY || maxY < corner.y) && (maxY = corner.y);
          (!minZ || minZ > corner.z) && (minZ = corner.z);
          (!maxZ || maxZ < corner.z) && (maxZ = corner.z);
        }
        return {
          x: (maxX + minX) / 2,
          y: (maxY + minY) / 2,
          z: (maxZ + minZ) / 2
        }
      })
      .then(sceneCenter => setPose({lookAt: sceneCenter}));
  }

}

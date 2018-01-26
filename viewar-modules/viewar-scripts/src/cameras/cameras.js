import { createAugmentedRealityCamera } from './augmented-reality-camera';
import { createPerspectiveCamera } from './perspective-camera';
import { createWalkCamera } from './walk-camera';
import { createFreezeFrame } from './freeze-frame';


/**
 * @namespace cameras
 */
const stageCameraMap = {
  /**
   * @member {AugmentedRealityCamera} augmentedRealityCamera
   * @memberof cameras#
   */
  'AR': {
    cameraName: 'augmentedRealityCamera',
    cameraFactory: createAugmentedRealityCamera,
  },

  /**
   * @member {PerspectiveCamera} perspectiveCamera
   * @memberof cameras#
   */
  'Grid': {
    cameraName: 'perspectiveCamera',
    cameraFactory: createPerspectiveCamera,
  },

  /**
   * @member {WalkCamera} walkCamera
   * @memberof cameras#
   */
  'Experience': {
    cameraName: 'walkCamera',
    cameraFactory: createWalkCamera,
  },
  'Freeze': null,
};

/**
 * @private
 * @returns {cameras}
 */
export function createCameras({coreInterface, freezeFrameInfo, stageList}) {
  const freezeFrames = stageList.includes('Freeze') && parseFreezeFrames(freezeFrameInfo, coreInterface);

  const sharedCameraState = {
    activeCamera: null,
  };

  const cameras = {};

  stageList
      .map(stageName => stageCameraMap[stageName])
      .filter(cameraInfo => !!cameraInfo)
      .forEach(({cameraName, cameraFactory}) => {
        cameras[cameraName] = cameraFactory({sharedCameraState, coreInterface, freezeFrames, createFreezeFrame});
        sharedCameraState.activeCamera = sharedCameraState.activeCamera || cameras[cameraName];
      });

  return cameras;
}

function parseFreezeFrames(freezeFrameInfo, coreInterface) {
  return freezeFrameInfo.map(({name}) => createFreezeFrame({name, coreInterface}));
}

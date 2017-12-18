//======================================================================================================================
// OLD CONSTANTS
//======================================================================================================================

export const SYNC_CALLS = [];
export const ASYNC_CALLS = [
  'prepareAppData',
  'prepareModelResources',
  'prepareResourcePack',
  'prepareModelImage',
  'prepareModelImageLarge',
  'prepareCategoryImage',
  'prepareCustomImage',
  'prepareMaterialImage',
  'prepareAllModelAssets',
  'prepareModelDescription',
  'applyMaterialOptions',
  'insertModel',
  'insertModelNew',
  'downloadFreezeFrameFromServer'
];

//======================================================================================================================
// NEW CONSTANTS
//======================================================================================================================

export const HTTPS_PROXY_URL = 'https://www.viewar.com/proxy2.php?url=';

export const MEDIUM_MEMORY_LIMIT = 1.5 * 1024 * 1024 * 1024;
export const LOW_MEMORY_LIMIT = 1 * 1024 * 1024 * 1024;

export const REFERENCE_POSE_SCALE_FACTOR = 10;

export const DEFAULT_SYNC = {
  pollInterval: 33,
  send: true,
  receive: true,
};

export const DEFAULT_SYNC_URL = 'https://api.viewar.com/sync/sync';

export const DEFAULT_API_CONFIG = {
  debug: false,
  checkForUpdate: false,
  waitForDebugger: false,
  fallbackBundleId: 'com.viewar.demo',
  exportToGlobal: true,
  logCoreCalls: false,
};

export const PATH_SEPARATOR = '::';

export const KEY_SEPARATOR = '_';

/**
 * @typedef Interaction
 * @type {object}
 * @property {string} manipulationPlane
 * @property {boolean} translation
 * @property {boolean} rotation
 * @property {boolean} scaling
 */
export const DEFAULT_INTERACTION = {
  manipulationPlane: 'horizontal',
  translation: true,
  rotation: true,
  scaling: false,
};

/**
 * @typedef Vector3d
 * @type {object}
 * @property {number} x
 * @property {number} y
 * @property {number} z
 */
export const DEFAULT_POSITION = { x: 0, y: 0, z: 0 };

/**
 * @typedef Quaternion
 * @type {object}
 * @property {number} w
 * @property {number} x
 * @property {number} y
 * @property {number} z
 */
export const DEFAULT_ORIENTATION = { w: 1, x: 0, y: 0, z: 0 };

export const DEFAULT_SCALE = { x: 1, y: 1, z: 1 };

/**
 * @typedef Pose
 * @type {object}
 * @property {Vector3d} position
 * @property {Quaternion} orientation
 * @property {Vector3d} scale
 */
export const DEFAULT_POSE = {
  position: DEFAULT_POSITION,
  orientation: DEFAULT_ORIENTATION,
  scale: DEFAULT_SCALE,
};

export const DEFAULT_VISIBLE = true;

/**
 * @typedef HighlightInfo
 * @type {object}
 * @property {string} type
 * @property {boolean} visible
 */
export const DEFAULT_HIGHLIGHT_INFO = {
  type: 'wireframe',
  visible: false
}


/**
 * @typedef ContainerInsertionParams
 * @type {object}
 * @property {Pose} pose
 * @property {Interaction} interaction
 * @property {boolean} visible
 * @property {string} type
 */

/**
 * @typedef ModelInsertionParams
 * @type {object}
 * @property {Pose} pose
 * @property {Interaction} interaction
 * @property {boolean} visible
 */


export const AR_CAMERA_DEFAULTS = {
  name: 'AugmentedRealityStageCamera',
  pose: {
    position: {x: 0, y: 0, z: 0},
    orientation: {w: 1, x: 0, y: 0, z: 0},
  },
};

export const WALK_CAMERA_DEFAULTS = {
  name: 'ExperienceStageCamera',
  pose: {
    position: {x: 0, y: 0, z: 0},
    orientation: {w:1, x: 0, y: 0, z: 0},
  },
};

export const PERSPECTIVE_CAMERA_DEFAULTS = {
  name: 'GridStageCamera',
  pose: {
    position: {x: 0, y: 4000, z: 4000},
    lookAt: {x: 0, y: 0, z: 0},
  },
  interaction: {
    "primaryDrag": "rotationAroundPivot",
    "secondaryDrag": "translationScreenSpace",
    "rotate": "disabled",
    "pinch": "translationDolly",
  },
};

export const MATERIAL_MODEL_FOREIGN_KEY = 'floor_wall_dummy';
export const MATERIAL_MODEL_FALLBACK_ID = '24068';
export const WALLOBJECT_MODEL_FALLBACK_IDS = ['39919', '39923', '39922', '39921', '39920'];

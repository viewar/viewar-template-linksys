import unique from 'lodash/uniq';

import { injector, RoomManager } from '../dependencies';
import { CoreInterface } from '../interface/core-interface';
import { ModelManager } from '../models/model-manager';
import { compileMaterialInfo, sanitizeModelDescription } from '../utils/utils';
import { MATERIAL_MODEL_FOREIGN_KEY, MATERIAL_MODEL_FALLBACK_ID, WALLOBJECT_MODEL_FALLBACK_IDS } from '../constants';

const ROOM_ID = 'RoomLayout';

injector.register(RoomManager, createRoomManager, {coreInterface: CoreInterface, modelManager: ModelManager});

export { RoomManager } from '../dependencies';

/**
 * Object responsible for handling 3D representations of indoor environments. This environments exists separately from
 * the rest of the scene.
 *
 * @namespace roomManager
 */


/**
 * @private
 * @returns {roomManager}
 */
export function createRoomManager({coreInterface, modelManager}) {
  let roomDescription = null;
  let model = null;
  let materialDescription = null;
  let wallObjectModels = null;
  let roomVisible = null;

  const roomManager = {
    init,

    /**
     * current environment visibility
     * @type {boolean}
     * @memberof roomManager#
     */
    get roomVisible() { return roomVisible },

    /**
     * wall and floor material description
     * @type {object|null}
     * @memberof roomManager#
     */
    get roomMaterialDescription() { return materialDescription },

    /**
     * environment description
     * @type {boolean}
     * @memberof roomManager#
     */
    get roomDescription() { return roomDescription; },

    /**
     * wall object models
     * @type {boolean}
     * @memberof roomManager#
     */
    get wallObjectModels() { return wallObjectModels; },

    addRoomToScene,
    removeRoomFromScene,
    setRoomVisible,
    initResources
  };

  return roomManager;

  async function init() {
    const treeModel = modelManager.findModelByForeignKey(MATERIAL_MODEL_FOREIGN_KEY);
    model = treeModel || await modelManager.getModelFromRepository(MATERIAL_MODEL_FALLBACK_ID);

    materialDescription = compileMaterialInfo(coreInterface,
        sanitizeModelDescription((await coreInterface.call('prepareModelDescription', model.id))).materialDescription);

    wallObjectModels = modelManager.models.filter(model => model.hasAnyTag(['window', 'door']));
    if (!wallObjectModels.length) {
      for (let id of WALLOBJECT_MODEL_FALLBACK_IDS) {
        wallObjectModels.push(await modelManager.getModelFromRepository(id));
      }
    };
  }

  /**
   * Prepares the necessary resources for wall and floor representation
   * @function
   * @returns {Promise} resolved when done
   * @memberof roomManager#
   */
  async function initResources() {
    await model.download();

    for (let wallObjectModel of wallObjectModels) {
      await wallObjectModel.downloadDescription();
    }
  }

  /**
   * Toggles indoor environment visibility.
   * @param {boolean} newVisible
   * @returns {Promise} resolved when done
   * @memberof roomManager#
   */
  function setRoomVisible(newVisible) {
    roomVisible = newVisible;
    return coreInterface.call('setNodeVisibility', ROOM_ID, !!newVisible);
  }

  /**
   * Instantiates the indoor environment according to the passed description. If a falsy value is passed the current
   * environment is removed from the scene.
   * @function
   * @param {object|null} newRoomDescription environment
   * @returns {Promise} resolved when instantiated
   * @memberof roomManager#
   */
  async function addRoomToScene(newRoomDescription = null) {
    if (!newRoomDescription) return removeRoomFromScene();

    const {Windows, Doors} = roomDescription = newRoomDescription;

    const modelIds = unique([...Windows, ...Doors].map(object => object.modelID));

    for (const modelId of modelIds) {
      const modelToDownload = await modelManager.getModelFromRepository(modelId);
      await modelToDownload.download();
    }
    await model.download();

    await coreInterface.call('parseRoomDescription', {...newRoomDescription, materialsModelId: model.id});
    await coreInterface.call('addRoomToScene');

    newRoomDescription.materialsModelId = model.id;
  }

  /**
   * Removes the indoor environment from the scene.
   * @returns {Promise} resolved when done
   * @memberof roomManager#
   */
  function removeRoomFromScene() {
    roomDescription = null;
    return coreInterface.call('removeRoomFromScene');
  }
}

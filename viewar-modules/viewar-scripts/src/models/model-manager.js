import mixinEmitter from 'component-emitter';
import toString from 'lodash/toString';

import { sanitizeModelDescription } from '../utils/utils';

import { createModel } from './model.js';
import { createCategory } from './category.js';

import { injector, $ } from '../dependencies';
import { ModelManager } from '../dependencies';
import { CoreInterface } from '../interface/core-interface';
import { MATERIAL_MODEL_FOREIGN_KEY, MATERIAL_MODEL_FALLBACK_ID, WALLOBJECT_MODEL_FALLBACK_IDS } from '../constants';

injector.register(ModelManager, specification => createModelManager({...specification, createModel, createCategory}),
    { coreInterface: CoreInterface });

export { ModelManager } from '../dependencies';

/**
 * Object responsible for handling models, model catalog and categories, and communication with the model repository.
 *
 * @namespace modelManager
 * @implements ProtectedEmitter
 */

/**
 * @private
 * @returns modelManager
 */
export function createModelManager(specification) {
  const { coreInterface, createModel, createCategory } = specification;

  const emitter = mixinEmitter({});
  const modelsById = {};
  const modelsByForeignKey = {};
  const treeModelsById = {};
  const downloadedModelsById = {};

  let rootCategory = null;
  let currentDownloadItem = null;

  const modelManager = {
    on: ::emitter.on,
    off: ::emitter.off,
    once: ::emitter.once,

    findModelById,
    findModelByForeignKey,

    getModelFromRepository,

    downloadAll,
    stopDownloadAll,

    /**
     * Collection of all models known to ViewAR instance. Includes all catalog models and any model downloaded from repository.
     * @member {Array<Model>} models
     * @memberof modelManager#
     */
    get models() { return Object.values(modelsById); },
    /**
     * Root category of the model catalog.
     * @member {Category} rootCategory
     * @memberof modelManager#
     */
    get rootCategory() { return rootCategory; },

    init,
  };

  return modelManager;

  function init(modelTree) {
    ['transferBegin', 'transferProgress', 'transferEnd'].forEach(eventName =>
        coreInterface.on(eventName, emitter.emit.bind(emitter, eventName)));

    rootCategory = parseModelTree(modelTree);
  }

  /** @private */
  function parseModelTree(node, walkCamera) {
    if (node.children) {
      const category = createCategory(node);
      node.children.forEach(child => $(category).addChild(parseModelTree(child)));
      return category;
    } else {
      const model = createModel(node, walkCamera);
      modelsById[model.id] = model;
      model.foreignKey && (modelsByForeignKey[model.foreignKey] = model);
      treeModelsById[model.id] = model;
      return model;
    }
  }

  /**
   * Downloads the full model description to the device's permanent storage.
   *
   * Once the promise is resolved the model is accessible via getModelById function. Successive calls to this function
   * will not trigger any further downloads unless the model is updated on the server in the meantime.
   * @method
   * @param {string} id - model id
   * @returns {Promise.<Model>} requested model
   * @memberof modelManager#
   */
  async function getModelFromRepository(id) {
    if (modelsById[id]) {
      await modelsById[id].downloadDescription();
      return modelsById[id];
    }

    const result = await coreInterface.call('prepareModelDescription', toString(id));
    const description = sanitizeModelDescription(result || {});

    if (description.id) {
      const { id, foreignKey } = description;
      const model = modelsById[id] || (foreignKey && modelsByForeignKey[foreignKey]) || createModel(description);
      await $(model).provideDescription(description);

      modelsById[id] = model;
      foreignKey && (modelsByForeignKey[foreignKey] = model);
      downloadedModelsById[id] = model;

      return model;
    } else {
      return null;
    }
  }

  /**
   * Retrieves the model with the given ID.
   * @param {string} id - ID of the requested model
   * @returns {Model} requested model if found; null otherwise
   * @memberof modelManager#
   */
  function findModelById(id) {
    return modelsById[id];
  }

  /**
   * Retrieves the model with the given foreign key.
   * @param {string} foreignKey - foreign key of the requested model
   * @returns {Model} requested model if found; null otherwise
   * @memberof modelManager#
   */
  function findModelByForeignKey(foreignKey) {
    return modelsByForeignKey[foreignKey];
  }

  /**
   * Begins the downloading all model assets assigned to the app. Can be interrupted at any time by calling
   * {@link stopDownloadAll}.
   * @function
   * @returns {Promise} fulfilled when completed.
   * @memberof modelManager#
   */
  async function downloadAll() {
    const handleModelDownloadProgress = emitter.emit.bind(emitter, 'downloadProgress');

    try {
      await appendRoomModels();

      const models = modelManager.models;
      const total = models.length;

      let current = -1;

      emitter.emit('downloadAllProgress', ++current, total, null);

      for (const model of models) {
        currentDownloadItem = model;
        emitter.emit('downloadAllProgress', ++current, total, currentDownloadItem);

        model.on('downloadProgress', handleModelDownloadProgress);
        await model.download();
        model.off('downloadProgress', handleModelDownloadProgress);
      }

      emitter.emit('downloadAllProgress', ++current, total, null);

    } finally {
      currentDownloadItem.off('downloadProgress', handleModelDownloadProgress);
      currentDownloadItem = null;
    }
  }

  /**
   * Interrupts the process of downloading all model assets.
   * @returns {Promise} fulfilled when completed.
   * @memberof modelManager
   */
  function stopDownloadAll() {
    return Promise.resolve().then(() => currentDownloadItem && currentDownloadItem.stopDownload());
  }

  /** @private */
  async function appendRoomModels() {
    const roomMaterialModel = modelManager.findModelByForeignKey(MATERIAL_MODEL_FOREIGN_KEY);
    if (!roomMaterialModel) {
      await modelManager.getModelFromRepository(MATERIAL_MODEL_FALLBACK_ID);
    }

    const wallObjectModels = modelManager.models.filter(model => model.hasAnyTag(['window', 'door']));
    if (!wallObjectModels.length) {
      for (const id of WALLOBJECT_MODEL_FALLBACK_IDS) {
        await modelManager.getModelFromRepository(id);
      }
    }
  }
}

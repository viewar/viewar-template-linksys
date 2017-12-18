import isObject from 'lodash/isObject';
import isEqual from 'lodash/isEqual';

import createEmitter from 'component-emitter';
import { createContainer } from './container';
import { updateScene } from './update-scene';

import { injector, Logger, $ } from '../dependencies'
import { SceneManager } from '../dependencies';
import { CoreInterface } from '../interface/core-interface';
import { ModelManager } from '../models/model-manager';
import { DEFAULT_POSE } from '../constants';

import ifCore from '../utils/if-core';

const SCENE_ID = 'DefaultLayer';

injector.register(SceneManager,
    specification => createSceneManager({...specification, createContainer}),
    {coreInterface: CoreInterface, modelManager: ModelManager, logger: Logger});

//======================================================================================================================

/**
 * Object responsible for scene content management.
 *
 * @namespace sceneManager
 * @implements ProtectedEmitter
 * @fires sceneManager#sceneObjectPoseChanged
 * @fires sceneManager#selectionChanged
 * @fires sceneManager#objectTouched
 */
export { SceneManager } from '../dependencies';
export function createSceneManager(specification) {
  const { coreInterface, modelManager, createContainer } = specification;

  let nodeRegistry = {};
  let sceneStateMutex = Promise.resolve();
  let scene = null;
  let selection = null;

  const sceneManager = createEmitter({
    init,

    insertContainer,
    insertModel,

    removeNode,

    select,
    clearSelection,

    findNodeById,

    clearScene,
    getSceneState,
    getSceneStateSafe,
    setSceneState,

    /**
     * Container representing the whole scene.
     * @type {Container}
     * @memberOf sceneManager#
     */
    get scene() { return scene; },
    /**
     * Currently selected scene node. Is null if no node is selected.
     * @type {SceneNode | null}
     * @memberOf sceneManager#
     */
    get selection() { return selection; },
  });

  return sceneManager;

//======================================================================================================================

  function init() {
    coreInterface.on('loadingBegin', sceneManager.emit.bind(sceneManager, 'loadingBegin'));
    coreInterface.on('loadingEnd', sceneManager.emit.bind(sceneManager, 'loadingEnd'));
    coreInterface.on('sceneObjectPoseChanged', sceneObjectPoseChangedHandler);
    coreInterface.on('selectionChanged', selectionChangedHandler);
    coreInterface.on('touchRay', touchRayHandler);
    coreInterface.on('objectTouched', objectTouchedHandler);
    coreInterface.on('objectSnapped', objectSnappedHandler);
    coreInterface.on('objectUnsnapped', objectUnsnappedHandler);
    coreInterface.on('backgroundRestoreStarted', backgroundRestoreStartedHandler);
    coreInterface.on('backgroundRestoreCompleted', backgroundRestoreCompletedHandler);

    scene = createScene();
    selection = null;
  }

//======================================================================================================================

  // FIXME: this is potentially leaky
  function createScene() {
    return (nodeRegistry[SCENE_ID] = createContainer({id: SCENE_ID, type: 'ungrouped'}));
  }

  /**
   * Clears the scene completely, removing every scene node apart from the scene itself. Also removes any rooms.
   * @returns {Promise} Promise that resolves when the scene is cleared.
   * @memberof sceneManager#
   */
  function clearScene() {
    return Promise.resolve()
        .then(() => coreInterface.call('clearScene'))
        .then(() => coreInterface.call('clearModelPreviews'))
        .then(() => {
          Object.values(nodeRegistry).map(node => node.model && $(node.model).unregisterAllInstances());
          nodeRegistry = {};
          scene = createScene();
          selection = null;
        });
  }

  /**
   * Selects the scene node. Selected nodes can be interacted with to change their pose.
   * @param {SceneNode} node scene node to be selected
   * @returns {Promise} Promise that resolves when the object is selected.
   * @memberof sceneManager#
   */
  function select(node) {
    return Promise.resolve().then(() => {
      if (node && findNodeById(node.id)) {
        coreInterface.off('selectionChanged', selectionChangedHandler);
        return coreInterface.call('selectObject', node.id)
            .then(() => coreInterface.on('selectionChanged', selectionChangedHandler))
            .then(() => selection = node);
      } else {
        return clearSelection();
      }
    });
  }

  /**
   * Deselects the currently selected object. Does nothing is nothing is selected.
   * @returns {Promise} Promise that resolves when the object is deselected.
   * @memberof sceneManager#
   */
  function clearSelection() {
    return Promise.resolve()
        .then(() => coreInterface.off('selectionChanged', selectionChangedHandler))
        .then(() => coreInterface.call('clearSelection'))
        .then(() => coreInterface.on('selectionChanged', selectionChangedHandler))
        .then(() => selection = null);
  }

  /**
   * Searches the scene for a node by id.
   * @param {string} id unique id of the scene node
   * @returns {SceneNode | null} scene node, if found; null otherwise.
   * @memberof sceneManager#
   */
  function findNodeById(id) {
    return nodeRegistry[id] || null;
  }

  /**
   * Inserts a container into the scene according to given parameters.
   * @param {ContainerInsertionParams} insertionParams insertion parameters for the container
   * @returns {Promise.<Container>} Promise that resolves with the inserted container.
   * @memberof sceneManager#
   */
  function insertContainer(insertionParams = {}) {
    const container = createContainer(insertionParams);

    nodeRegistry[container.id] = container;

    $(insertionParams.parent || scene).addChild(container);

    return $(container).insert();
  }

  /**
   * Inserts a model into the scene according to given parameters.
   * @function
   * @param {Model} model model to be inserted
   * @param {ModelInsertionParams} instanceProps properties of the new instance
   * @param {Object} insertionParams insertion setting for snapping
   * @returns {Promise.<ModelInstance|Configuration>} Promise that resolves with the inserted instance of the model.
   * @memberof sceneManager#
   */
  async function insertModel(model, instanceProps = {}, insertionParams = {}) {
    const { parent = scene } = instanceProps;
    await ifCore({
      "^5.3.0": () => Promise.resolve(),
      "*": () => model.download(),
    });
    const instance = await $(model).instantiate({...instanceProps, parent}, insertionParams);

    nodeRegistry[instance.id] = instance;

    (instance.children || []).forEach(child => nodeRegistry[child.id] = child);

    return instance;
  }

  /**
   * Removes given scene node. Attempting to remove the scene will throw an error.
   * @function
   * @param {SceneNode} node scene node to be removed
   * @returns {Promise} Promise that resolves when the object is removed.
   * @throws {Error} when attempting to remove the scene
   * @memberof sceneManager#
   */
  async function removeNode(node) {
    const actualNode = findNodeById(node.id);

    if (node === scene) {
      throw new Error('Scene Manager: cannot remove the scene!');
    } else if (actualNode && node.id === actualNode.id) {
      // await $(node).remove();
      await coreInterface.call('deleteInstance', node.id);    // TODO: $(node) not existing when restoring scene state!
      unregisterNodeRecursively(actualNode);                  // TODO: maybe this should be in the container?

    }
  }

  function unregisterNodeRecursively(object) {
    (object.children || []).map(unregisterNodeRecursively);
    object.model && $(object.model).unregisterInstance(object);
    $(object.parent).removeChild(object);
    delete nodeRegistry[object.id];
  }

  /**
   * Returns a serializable (JSON) representation of the whole scene, including the room description. Modifications of
   * the returned objects have no effect on the actual scene state.
   * @returns {Object} serializable representation of the scene.
   * @memberof sceneManager#
   */
  function getSceneState() {
    return JSON.parse(JSON.stringify(scene));
  }

  /**
   * Same as {@link sceneManager.getSceneState}, but returns a Promise that resolves with the scene state after all
   * scene updates have been made.
   * @returns {Promise.<Object>} Promise that resolves with serializable representation of the scene.
   * @memberof sceneManager#
   */
  function getSceneStateSafe() {
    const getSceneStateThunk = () => getSceneState();
    return sceneStateMutex = sceneStateMutex.then(getSceneStateThunk, getSceneStateThunk);
  }

  /**
   * Same as {@link sceneManager.getSceneState}, but returns a Promise that resolves with the scene state after all
   * scene updates have been made.
   * @function
   * @param {Object} newSceneState scene state, obtained using {@link sceneManager.getSceneState} or {@link sceneManager.getSceneStateSafe}
   * @returns {Promise} Promise that resolves once the scene is updated.
   * @memberof sceneManager#
   */
  async function setSceneState(newSceneState) {
    const emit = ::sceneManager.emit;
    const calls = {
      addNode,
      updateNode,
      moveNode,
      removeNode,
    };

    const updateSceneThunk = () => updateScene(getSceneState(), JSON.parse(JSON.stringify(newSceneState)), calls, emit);
    
    await (sceneStateMutex = sceneStateMutex.then(updateSceneThunk, updateSceneThunk));
  }

  async function addNode(parent, specification) {
    if (specification.children) {
      const container = await sceneManager.insertContainer({...specification, parent: findNodeById(parent.id)});

      for (const child of specification.children) {
        await addNode(container, child);
      }
    } else {
      const model = modelManager.findModelByForeignKey(specification.model) ||
          modelManager.findModelById(specification.model) ||
          await modelManager.getModelFromRepository(specification.model);

      specification.pose = specification.pose || DEFAULT_POSE;
      await ifCore({
        "^5.3.0": () => Promise.resolve(),
        "*": () => model.download(),
      });
      const instance = await $(model).instantiate({...specification, parent: findNodeById(parent.id)});

      nodeRegistry[instance.id] = instance;

      (instance.children || []).forEach(child => nodeRegistry[child.id] = child);
    }
  }

  function moveNode({node, parent}) {
    return findNodeById(node.id).setParent(findNodeById(parent.id));
  }

  function updateNode({oldSceneNode, newSceneNode}) {
    return Promise.resolve()
      .then(() => findNodeById(oldSceneNode.id))
      .then(node => Promise.all([
        isEqual(node.pose, newSceneNode.pose) || !newSceneNode.pose ? Promise.resolve() : node.setPose(newSceneNode.pose),
        isEqual(node.interaction, newSceneNode.interaction) || !newSceneNode.interaction ? Promise.resolve() : node.setInteraction(newSceneNode.interaction),
        isEqual(node.visible, newSceneNode.visible) || !newSceneNode.visible ? Promise.resolve() : node.setVisible(newSceneNode.visible),
        isEqual(node.propertyValues, newSceneNode.propertyValues) || !newSceneNode.propertyValues ? Promise.resolve() : node.setPropertyValues(newSceneNode.propertyValues),
      ]));
  }

//======================================================================================================================

  function sceneObjectPoseChangedHandler(nodeId, newPose) {
    const node = findNodeById(nodeId);

    if (node) {
      $(node).updatePose(newPose);
      sceneManager.emit('sceneObjectPoseChanged', node);
    }
  }

  function selectionChangedHandler(objectId) {
    selection = nodeRegistry[objectId];
    sceneManager.emit('selectionChanged', selection);
  }

  function touchRayHandler(touchResult) {
    sceneManager.emit('sceneTouched', touchResult);
  }

  function objectTouchedHandler(objectId, meshId) {
    sceneManager.emit('objectTouched', nodeRegistry[objectId], meshId);
  }

  function objectSnappedHandler(snappingInfoJson) {
    const snappingInfo = JSON.parse(snappingInfoJson);
    for (const snap of snappingInfo) {
      const object1 = findObjectById(snap.plug.id);
      const object2 = findObjectById(snap.socket.id);
      sceneManager.emit('objectSnapped', object1, object2);
    }
  }

  function objectUnsnappedHandler(snappingInfo) {
    sceneManager.emit('objectUnsnapped', JSON.parse(snappingInfo));
  }

  function backgroundRestoreStartedHandler() {
    sceneManager.emit('backgroundRestoreStarted');
  }

  function backgroundRestoreCompletedHandler() {
    sceneManager.emit('backgroundRestoreCompleted');
  }

}

/**
 * Event that is emitted when an scene node is moved manually
 *
 * @event sceneManager#sceneObjectPoseChanged
 * @param {SceneNode} node - node whose pose was changed
 */

/**
 * Event that is emitted when selection changes
 *
 * @event sceneManager#selectionChanged
 * @param {SceneNode|null} selection - new selection
 */

/**
 * Event that is emitted when an scene node is touched
 *
 * @event sceneManager#objectTouched
 * @param {SceneNode} node - node that was touched
 */

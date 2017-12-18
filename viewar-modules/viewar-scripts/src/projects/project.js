import defaults from 'lodash/defaults';
import deepCopy from 'lodash/cloneDeep';
import {generateId} from '../utils/utils.js';

import { injector } from '../dependencies';
import { AppUtils } from '../utils/app-utils';

import { SceneManager } from '../scene/scene-manager';
import { RoomManager } from '../scene/room-manager';
import { ProjectManager } from '../projects/project-manager';
import { LocalStorage } from '../storage/local';
import { CloudStorage } from '../storage/cloud';

const defaultSpecification = {
  name: 'Project',
  screenshotUrl: '',
  info: {},
  data: null,
  storedInCloud: false,
  storedLocally: false,
  modified: false,
  interval: null
};

/**
 * @interface Project
 */

export const createProject = injector.wireFactory(Project, {appUtils: AppUtils, sceneManager: SceneManager, roomManager: RoomManager, projectManager: ProjectManager, localStorage: LocalStorage, cloudStorage: CloudStorage});

export function Project(specification) {
  const { appUtils, sceneManager, projectManager, localStorage, cloudStorage, roomManager } = specification;

  let {
    id,
    name,
    info,
    data,
    timestamp,
    localScreenshotUrl,
    cloudScreenshotUrl,
    storedToCloud,
    storedLocally,
    modified,
    updated,
    storageKey,
  } = defaults(specification, defaultSpecification, {id: generateId(), timestamp: Date.now()});

  const project = {
    clone,
    loadState,
    removeFromCloud,
    removeLocally,
    saveState,
    storeLocally,
    storeToCloud,

    setRoomDescription,
    setSceneState,
    setTimestamp,
    setFlags,

    get id() { return id; },

    get name() { return name; },
    set name(newName) { name = newName; },

    get info() { return info; },
    set info(newInfo) { info = newInfo; },

    get modified() { return modified; },
    get screenshotUrl() { return projectManager.online ? cloudScreenshotUrl : localScreenshotUrl; },
    get cloudScreenshotUrl() { return cloudScreenshotUrl; },
    get localScreenshotUrl() { return localScreenshotUrl; },
    get storedLocally() { return storedLocally; },
    get storedToCloud() { return storedToCloud; },
    get updated() { return updated; },
    get timestamp() { return timestamp; }
  };

  return project;

//======================================================================================================================
// PUBLIC INTERFACE
//======================================================================================================================

  /**
   * Sets storage flags
   * @param {object} flags
   * @memberof Project#
   */
  function setFlags(flags) {
    Object.assign({storedToCloud, storedLocally, modified}, flags);
  }

  /**
   * Loads the scene state from the project
   * @method
   * @param {object} flags
   * @returns {Promise} resolved when done.
   * @memberof Project#
   */
  async function loadState() {
    data = data || await fetchData();
    modified = false;
    await roomManager.addRoomToScene(data.roomDescription);
    await sceneManager.setSceneState(data.sceneState);
  }

  /**
   * Saves the scene state into the project
   * @param {string} url screenshot URL
   * @memberof Project#
   */
  function saveState(url = '') {
    data = data || {};
    data.sceneState = sceneManager.getSceneState();
    data.roomDescription = roomManager.roomDescription;
    localScreenshotUrl = url;
    timestamp = Date.now();
    modified = true;
  }

  /**
   * Stores project to local permanent storage
   * @method
   * @returns {Promise} resolved when done.
   * @memberof Project#
   */
  async function storeLocally() { 
    modified = false;

    data = data || await fetchData();
    storedLocally = true;

    if (projectManager.online && cloudScreenshotUrl) {
      localScreenshotUrl = '/CustomImages/' + id + '_screenshot.png';
      await appUtils.prepareCustomImage(id + '_screenshot.png', cloudScreenshotUrl);
    }

    projectManager.projects.local[id] = project;
    await projectManager.updateLocalProjectIndex();
    await localStorage.write(`/Projects/${id}.json`,
        JSON.stringify({id, name, info, timestamp, data, localScreenshotUrl, cloudScreenshotUrl}));

    return true;
  }

  /**
   * Removes project from local permanent storage
   * @method
   * @returns {Promise} resolved when done.
   * @memberof Project#
   */
  async function removeLocally() {
    if (storedLocally) {
      storedLocally = false;
      await projectManager.updateLocalProjectIndex();
      await localStorage.remove(`/Projects/${id}.json`);

      return true;
    }

    return false;
  }

  /**
   * Stores project to cloud storage
   * @method
   * @returns {Promise} resolved when done.
   * @memberof Project#
   */
  async function storeToCloud() {
    modified = false;
    storedToCloud = true;

    if (localScreenshotUrl) {
      let fields = {
        storage: cloudStorage.storageKey
      };
      fields[id] = '@' + localScreenshotUrl;
      await appUtils.httpPost('https://dev2.viewar.com/appstorage/uploadfiles', fields);
      cloudScreenshotUrl = cloudStorage.createUrl('downloadfile') + '/file:' + id;
    }

    projectManager.projects.cloud[id] = project;
    await projectManager.updateCloudProjectIndex();
    await cloudStorage.write(`/public/Projects/${id}.json`,
        JSON.stringify({id, name, info, timestamp, data, localScreenshotUrl, cloudScreenshotUrl})); 

    return true;
  }

  /**
   * Removes project from cloud storage
   * @method
   * @returns {Promise} resolved when done.
   * @memberof Project#
   */
  async function removeFromCloud() {
    if (storedToCloud) {
      storedToCloud = false;
      await projectManager.updateCloudProjectIndex();
      await cloudStorage.remove(`/public/Projects/${id}.json`);

      return true;
    }

    return false;
  }

  /**
   * Creates a copy of this project and all data stored within. The copy is not automatically stored anywhere.
   * @returns {Project}
   * @memberof Project#
   */
  function clone(newSpecification) {
    return createProject(Object.assign(newSpecification, deepCopy(specification), {id: generateId()}));
  }

//======================================================================================================================
// PRIVILEGED INTERFACE
//======================================================================================================================

  function setSceneState(newSceneState) {
    data.sceneState = newSceneState;
    updated = true;
  }

  function setRoomDescription(newRoomDescription) {
    data.roomDescription = newRoomDescription;
    updated = true;
  }

  function setTimestamp(newTimestamp) {
    timestamp = newTimestamp;
    updated = true;
  }

//======================================================================================================================
// PRIVATE FUNCTIONS
//======================================================================================================================

  /**
   * @private
   */
  async function fetchData() {
    let provider = null;
    if (storedLocally) {
      provider = localStorage;
      return data = (await provider.read(`/Projects/${id}.json`)).data;
    } else if (storedToCloud) {
      provider = cloudStorage;
      return data = (await provider.read(`/public/Projects/${id}.json`)).data;
    } else {
      return data;
    }
  }

}

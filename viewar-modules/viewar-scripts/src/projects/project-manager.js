import { ProjectManager } from '../dependencies';

import { createProject } from './project.js';

import { injector, AuthenticationManager } from '../dependencies';
import { LocalStorage } from '../storage/local';
import { CloudStorage } from '../storage/cloud';

injector.register(ProjectManager, createProjectManager, {
  localStorage: LocalStorage,
  cloudStorage: CloudStorage,
  authenticationManager: AuthenticationManager,
});

/**
 * Object responsible for handling projects. Projects are snapshots of the current state in the scene, which can be stored
 * locally or in the cloud and loaded at a later moment
 *
 * @namespace projectManager
 */

/**
 * @private
 * @returns {projectManager}
 */
export { ProjectManager } from '../dependencies';
export function createProjectManager({ authenticationManager, localStorage, cloudStorage }) {

  let usePublicCloudIndex = false;

  const getCloudIndexPath = () => usePublicCloudIndex ?
      `/public/Projects/index.json` :
      `/${authenticationManager.token}/Projects/index.json`;

  const projects = {
    local: {},
    cloud: {},
    all: {}
  };

  let online = true;

  const projectManager = {
    createNewProject,
    updateCloudIndex,
    updateLocalProjectIndex,
    updateCloudProjectIndex,
    fetchProjectById,
    init,

    /**
     * Collection of all user' s projects. Includes projects stored locally and in the cloud.
     * @type {{local: Array<Project>, cloud: Array<Project>, all: Array<Project>}}
     * @memberof projectManager#
     */
    get projects() { return projects; },

    /**
     * Status about internet connection of the user.
     * @type {boolean}
     * @memberof projectManager#
     */
    get online() { return online; },

    get usePublicCloudIndex() { return usePublicCloudIndex; },
    set usePublicCloudIndex(newValue) { usePublicCloudIndex = newValue; },
  };

  return projectManager;

//======================================================================================================================
// INITIALIZATION
//======================================================================================================================

  /**
   * Downloads projects from the cloud if online and loads projects from local disk.
   * @memberof projectManager#
   */
  function init() {

    Object.assign(projects,
    {
      local: {},
      cloud: {},
      all: {}
    });

    return Promise.all([
      readLocalProjectIndex(),
      readCloudProjectIndex(),
    ]);
  }

//======================================================================================================================
// PUBLIC INTERFACE
//======================================================================================================================

  /**
   * Creates a new project
   * @param {Object} specification - specification of the project (name, screenshotUrl, info, data)
   * @returns {Project} the created project
   * @memberof projectManager#
   */
  function createNewProject(specification) {
    return createProject(specification);
  }

  /**
   * Fetches projects from the cloud
   * @returns {boolean} online status of the user
   * @memberof projectManager#
   */
  function updateCloudIndex() {
    return readCloudProjectIndex();
  }

  /**
   * Fetches a specific project from the cloud
   * @returns {Project} requested Project if found; null otherwise
   * @memberof projectManager#
   */
  async function fetchProjectById(id) {
    try {
      return await cloudStorage.read(`/public/Projects/${id}.json`);
    } catch (error) {
      return null;
    }
  }

//======================================================================================================================
// PRIVILEGED INTERFACE
//======================================================================================================================

  async function updateCloudProjectIndex() {
    if (!usePublicCloudIndex && !authenticationManager.token) return false;

    const backup = JSON.parse(JSON.stringify(projects.cloud));
    let projectIndex = {};

    try {
      projectIndex = (await cloudStorage.read(getCloudIndexPath())) || {};
      online = true;
    } catch (error) {
      online = false;
    }

    Object.values(projects.cloud).forEach(function (project) {
      let {id, name, info, timestamp, localScreenshotUrl, cloudScreenshotUrl, storedToCloud, storedLocally} = project;

      if (storedToCloud) {
        projectIndex[project.id] = {id, name, info, timestamp, localScreenshotUrl, cloudScreenshotUrl};
      } else {
        delete projects.cloud[project.id];
        delete projectIndex[project.id];
      }
    });

    try {
      await cloudStorage.write(getCloudIndexPath(), JSON.stringify(projectIndex));
      return online = true;
    } catch (error) {
      projects.cloud = backup;
      return online = false;
    }
  }

  /** @private */
  async function readCloudProjectIndex() {
    if (!usePublicCloudIndex && !authenticationManager.token) return false;

    let projectIndex = {};
    try {
      projectIndex = (await cloudStorage.read(getCloudIndexPath())) || {};
      online = true;

    } catch (error) {
      online = false;
    }

    const flags = {
      storedToCloud: true,
    };

    Object.keys(projectIndex).forEach(function (projectId) {
      const project = projects.all[projectId] = projects.all[projectId] ||
          createNewProject(Object.assign(flags, projectIndex[projectId]));

      project.setFlags(flags);
      projects.cloud[projectId] = project;
    });

    return online;
  }

  async function updateLocalProjectIndex() {
    const backup = JSON.parse(JSON.stringify(projects.local));

    let projectIndex = {};
    try {
      projectIndex = (await localStorage.read('/Projects/index.json')) || {};
    } catch (error) {
      projectIndex = {};
    }

    Object.values(projects.local).forEach(function (project) {
      let {id, name, info, timestamp, localScreenshotUrl, cloudScreenshotUrl, storedToCloud, storedLocally} = project;

      if (storedLocally) {
        projectIndex[project.id] = {id, name, info, timestamp, localScreenshotUrl, cloudScreenshotUrl};
      } else {
        delete projects.local[project.id];
        delete projectIndex[project.id];
      }
    });

    try {
      await localStorage.write('/Projects/index.json', JSON.stringify(projectIndex));
      return true;
    } catch (error) {
      projects.local = backup;
      return false;
    }
  }

  /** @private */
  async function readLocalProjectIndex() {
    let projectIndex = {};
    try {
      projectIndex = (await localStorage.read(`/Projects/index.json`)) || {};
      online = true;

    } catch (error) {
      online = false;
    }

    const flags = {
      storedLocally: true,
    };

    Object.keys(projectIndex).forEach(function (projectId) {
      const project = projects.all[projectId] = projects.all[projectId] ||
          createNewProject(Object.assign(flags, projectIndex[projectId]));

      project.setFlags(flags);
      projects.local[projectId] = project;
    });

    return online;
  }

}

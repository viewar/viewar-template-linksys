import { satisfies } from 'semver';
import defaults from 'lodash/defaults';
import deepCopy from 'lodash/cloneDeep';

import packageInfo from '../package.json';

import { waitForDebugger, waitForAppUpdate, waitForSwitchBundleId, showFakedBundleOverlay } from './utils/ui';
import { parseScenarioConfig, sanitizeModelTree } from './utils/utils';

import { DEFAULT_API_CONFIG, LOW_MEMORY_LIMIT, MEDIUM_MEMORY_LIMIT } from './constants';

import { injector, Date, Window, Config, AppConfig } from './dependencies';
import { AuthenticationManager } from './authentication/authentication-manager';
import { Http } from './utils/http';
import { CoreInterface } from './interface/core-interface';
import { AppUtils } from './utils/app-utils';
import { SceneManager } from './scene/scene-manager';
import { ModelManager } from './models/model-manager';
import { LocalStorage } from './storage/local';
import { CloudStorage } from './storage/cloud';
import { ProjectManager } from './projects/project-manager';
import { SyncManager } from './sync/sync-manager';
import { Logger } from './utils/logger';
import { RoomManager } from './scene/room-manager';


import { createScreenshotManager } from './screenshots/screenshot-manager';
import { createTrackers } from './tracking/trackers';
import { createCameras } from './cameras/cameras';

import versionInfo from './utils/version-info';

Promise.config({
  longStackTraces: false,
  cancellation: true,
});

const viewarApi = {
  init
};

async function init(apiConfig, global = window) {
  if (this.version) {
    return this;
  }

  if (apiConfig.waitForDebugger) {
    await waitForDebugger(global);
  }

  const config = defaults(deepCopy(DEFAULT_API_CONFIG), apiConfig);
  injector.register(Config, () => config);
  injector.register(Window, () => global);
  injector.register(Date, () => global.Date);
  injector.register(AppConfig, () => createDummyAppConfig());

  const startTime = injector.resolve(Date).now();

  const logger = injector.resolve(Logger);

  logger.info(`ViewAR API: v${packageInfo.version}`);
  logger.info(`ViewAR API: Initializing...`);

//======================================================================================================================


  const coreInterface = injector.resolve(CoreInterface);

  await coreInterface.initialize();

  let appConfig = injector.resolve(AppConfig, () => appConfig);
  await appConfig.init(coreInterface);

  const version = appConfig.version;

  logger.info(`ViewAR API: Using ViewAR SDK Core v${version.core}`);

  if (!satisfies(version.core, packageInfo.coreVersion)) {
    logger.error(`ViewAR API: ERROR! The core version ${version.core} is not compatible with the required core version ${packageInfo.coreVersion}!`);
  }

//======================================================================================================================

  if (appConfig.fakedBundle && coreInterface.platform !== 'iOS') {
    await waitForSwitchBundleId(global, coreInterface, appConfig.appId);
    showFakedBundleOverlay(global);
  }

  if (appConfig.update) {
    await waitForAppUpdate(global, appConfig.update);
  }

//======================================================================================================================

  const cameras = createCameras({coreInterface, ...appConfig });
  const trackers = createTrackers({trackerList: appConfig.trackerList});
  const screenshotManager = createScreenshotManager();

  const api = Object.assign(this, {
    coreInterface,
    cameras,
    trackers,
    screenshotManager,
    authenticationManager: injector.resolve(AuthenticationManager),

    logger: injector.resolve(Logger),
    http: injector.resolve(Http),
    appUtils: injector.resolve(AppUtils),
    modelManager: injector.resolve(ModelManager),
    sceneManager: injector.resolve(SceneManager),
    roomManager: injector.resolve(RoomManager),
    storage: {
      local: injector.resolve(LocalStorage),
      cloud: injector.resolve(CloudStorage),
    },
    projectManager: injector.resolve(ProjectManager),
    syncManager: injector.resolve(SyncManager),

    version: version.api,
    coreVersion: version.core,
    appConfig,
  });

  api.modelManager.init(appConfig.modelTree);
  api.sceneManager.init();

  await api.projectManager.init();

  if (coreInterface.platform !== 'UWP') {
    await api.roomManager.init();
  }

  if (appConfig.deviceRam < LOW_MEMORY_LIMIT) {
    await api.appUtils.setTextureQuality('low', false);
  } else if (appConfig.deviceRam < MEDIUM_MEMORY_LIMIT) {
    await api.appUtils.setTextureQuality('medium', false);
  }

  if (coreInterface.platform === 'Android') {
    api.cameras.walkCamera && await api.cameras.walkCamera.disableGyroscope();
  }

  if (config.exportToGlobal) {
    global.api = api;
  }

  logger.info(`ViewAR API: Initialized. (Loading time: ${(injector.resolve(Date).now() - startTime).toFixed(0)}ms)`);

  return api;
}

function fetchAppConfig({version}, coreInterface) {
  return Promise.all([
      coreInterface.call('getScenarioConfig').then(parseScenarioConfig),
      coreInterface.call('prepareAppData').then(parseModelTree),
      coreInterface.call('getDeviceRamInfo').then(({total}) => total),
      coreInterface.call('getFreezeFrameList'),
      coreInterface.call('getSDKVersionNumber'),
  ]).then(([appConfig, modelTree, deviceRam, freezeFrameInfo, coreVersion]) => ({
    ...appConfig,
    modelTree,
    deviceRam,
    freezeFrameInfo,
    version: Object.assign(versionInfo, {
      app: appConfig.version,
      api: version,
      core: coreVersion,
    }),
  }));
}

function parseModelTree({tree}) {
  return sanitizeModelTree({children: tree, data: {}, id: 'Root', name: 'Root Category'});
}



function createDummyAppConfig() {
  let appConfig = {
    init: async(coreInterface) => {
      let initializedAppConfig = await fetchAppConfig(packageInfo, coreInterface);
      Object.assign(appConfig, initializedAppConfig);
    }
  };

  return appConfig;
}

export default viewarApi;

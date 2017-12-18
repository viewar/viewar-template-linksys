import { generateId } from '../../utils/utils.js';
import packageJson from '../../../package.json';

import { injector, Config, AppConfig } from '../../dependencies';

export default injector.wireFactory(addMockCalls, {config: Config, appConfig: AppConfig});

var customFiles = {};
var customStageBackgrounds = {};
var freezeFrames = [{name:"freezeFrame1", thumbPath:""}];
var structureConnected = false;
var structureBattery = true;
var online = true;
var currentMode;

var downloadCache = {};
var customImages = {};

var selectedId = null;
var insertedModelImages = new Map();
var insertedContainers = new Map();
var insertedObj = {};
var host = 'https://api.viewar.com';      // Most of the time appConfig.host is used, but this is for the initalization where appConfig is not resolved yet.
var modelContainerDisplayBlacklist = ['30387', 'DefaultLayer'];

function addMockCalls({window, coreInterface, config: {appId, fallbackBundleId}, appConfig}) {

  const document = window.document;

  var authKey = '';

  var meshScanInProgress = false;
  var meshVertices = 0;

  addCustomStageBackgrounds(customStageBackgrounds);
  addCustomFiles(customFiles);
  addMockEvents(coreInterface, appConfig, customStageBackgrounds);
  addSimulatorPanel(coreInterface);
  showBackground('Grid');

  coreInterface.customImages = customImages;
  coreInterface.mock = {
    activateStage,
    switchToMode,
    getDeviceRamInfo,
    getScenarioConfig,
    readCustomFile,
    saveCustomFile,
    getSDKVersionNumber,
    getInstancePose,
    getCameraPose,
    getGridCameraPose,
    getCameraPosition,
    getCameraOrientation,
    getFreezeFrameList,
    getCameraLookAt,
    getColorAtCoordinates,
    getSceneBoundingBox,
    customTrackingCommand,
    deleteInstance,
    pluginCommand,
    saveScreenshotToSubfolder,
    selectObject,
    clearSelection,
    colorizeMesh,
    fillMeshHoles,
    getMeshList,
    setAuthKey,
    getAuthKey,
    freeze,
    unfreeze,
    clearScene,
    startVideo,
    startAnimation,
    setObjectInteraction,
    insertContainer,
    showFreezeFrame,
    getPoseInViewingDirection,
    startMeshScan,
    stopMeshScan,
    resetMeshScan,
    httpPost,
    adjustContainerCenterToContent,
    setNodeVisibility,
    scriptingLayerReady,
  };

//======================================================================================================================
// MOCK CALLS
//======================================================================================================================

  function scriptingLayerReady() {
    return Promise.resolve({});
  }

  function activateStage(stage) {
    showStageText(null);

    var appContainer = document.getElementById('viewar_app') || document.getElementsByTagName('body')[0];
    var background = customStageBackgrounds[stage];
    if (background) {
      var existing = document.getElementById('backgroundElement');
      var backgroundElement = existing || document.createElement('div');
      if (!existing) {
        backgroundElement.id = 'backgroundElement';
        Object.assign(backgroundElement.style, {
          position: 'absolute',
          width: '100%',
          height: '100%',
          zIndex: '-1000000',
          backgroundSize: 'cover',
          left: '0',
          top: '0'
        });
        
        backgroundElement.addEventListener('click', () => coreInterface.emit('selectionChanged', null));
        selectModelImage(null);
        appContainer.appendChild(backgroundElement);
      }
      backgroundElement.style.background = background;
    }

    return Promise.delay(33);
  }

  function getCameraOrientation() {
    return Promise.resolve(JSON.stringify({
      x: 0, y: 0
    }));
  }

  function switchToMode(mode) {
    currentMode = mode;
    return Promise.delay(33);
  }

  function getDeviceRamInfo() {
    return Promise.resolve(JSON.stringify({
      total: 2 * 1024 * 1024 * 1024,
      avail: 1 * 1024 * 1024 * 1024
    }));
  }

  function getScenarioConfig() {
    const bundleId = window.bundleIdentifier || window.bundleidentifier || appId || fallbackBundleId;
    const fallbackId = appId;

    return getData(`${host}/api20/configuration/bundleidentifier:${bundleId}/fakeversion:100`)
        .then(data => data || getData(`${host}/api20/configuration/bundleidentifier:${fallbackId}/fakeversion:100`))
        .catch(() => getData(`${host}/api20/configuration/bundleidentifier:${fallbackId}/fakeversion:100`));
  }

  function readCustomFile(fileName) {
    return Promise.resolve(customFiles[fileName]);
  }

  function saveCustomFile(fileName, content, format) {
    return Promise.resolve().then(function () {
      switch (format) {
        case 'json':
          customFiles[fileName] = JSON.stringify(content);
          break;
        default:
          customFiles[fileName] = content;
          break;
      }
    });
  }

  function getPoseInViewingDirection() {
    return Promise.resolve(JSON.stringify({
      position: {x: 0, y: 0, z: 0},
      orientation: {w: 1, x: 0, y: 0, z: 0},
      scale: {x: 1, y: 1, z: 1}
    }));
  }

  function getSDKVersionNumber() {
    return Promise.resolve(packageJson.coreVersion.substring(1));
  }

  function getInstancePose() {
    return Promise.resolve(JSON.stringify({
      position: {x: 0, y: 0, z: 0},
      orientation: {w: 1, x: 0, y: 0, z: 0},
      scale: {x: 1, y: 1, z: 1}
    }));
  }

  function getCameraPose() {
    return Promise.resolve(JSON.stringify({
      position: {x: 0, y: 0, z: 0},
      lookAt: {x: 0, y: 0, z: 1}
    }));
  }

  function getGridCameraPose() {
    return Promise.resolve(JSON.stringify({
      position: {x: 0, y: 0, z: 0},
      lookAt: {x: 0, y: 0, z: 1}
    }));
  }

  function getCameraPosition() {
    return Promise.resolve(JSON.stringify({
      x: 0, y: 0, z: 0
    }));
  }


  function getCameraLookAt() {
    return Promise.resolve(JSON.stringify({
      x: 0, y: 0, z: 1
    }));
  }

  function getFreezeFrameList() {
    return Promise.resolve(JSON.stringify(freezeFrames));
  }

  function getColorAtCoordinates(coordinates, radius) {
    return Promise.resolve('[128, 0, 0]');
  }

  function getSceneBoundingBox(includeInvisible) {
    return Promise.resolve([
      {x: 0, y: 0, z: 0},
      {x: 1, y: 0, z: 0},
      {x: 1, y: 0, z: 1},
      {x: 1, y: 1, z: 0},
      {x: 1, y: 1, z: 1},
      {x: 0, y: 1, z: 0},
      {x: 0, y: 1, z: 1},
      {x: 0, y: 0, z: 1}
    ]);
  }

  function customTrackingCommand(providerName, command, params) {
    var retParams = {};
    if (providerName == 'Structure') {
      switch (command) {
        case 'getStatus':
          retParams.sensorBatteryLevel = structureBattery ? 0.73 : 0;
          retParams.sensorConnected = structureConnected;
          retParams.isStreaming = true;
          break;
      }
    } else if (providerName === 'Vuforia' || providerName === 'Qualcomm') {
      switch (command) {
        case 'captureUserTarget':
          const info = {
            status: 'userTargetCaptured'
          };
          setTimeout(() => coreInterface.emit('customTrackingInfo', providerName, JSON.stringify(info)), 33);
          break;
        case 'removeUserTarget':
          break;
      }
    }
    return Promise.resolve(JSON.stringify(retParams));
  }

  function deleteInstance(instanceId) {
    setTimeout(() => coreInterface.emit('selectionChanged', null), 33);
    selectModelImage(null);
    var modelImage = insertedModelImages.get(instanceId);
    if (modelImage) {
      const modelContainer = modelImage.parentNode;
      modelContainer.removeChild(modelImage);
      if (modelContainer.children.length <= 1) {
        modelContainer.style.display = 'none';
      }
    }

    var container = insertedContainers.get(instanceId) || [];
    container.forEach(function(childId) {
      var child = insertedModelImages.get(childId);
      if (child) child.parentNode.removeChild(child);
      insertedModelImages.delete(childId);
      delete insertedObj[childId];
    });

    delete insertedObj[instanceId];
    insertedContainers.delete(instanceId);
    return Promise.resolve(insertedModelImages.delete(instanceId));
  }

  function pluginCommand(pluginName, commandName, params) {
    switch (pluginName) {
      case 'LCAG':
        switch(commandName) {
          case 'measureBoxes':
            setTimeout(() => coreInterface.emit('boxMeasurement', '{"boxes":[{"id":1,"pose":{"position":{"x":0,"y":0,"z":0},"orientation":{"w":1,"x":0,"y":0,"z":0}},"dimensions":{"x":12.3,"y":12.7,"z":10},"volumeInCubicMeters":1112.5,"faces":[{"id":"front","confidence":0.9,"numberOfPoints":9881,"orientation":"vertical","corners":[{"x":0,"y":0,"z":0}]}]}]}'), 16);
            break;
        }
        break;
    }

    return Promise.resolve('{}');
  }

  function selectObject(id) {
    setTimeout(() => coreInterface.emit('selectionChanged', id), 16);
    selectModelImage(id);
    return Promise.resolve();
  }

  function clearSelection() {
    setTimeout(() => coreInterface.emit('selectionChanged', null), 16);
    selectModelImage(null);
    return Promise.resolve();
  }

  function colorizeMesh() {
    var jobId = generateId();
    for (var i = 0; i<100; i+=5) {
      (function (count) {
        var json = {
          type: 'skinningProgress',
          data: count
        };
        setTimeout(() => coreInterface.emit('customTrackingInfo', jobId, JSON.stringify(json)), 10 * count);
      })(i);
    }
    setTimeout(() => coreInterface.emit('customTrackingInfo', jobId, '{"type":"skinningFinished"}'), 10 * 101);
    return Promise.resolve(jobId);
  }

  function fillMeshHoles() {
    var jobId = generateId();
    for (var i = 0; i<100; i+=5) {
      (function (count) {
        var json = {
          type: 'holeFillProgress',
          data: count
        };
        setTimeout(() => coreInterface.emit('customTrackingInfo', jobId, JSON.stringify(json)), 10 * count);
      })(i);
    }
    setTimeout(() => coreInterface.emit('customTrackingInfo', jobId, '{"type":"holeFillFinished"}'), 10 * 101);
    return Promise.resolve(jobId);
  }

  function getMeshList() {
    var meshList = [];

    if (meshVertices) {
      meshList.push({
        id: 'Scan',
        name: 'Scan',
        numVertices: meshVertices,
        material: 'viewar_xray'
      });
    }

    return Promise.resolve(JSON.stringify(meshList));
  }

  function setAuthKey(key) {
    authKey = key;
    return Promise.resolve();
  }

  function getAuthKey() {
    return Promise.resolve(JSON.stringify(authKey));
  }

  function freeze() {
    showStageText('Freeze');

    return Promise.resolve();
  }

  function unfreeze() {
    showStageText(null);
    return Promise.resolve();
  }

  function clearScene() {
    insertedModelImages.forEach(function(modelImage) {
      modelImage.parentNode.removeChild(modelImage);
    });
    insertedModelImages.clear();
    insertedObj = {};
    insertedContainers.clear();
    coreInterface.emit('selectionChanged', null);
    return Promise.resolve(true);
  }

  function startVideo(instanceId, videoName, timeInMs, loop) {
    if (!loop) {
      setTimeout(() => coreInterface.emit('videoEnded', videoName, instanceId), 3000);
    }
    return Promise.resolve();
  }

  function startAnimation(instanceId, animationName, timeInMs, loop) {
    if (!loop) {
      setTimeout(() => coreInterface.emit('animationEnded', animationName, instanceId), 3000);
    }
    return Promise.resolve();
  }

  function saveScreenshotToSubfolder(subfolder) {
    return Promise.resolve(`${appConfig.host}/images_new/ar_background.png`);
  }

  function insertContainer(containerId, assemblyPart) {
    const { targetContainerId, shouldBeGrouped} = JSON.parse(assemblyPart);
    insertedContainers.set(containerId, []);
    insertedObj[containerId] = { id: containerId,  shouldBeGrouped };
    insertedObj[containerId].parent = targetContainerId ? targetContainerId : undefined;
    insertContainerImage(containerId);
    return Promise.resolve();
  }

  function showFreezeFrame(freezeFrame) {
    showStageText('Freeze');
    showBackground('Freeze');
    return Promise.resolve();
  }

  function startMeshScan() {
    meshScanInProgress = true;
    meshVertices += Math.floor(Math.random() * 101);

    var scan = function() {
      if (meshScanInProgress) {
        setTimeout(scan, 500);
        meshVertices += Math.floor(Math.random() * 101);
      }
    };
    scan();

    return Promise.resolve();
  }

  function stopMeshScan() {
    meshScanInProgress = false;
    return Promise.resolve();
  }

  function resetMeshScan() {
    meshVertices = 0;
    return Promise.resolve();
  }

  function httpPost(url, fields) {
    var jobId = generateId();
    setTimeout(() => coreInterface.emit('httpPostResult', jobId, true, "0"), 66);
    return Promise.resolve(jobId);
  }

  function adjustContainerCenterToContent(containerId, method) {
    var container = window.api.sceneManager.findNodeById(containerId);
    var position = container.getPose().position || { x: 0, y: 0, z: 0 };
    return Promise.resolve(JSON.stringify(position));
  }

  function setNodeVisibility(instanceId, visibility) {
    var modelImage = insertedModelImages.get(instanceId);
    if (modelImage) {
      modelImage.style.display = visibility ? 'inline' : 'none';
    }
    return Promise.resolve();
  }

  function setObjectInteraction(interaction) {
    return Promise.resolve();
  }

//======================================================================================================================
// UNIMPLEMENTED CALLS
//======================================================================================================================

  function setCollisionMode(mode) {
    return Promise.resolve();
  }

  function stopFeatureTracking(providerName) {
    return Promise.resolve();
  }

  function startFeatureTracking(providerName) {
    return Promise.resolve();
  }

  function setInstancePose(instanceId, pose) {
    return Promise.resolve();
  }

  function confirmGroundPosition(providerName) {
    return Promise.resolve();
  }

  function setMeshMaterial(meshId, materialId) {
    return Promise.resolve();
  }

  function saveMeshAsObj(meshId, fileName) {
    return Promise.resolve();
  }

  function applyMaterialOption(instanceId, groupId, materialOption) {
    return Promise.resolve();
  }

  function loadMeshFromObj(meshId, fileName) {
    return Promise.resolve();
  }

  function deleteMeshObj(fileName) {
    return Promise.resolve();
  }

  function removeFreezeFrame(freezeFrameName) {
    return Promise.resolve();
  }
}

function addMockEvents(coreInterface, appConfig, customStageBackgrounds) {
  var events = {
    // ASYNC CALLS
    insertModel,
    insertModelNew,
    prepareModelResources,
    prepareAllModelAssets,
    prepareResourcePack,
    prepareModelDescription,
    prepareModelImage,
    prepareCategoryImage,
    prepareAppData,
    getModelDescription,
    getMaterialDescription,
    prepareCustomImage,

    // EVENTS
    takeScreenshot,
    saveFreezeFrame,
    openInExternalBrowser,
    openInInternalBrowser,
    deleteCustomFile,
    deleteSelectedModel
  };

  Object.keys(events).forEach(function (name) {
    coreInterface.emit('_Register', name);
    coreInterface.on('mock:' + name, events[name]);
  });

//======================================================================================================================
// ASYNC CALLS
//======================================================================================================================

  function insertModel(jobId, modelId, options) {
    const { instanceId, targetContainerId, shouldBeGrouped, visible} = JSON.parse(options);

    if (targetContainerId) {
      insertContainerImage(targetContainerId);
      const children = insertedContainers.get(targetContainerId) || [];
      insertedObj[instanceId] = { id: instanceId, parent: targetContainerId, shouldBeGrouped };
      children.push(instanceId);
      insertedContainers.set(children);
    }

    if (visible) {
      if(modelContainerDisplayBlacklist.indexOf(modelId) === -1) {
        setTimeout(async function() {
          await insertModelImage(instanceId);
          selectModelImage(instanceId);
        }, 100);
      }
    }
    setTimeout(() => coreInterface.emit('_Result', jobId, null), 80);
  }

  function insertModelNew(jobId, modelId, options) {
    const { instanceId, targetContainerId, shouldBeGrouped, visible} = JSON.parse(options);

    if (targetContainerId) {
      insertContainerImage(targetContainerId);
      const children = insertedContainers.get(targetContainerId) || [];
      insertedObj[instanceId] = { id: instanceId, parent: targetContainerId, shouldBeGrouped };
      children.push(instanceId);
      insertedContainers.set(children);
    }

    if (visible) {
      if(modelContainerDisplayBlacklist.indexOf(modelId) === -1) {
        setTimeout(async function() {
          await insertModelImage(instanceId);
          selectModelImage(instanceId);
        }, 100);
      }
    }
    setTimeout(() => coreInterface.emit('_Result', jobId, null), 80);
  }

  async function simulateTransfer(transferType, resourceType, jobId) {
    if (online) {
      coreInterface.emit('transferBegin', transferType, resourceType, jobId);

      for (let percent = 0; percent < 100; percent += 10) {
        await Promise.delay(33);
        coreInterface.emit('transferProgress', transferType, resourceType, jobId, percent);
      }

      await Promise.delay(33);
      coreInterface.emit('transferEnd', transferType, resourceType, jobId, 'NoErrors');
      coreInterface.emit('_Result', jobId, null);
    } else {

      await Promise.delay(33);
      coreInterface.emit('_OnError', jobId, new Error('Could not resolve host name'));
    }
  }

  function prepareAllModelAssets(jobId) {
    return simulateTransfer('Download', 'ModelResources', jobId);
  }

  function prepareModelResources(jobId) {
    return simulateTransfer('Download', 'ModelResources', jobId);
  }

  async function prepareResourcePack(jobId) {
    return simulateTransfer('Download', 'ResourcePack', jobId);
  }

  async function prepareModelDescription(jobId, modelId) {
    return getModelDescription(jobId, modelId);
  }

  async function prepareModelImage(jobId) {
    return simulateTransfer('Download', 'ModelImage', jobId);
  }

  function prepareCategoryImage(jobId) {
    return simulateTransfer('Download', 'CategoryImage', jobId);
  }

  function prepareCustomImage(jobId, fileName, url) {
    customImages['/CustomImages/' + fileName] = url;
    return simulateTransfer('Download', 'CustomImage', jobId);
  }

  function getModelDescription(jobId, modelId) {
    if (online) {

      return getData(`${appConfig.host}/api10/models/ids:${modelId}`)
          .then(json => JSON.parse(json))
          .then(data => data.models[0])
          .then(data => JSON.stringify(data))
          .then(json =>  coreInterface.emit('_Result', jobId, json));

    } else { // TODO: this error might not be simulated properly
      setTimeout(() => coreInterface.emit('_OnError', jobId, new Error('Could not resolve host name')), 33);
    }
  }

  function prepareAppData(jobId) {
    if (online) {
      setTimeout(() => coreInterface.emit('_Result', jobId,
          coreInterface.mock.getScenarioConfig()
              .then(json => JSON.parse(json))
              .then(({config}) => getData(`${host}${config.appData}`))), 33);
    } else {
      setTimeout(() => coreInterface.emit('_OnError', jobId, new Error('Could not resolve host name')), 33);
    }
  }

  function getMaterialDescription(jobId, materialId) {
    if (online) {

      return getData(`${appConfig.host}/materials/api/action:getDescription/id:${materialId}`)
        .then(json => JSON.parse(json))
        .then(json =>  coreInterface.emit('_Result', jobId, json));

    } else { // TODO: this error might not be simulated properly
      setTimeout(() => coreInterface.emit('_OnError', jobId, new Error('Could not resolve host name')), 33);
    }
  }

//======================================================================================================================
// EVENTS
//======================================================================================================================

  function deleteCustomFile(name) {
    setTimeout(() => delete files[name]);
  }

  function takeScreenshot() {
    setTimeout(() => coreInterface.emit('screenshotTaken'), 100);
  }

  function saveFreezeFrame(name, saveToGallery) {
    var freezeFrame = {
      name: generateId(),
      thumbnailUrl: '/Freezeframes/General/' + name + '_thumb.png',
      imageUrl: '/Freezeframes/General/' + name + '.png'
    };
    freezeFrames.push(freezeFrame);
    setTimeout(() => coreInterface.emit('freezeFrameTaken'), 33);
    return Promise.resolve(freezeFrame);
  }

  function openInExternalBrowser(url) {
    window.open(url, '_target');
  }

  function openInInternalBrowser(url) {
    var frame = prepareIFrame();

    frame.src = url;
    document.documentElement.appendChild(frame);
  }

  function deleteSelectedModel() {
    var instanceId = selectedId;
    setTimeout(() => coreInterface.emit('selectionChanged', null), 33);
    selectModelImage(null);
    var modelImage = insertedModelImages.get(instanceId);
    if (modelImage) modelImage.parentNode.removeChild(modelImage);

    var container = insertedContainers.get(instanceId) || [];
    container.forEach(function(childId) {
      var child = insertedModelImages.get(childId);
      if (child) child.parentNode.removeChild(child);
      insertedModelImages.delete(childId);
      delete insertedObj[childId];
    });

    delete insertedObj[instanceId];
    insertedContainers.delete(instanceId);
    return Promise.resolve(insertedModelImages.delete(instanceId));
  }
}

function addSimulatorPanel(coreInterface) {
  var document = window.document;
  var appContainer = document.getElementById('viewar_app') || document.getElementsByTagName('body')[0];

  var div = document.createElement('div');
  div.classList.add('SimulatorPanel');
  Object.assign(div.style, {
    position: 'fixed',
    bottom: '0',
    right: '0',
    zIndex: '1000000'
  });
  appContainer.appendChild(div);

  /* Structure */
  var toggleStructureButton = document.createElement('button');
  toggleStructureButton.innerHTML = 'Structure: DISCONNECTED';
  toggleStructureButton.style.float = 'right';
  toggleStructureButton.addEventListener('click', function () {
    structureConnected = !structureConnected;
    toggleStructureButton.innerHTML = 'Structure: ' + (structureConnected ? 'CONNECTED' : 'DISCONNECTED');
    toggleStructureBatteryButton.style.display = structureConnected ? 'inline' : 'none';
    toggleTrackingButton.style.display = structureConnected ? 'inline' : 'none';
    toggleMarkerFoundButton.style.display = !structureConnected ? 'inline' : 'none';
    toggleTrackingSpeedbutton.style.display = tracking && structureConnected ? 'inline' : 'none';

    var json = {
      type: 'showConnectSensor',
      data: structureConnected
    };
    var jobId = generateId();
    coreInterface.emit('customTrackingInfo', jobId, JSON.stringify(json));
  });
  div.appendChild(toggleStructureButton);

  /* Structure Battery */
  var toggleStructureBatteryButton = document.createElement('button');
  toggleStructureBatteryButton.innerHTML = 'Structure Battery: 73%';
  Object.assign(toggleStructureBatteryButton.style, {
    display: structureConnected ? 'inline' : 'none',
    float: 'right'
  });
  toggleStructureBatteryButton.addEventListener('click', function () {
    structureBattery = !structureBattery;
    toggleStructureBatteryButton.innerHTML = 'Structure Battery: ' + (structureBattery ? '73%' : '0%');
    var json = {
      type: 'showBatteryNeedsCharging',
      data: structureBattery
    };
    var jobId = generateId();
    coreInterface.emit('customTrackingInfo', jobId, JSON.stringify(json));
  });
  div.appendChild(toggleStructureBatteryButton);

  /* Trackers */
  var tracking = false;
  var toggleTrackingButton = document.createElement('button');
  toggleTrackingButton.innerHTML = 'Trackers: LOST';
  Object.assign(toggleTrackingButton.style, {
    display: structureConnected ? 'inline' : 'none',
    float: 'right'
  });
  toggleTrackingButton.addEventListener('click', function () {
    tracking = !tracking;
    toggleTrackingButton.innerHTML = 'Trackers: ' + (tracking ? 'FOUND' : 'LOST');
    toggleTrackingSpeedbutton.style.display = tracking && structureConnected ? 'inline' : 'none';
    coreInterface.emit('trackingTargetStatusChanged', 'VCard01', tracking ? 'found' : 'lost');
  });
  div.appendChild(toggleTrackingButton);

  /* Trackers Speed */
  var holdDeviceStill = false;
  var toggleTrackingSpeedbutton = document.createElement('button');
  toggleTrackingSpeedbutton.innerHTML = 'Trackingspeed: NORMAL';
  Object.assign(toggleTrackingSpeedbutton.style, {
    display: tracking && structureConnected ? 'inline' : 'none',
    float: 'right'
  });
  toggleTrackingSpeedbutton.addEventListener('click', function () {
    holdDeviceStill = !holdDeviceStill;
    toggleTrackingSpeedbutton.innerHTML = 'Trackingspeed: ' + (holdDeviceStill ? 'HIGH' : 'NORMAL');
    var json = {
      type: 'showHoldDeviceStill',
      data: holdDeviceStill
    };
    var jobId = generateId();
    coreInterface.emit('customTrackingInfo', jobId, JSON.stringify(json));
  });
  div.appendChild(toggleTrackingSpeedbutton);


  /* Marker */
  var markerFound = false;
  var toggleMarkerFoundButton = document.createElement('button');
  toggleMarkerFoundButton.innerHTML = 'Tracking: LOST';
  Object.assign(toggleMarkerFoundButton.style, {
    display: !structureConnected ? 'inline' : 'none',
    float: 'right'
  });
  toggleMarkerFoundButton.addEventListener('click', function () {
    markerFound = !markerFound;
    toggleMarkerFoundButton.innerHTML = 'Tracking: ' + (markerFound ? 'FOUND' : 'LOST');
    coreInterface.emit('trackingTargetStatusChanged', 'VCard01', markerFound ? 'found' : 'lost');
  });
  div.appendChild(toggleMarkerFoundButton);


  /* Connection */
  online = true;
  var connectionButton = document.createElement('button');
  connectionButton.innerHTML = 'Connection: ONLINE';
  Object.assign(connectionButton.style, {
    display: !structureConnected ? 'inline' : 'none',
    float: 'right'
  });
  connectionButton.addEventListener('click', function () {
    online = !online;
    connectionButton.innerHTML = 'Connection: ' + (online ? 'ONLINE' : 'OFFLINE');
  });
  div.appendChild(connectionButton);

}

function getData(url) {
  return new Promise(function(resolve, reject) {
    if (downloadCache[url]) {
      resolve(downloadCache[url]);
    } else {
      var req = new XMLHttpRequest();

      req.open('GET', url, true);

      req.onload = function () {
        if (req.status == 200) {
          downloadCache[url] = req.response;
          resolve(req.response);
        } else {
          reject(new Error(req.status))
        }
      }

      req.onerror = function () {
        reject(new Error('XHR failed'));
      };

      req.send();
    }
  });
}

function prepareIFrame() {
  var frame = document.createElement('iframe');
  Object.assign(frame.style, {
    position: 'fixed',
    zindex: '10000',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)'
  });

  frame.width = '512px';
  frame.height = '384px';

  return frame;
}

function addCustomFiles(files) {
  window.files = files;
}

//======================================================================================================================
// UI MOCK FUNCTIONS
//======================================================================================================================

function addCustomStageBackgrounds(customStageBackgrounds) {
  customStageBackgrounds['AR'] = `url('${host}/images_new/ar_background.png') center / cover no-repeat`;
  customStageBackgrounds['Freeze'] = `url('${host}/images_new/ar_background.png') center / cover no-repeat`;
  customStageBackgrounds['Grid'] = 'lightgrey';
  customStageBackgrounds['VR'] = 'lightgrey';
  customStageBackgrounds['Experience'] = `url('${host}/images_new/ar_background.png') center / cover no-repeat`
}

function showStageText(text) {
  var appContainer = document.getElementById('viewar_app') || document.getElementsByTagName('body')[0];
  var freezeExisting = document.getElementById('freezeContainer');
  var freezeContainer = freezeExisting || document.createElement('div');
  if (!freezeExisting) {
    freezeContainer.id = 'freezeContainer';
    Object.assign(freezeContainer.style, {
      position: 'absolute',
      top: '30%',
      left: '50%',
      transform: 'translate(-50%, -30%)',
      webkitTransform: 'translate(-50%, -30%)',
      msTransform: 'translate(-50%, -30%)',
      mozTransform: 'translate(-50%, -30%)',
      zIndex: '-1000',
      height: '64px',
      border: 'none',
      fontSize: '5em',
      color: 'rgba(0, 0, 0, 0.5)'
    });

    appContainer.appendChild(freezeContainer);
  }
  if (text) {
    freezeContainer.innerHTML = text;
    freezeContainer.style.display = 'block';
  } else {
    freezeContainer.style.display = 'none';
  }
}

function showBackground(stage) {
  var appContainer = document.getElementById('viewar_app') || document.getElementsByTagName('body')[0];
  var background = customStageBackgrounds[stage];
  if (background) {
    var existing = document.getElementById('backgroundElement');
    var backgroundElement = existing || document.createElement('div');
    if (!existing) {
      backgroundElement.id = 'backgroundElement';
      Object.assign(backgroundElement.style, {
        position: 'absolute',
        width: '100%',
        height: '100%',
        zIndex: '-1000000',
        backgroundSize: 'cover',
        left: '0',
        top: '0'
      });

      backgroundElement.addEventListener('click', () => {
        window.api.coreInterface.emit('selectionChanged', null);
        selectModelImage(null);
      });
      appContainer.appendChild(backgroundElement);
    }
    backgroundElement.style.background = background;
  }
}

async function insertModelImage(instanceId) {
  const modelContainer = getOrCreateModelContainer();

  var modelExisting = document.getElementById('modelImage_' + instanceId);
  var modelImage = modelExisting || document.createElement('div');
  if (!modelExisting) {
    modelImage.id = 'modelImage_' + instanceId;
    Object.assign(modelImage.style, {
      position: 'relative',
      float: 'left',
      zIndex: '10000',
      padding: '2px',
      margin: '2px',
      border: '2px solid rgba(0,0,0,0)',
    });
  }

  const instance = window.api.sceneManager.findNodeById(instanceId);
  if (instance) {

    let selection = instance;
    let parentContainer = modelContainer;
    if(selection.parent && selection.parent.id !== 'DefaultLayer') {
      parentContainer = document.getElementById('containerImage_' + selection.parent.id);
    }
    parentContainer.appendChild(modelImage);

    await instance.model.downloadImage();
    modelImage.innerHTML = `<div style="position: relative; width: 128px; height: 128px;"><img style="width: 100%; height: 100%; position: absolute;" src="${instance.model.imageUrl}"/><div style="position: absolute; left: 0; bottom: 0; width: 100%; color: #282f39; text-overflow: ellipsis; padding: 1em 0.1em; box-sizing: border-box; line-height: 1em; font-size: 0.9em; background: rgba(255, 255, 255, 0.7); text-align: center; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">${instance.model.name}</div></div>`;

    const onClick = e => {
      if (currentMode === 'TouchRay') {
        const touchResult = [{
          instanceId,
          intersection: [
            {x: 0, y: 0, z: 0}
          ]
        }];
        window.api.coreInterface.emit('touchRay', JSON.stringify(touchResult));
      }

      while (selection.parent && (selection.parent.type !== 'ungrouped' && selection.parent.id !== 'DefaultLayer')) {
        selection = selection.parent;
      }

      if (!selection.model || selection.model.type !== 'environment') {
        selectModelImage(selection.id);
        window.api.coreInterface.emit('selectionChanged', selection.id);
      } else {
        selectModelImage(null);
        window.api.coreInterface.emit('selectionChanged', null);
      }

      e.stopPropagation();
      e.preventDefault();
    };

    modelImage.addEventListener('click', onClick);
  } else {

    let selection = insertedObj[instanceId];
    let parentContainer = modelContainer;
    if(selection.parent && selection.parent !== 'DefaultLayer') {
      parentContainer = document.getElementById('containerImage_' + selection.parent);
    }
    parentContainer.appendChild(modelImage);

    modelImage.innerHTML = '<div style="overflow-x: hidden; white-space: nowrap; ">' + instanceId + '</div>';
    modelImage.addEventListener('click', e => {
      while (selection.parent && (selection.shouldBeGrouped && selection.parent !== 'DefaultLayer')) {
        selection = insertedObj[selection.parent];
      }

      selectModelImage(selection.id);
      window.api.coreInterface.emit('selectionChanged', selection.id);

      e.stopPropagation();
      e.preventDefault();
    });
  }
  insertedModelImages.set(instanceId, modelImage);
}

function insertContainerImage(containerId) {
  if (modelContainerDisplayBlacklist.indexOf(containerId) > -1) {
    return;
  }

  var modelContainer = getOrCreateModelContainer();
  var instance = window.api.sceneManager.findNodeById(containerId);
  var containerExisting = document.getElementById('containerImage_' + containerId);
  var containerImage = containerExisting || document.createElement('div');
  if (!containerExisting) {
    containerImage.id = 'containerImage_' + containerId;
    Object.assign(containerImage.style, {
      position: 'relative',
      float: 'left',
      zIndex: '10000',
      padding: '2px',
      margin: '2px',
      background: 'white',
      border: '2px solid rgba(0,0,0,0)'
    });
    containerImage.innerHTML = '<div style="overflow-x: hidden; white-space: nowrap; ">[' + containerId.substr(0, 8) + '...]</div>';
  }
  if (instance) {

    let selection = instance;
    let parentContainer = modelContainer;
    if(selection.parent && selection.parent.id !== 'DefaultLayer') {
      parentContainer = document.getElementById('containerImage_' + selection.parent.id);
    }
    parentContainer.appendChild(containerImage);

    containerImage.addEventListener('click', () => {
      while (selection.parent && (selection.parent.type !== 'ungrouped' && selection.parent.id !== 'DefaultLayer')) {
        selection = selection.parent;
      }

      if (!selection.model || selection.model.type !== 'environment') {
        selectModelImage(selection.id);
        window.api.coreInterface.emit('selectionChanged', selection.id);
      } else {
        selectModelImage(null);
        window.api.coreInterface.emit('selectionChanged', null);
      }
    });
  }else {

    let selection = insertedObj[containerId];
    let parentContainer = modelContainer;
    if(selection.parent && selection.parent !== 'DefaultLayer') {
      parentContainer = document.getElementById('containerImage_' + selection.parent);
    }
    parentContainer.appendChild(containerImage);

    containerImage.addEventListener('click', e => {
      while (selection.parent && (selection.shouldBeGrouped && selection.parent !== 'DefaultLayer')) {
        selection = insertedObj[selection.parent];
      }

      selectModelImage(selection.id);
      window.api.coreInterface.emit('selectionChanged', selection.id);

      e.stopPropagation();
      e.preventDefault();
    });
  }
  insertedModelImages.set(containerId, containerImage);

}

function getOrCreateModelContainer() {
  var appContainer = document.getElementById('viewar_app') || document.getElementsByTagName('body')[0];
  var existing = document.getElementById('modelContainer');
  var modelContainer = existing || document.createElement('div');
  if (!existing) {
    modelContainer.id = 'modelContainer';
    Object.assign(modelContainer.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      maxWidth: '60%',
      maxHeight: '60%',
      overflowY: 'auto',
      transform: 'translate(-50%, -50%)',
      webkitTransform: 'translate(-50%, -50%)',
      msTransform: 'translate(-50%, -50%)',
      mozTransform: 'translate(-50%, -50%)',
      zIndex: '-1000'
    });
    const title = document.createElement('div');
    title.innerHTML = 'Scene Objects:';
    Object.assign(title.style, {
      textAlign: 'center'
    });
    modelContainer.appendChild(title);

    modelContainer.addEventListener('click', () => {
      window.api.coreInterface.emit('selectionChanged', null);
      selectModelImage(null);
    });

    appContainer.appendChild(modelContainer);
  }

  modelContainer.style.display = 'block';
  return modelContainer;
}

function selectModelImage(instanceId) {
  selectedId = instanceId;
  for (let [currentId, modelImage] of insertedModelImages) {
    if (currentId === instanceId) {
      Object.assign(modelImage.style, {
        border: '2px solid red',
        padding: '2px'
      });
    } else {
      Object.assign(modelImage.style, {
        border: '2px solid rgba(0,0,0,0)',
        padding: '2px'
      });
    }
  }
}

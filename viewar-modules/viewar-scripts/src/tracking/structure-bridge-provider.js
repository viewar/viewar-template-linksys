import mixinEmitter from 'component-emitter';
import createMesh from './mesh.js';

const defaults = {
  name: 'StructureBridge'
};

export default function createStructureBridgeProvider(specification) {

  const {coreInterface} = specification;

  const {name} = Object.assign({}, defaults, specification);
  const supportsSlam = false;

  let active = false;
  let tracking = false;
  let groundConfirmed = false;

  let meshScanning = false;

  let scanInfo = {};

  let sensorStatus = {
    connected: false,
    batteryLow: false,
    movingTooFast: false
  };

  const structureBridgeProvider = {
    activate,
    deactivate,
    getStatus,
    confirmGroundPosition,
    getTrackingQuality,
    reset,
    resetMeshScan,
    setScanVolume,
    startMeshScan,
    stopMeshScan,
    colorizeMesh,
    fillMeshHoles,
    getMeshList,

    get active() { return active; },
    get groundConfirmed() { return groundConfirmed },
    get meshScanning() { return meshScanning; },
    get name() { return name; },
    get scanVolume() { return scanInfo; },
    get sensorStatus() { return sensorStatus; },
    get supportsSlam() { return supportsSlam; },
    get tracking() { return tracking }
  };

  mixinEmitter(structureBridgeProvider);

  init();
  
  return structureBridgeProvider;

//======================================================================================================================
// INITIALIZATION
//======================================================================================================================

  function init() {
    coreInterface.on('customTrackingInfo', handleTrackingStatusUpdate);
  }

//======================================================================================================================
// PUBLIC INTERFACE
//======================================================================================================================

  function activate() {
    return Promise.resolve().then(function () {
      if (!active) {
        coreInterface.on('trackingTargetStatusChanged', handleTrackingTargetStatusChanged);
        return coreInterface.call('startFeaturetracking', name).then(() => {
          meshScanning = false;
          groundConfirmed = false;
          tracking = false;
          return active = true;
        });
      } else {
        return false;
      }
    })
  }

  function deactivate() {
    return Promise.resolve().then(function () {
      if (active) {
        coreInterface.off('trackingTargetStatusChanged', handleTrackingTargetStatusChanged);
        return coreInterface.call('stopFeaturetracking', name).then(() => {
          meshScanning = false;
          groundConfirmed = false;
          tracking = false;
          return !(active = false);
        });
      } else {
        return false;
      }
    })
  }

  function reset() {
    return Promise.resolve().then(deactivate).then(activate);
  }

  function startMeshScan() {
    meshScanning = true;
    return coreInterface.call('startMeshScan');
  }

  function stopMeshScan() {
    meshScanning = false;
    return coreInterface.call('stopMeshScan');
  }

  function resetMeshScan() {
    meshScanning = false;
    return coreInterface.call('resetMeshScan');
  }

  function confirmGroundPosition() {
    groundConfirmed = true;
    return coreInterface.call('confirmGroundPosition', name);
  }

  function colorizeMesh() {
    return coreInterface.call('colorizeMesh');
  }

  function fillMeshHoles() {
    return coreInterface.call('fillMeshHoles');
  }

  function getMeshList() {
    return coreInterface.call('getMeshList')
        .then(json => (json && JSON.parse(json) || [])
            .map(meshInfo => createMesh(Object.assign({}, meshInfo, {coreInterface}))));
  }

  function setScanVolume(newScanInfo, resetTracking) {
    return Promise.resolve()
      .then(() => coreInterface.call('customTrackingCommand',
          name, 'setInitialVolumeSize', JSON.stringify(newScanInfo.size)))
      .then(() => coreInterface.call('customTrackingCommand',
          name, 'setInitialVolumeResolution', JSON.stringify(newScanInfo.resolution)))
      .then(() => coreInterface.call('customTrackingCommand',
          name, 'setInitialVolumeOffset', JSON.stringify(newScanInfo.offset)))
      .then(() => resetTracking && reset())
      .then(() => Object.assign(scanInfo, newScanInfo));
  }

  function getStatus() {
    return coreInterface.call('customTrackingCommand', name, 'getStatus', '')
      .then(JSON.parse)
      .then(status => {
        sensorStatus.connected = status.sensorConnected;
        sensorStatus.streaming = status.isStreaming;
        sensorStatus.batteryLevel = status.sensorBatteryLevel;
        return sensorStatus;
      });
  }

  function getTrackingQuality() {
    return coreInterface.call('trackingFeedback').then(quality => JSON.parse(quality));
  }

//======================================================================================================================
// PRIVATE FUNCTIONS
//======================================================================================================================

  function handleTrackingTargetStatusChanged(targetName, event) {
    tracking = event === 'found';
    structureProvider.emit('trackingTargetStatusChanged', tracking);
  }

  function handleTrackingStatusUpdate(target, event) {
    if (event !== undefined) {
      var info = JSON.parse(event);
      switch (info.type) {
        case 'showHoldDeviceStill':
          if (info.data === true) {
            structureProvider.emit('trackingSpeedHigh', target);
            sensorStatus.movingTooFast = true;
          } else {
            structureProvider.emit('trackingSpeedNormal', target);
            sensorStatus.movingTooFast = false;
          }
          break;
        case 'showBatteryNeedsCharging':
          if (info.data === true) {
            structureProvider.emit('trackingBatteryNeedsCharging', target);
            sensorStatus.batteryLow = true;
          } else {
            structureProvider.emit('trackingBatteryNeedsNoCharging', target);
            sensorStatus.batteryLow = false;
          }
          break;
        case 'showConnectSensor':
          if (info.data === true) {
            structureProvider.emit('trackingSensorDisconnected', target);
            sensorStatus.connected = true;
          } else {
            structureProvider.emit('trackingSensorConnected', target);
            sensorStatus.connected = false;
          }
          break;
        case 'skinningProgress':
          structureProvider.emit('skinningProgressUpdate', info.data);
          break;
        case 'holeFillProgress':
          structureProvider.emit('holeFillProgressUpdate', info.data);
          break;
        case 'skinningFinished':
          structureProvider.emit('skinningFinished', target);
          break;
        case 'holeFillFinished':
          structureProvider.emit('holeFillFinished', target);
          break;
      }
    }
  }

}

import mixinEmitter from 'component-emitter';
import createMesh from './mesh.js';

/**
 * @private
 * @interface StructureProvider
 * @emits trackingStatusChanged
 */

/**
 * @private
 * @returns StructureProvider
 */
export default function createStructureProvider(specification) {
  const name = 'Structure';
  const { coreInterface, initiallyActive } = specification;

  if (initiallyActive) {
    coreInterface.on('customTrackingInfo', handleTrackingStatusUpdate);
    coreInterface.on('trackingTargetStatusChanged', handleTrackingTargetStatusChanged);
  }

  let active = initiallyActive;
  let tracking = false;
  let groundConfirmed = false;

  let scanningMesh = false;
  let scanInfo = {};
  let sensorStatus = {
    connected: false,
    batteryLow: false,
    movingTooFast: false
  };

  const structureProvider = mixinEmitter({
    activate,
    deactivate,
    reset,
    confirmGroundPosition,

    /**
     * activation status
     * @type {boolean}
     * @memberOf! StructureProvider#
     */
    get active() { return active; },
    /**
     * tracking status
     * @type {boolean}
     * @memberOf! StructureProvider#
     */
    get tracking() { return tracking },
    /**
     * ground origin status
     * @type {boolean}
     * @memberOf! StructureProvider#
     */
    get groundConfirmed() { return groundConfirmed },

    //===== MESH SCANNING =====

    resetMeshScan,
    startMeshScan,
    stopMeshScan,
    getMeshList,

    /**
     * mesh scan status
     * @type {boolean}
     * @memberOf! StructureProvider#
     */
    get scanning() { return scanningMesh; },

    //===== CUSTOM MEMBERS =====

    setScanVolume,
    getStatus,
    getTrackingQuality,
    get scanVolume() { return scanInfo; },
    get sensorStatus() { return sensorStatus; },
  });

  return structureProvider;

//======================================================================================================================
// PUBLIC INTERFACE
//======================================================================================================================

  /**
   * Activates the tracker. Does not guarantee that the tracking will begin before promise is fulfilled.
   * @returns {Promise} resolved when done.
   * @memberOf! StructureProvider#
   */
  function activate() {
    return Promise.resolve().then(function () {
      if (!active) {
        coreInterface.on('customTrackingInfo', handleTrackingStatusUpdate);
        coreInterface.on('trackingTargetStatusChanged', handleTrackingTargetStatusChanged);
        return coreInterface.call('startTracking', name).then(() => {
          scanningMesh = false;
          groundConfirmed = false;
          tracking = false;
          return active = true;
        });
      } else {
        return false;
      }
    })
  }

  /**
   * Deactivates the tracker.
   * @returns {Promise} resolved when done.
   * @memberOf! StructureProvider#
   */
  function deactivate() {
    return Promise.resolve().then(function () {
      if (active) {
        coreInterface.off('customTrackingInfo', handleTrackingStatusUpdate);
        coreInterface.off('trackingTargetStatusChanged', handleTrackingTargetStatusChanged);
        return coreInterface.call('stopTracking', name).then(() => {
          scanningMesh = false;
          groundConfirmed = false;
          tracking = false;
          return !(active = false);
        });
      } else {
        return false;
      }
    })
  }

  /**
   * Reactivates the tracker.
   * @returns {Promise} resolved when done.
   * @memberOf! StructureProvider#
   */
  function reset() {
    return Promise.resolve().then(deactivate).then(activate);
  }

  /**
   * Starts mesh scan.
   * @returns {Promise} resolved when done.
   * @memberOf! StructureProvider#
   */
  function startMeshScan() {
    scanningMesh = true;
    return coreInterface.call('startMeshScan');
  }

  /**
   * Stops mesh scan.
   * @returns {Promise} resolved when done.
   * @memberOf! StructureProvider#
   */
  function stopMeshScan() {
    scanningMesh = false;
    return coreInterface.call('stopMeshScan');
  }

  /**
   * Resets mesh scan. Previously scanned mesh is lost.
   * @returns {Promise} resolved when done.
   * @memberOf! StructureProvider#
   */
  function resetMeshScan() {
    scanningMesh = false;
    return coreInterface.call('resetMeshScan');
  }

  /**
   * Confirms ground position to start feature tracking.
   * @returns {Promise} resolved when done.
   * @memberOf! StructureProvider#
   */
  function confirmGroundPosition() {
    groundConfirmed = true;
    return coreInterface.call('confirmGroundPosition', name);
  }

  /**
   *
   * @returns {Promise} resolved when done.
   * @memberOf! StructureProvider#
   */
  function colorizeMesh() {
    return coreInterface.call('colorizeMesh');
  }

  /**
   * Fills any holes in the scanned mesh, creating a closed body.
   * @returns {Promise} resolved when done.
   * @memberOf! StructureProvider#
   */
  function fillMeshHoles() {
    return coreInterface.call('fillMeshHoles');
  }

  /**
   * Retrieves the list of stored meshes.
   * @returns {Promise.<Array<Mesh>>} resolved when done.
   * @memberOf! StructureProvider#
   */
  function getMeshList() {
    return coreInterface.call('getMeshList')
        .map(meshInfo => createMesh(Object.assign({}, meshInfo, {coreInterface})));
  }

  /**
   * TODO
   * @param newScanInfo
   * @param resetTracking
   * @returns {Promise.<TResult>}
   */
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

  /**
   * Retrieves current tracker status
   * @returns Promise.<Object> resolves with status info object
   * @memberOf! StructureProvider#
   */
  function getStatus() {
    return coreInterface.call('customTrackingCommand', name, 'getStatus', '');
  }

  /**
   * Retrieves current quality of tracking. Quality declines in environments with a lot of sunlight.
   * @returns Promise.<string> resolves with string describing quality
   * @memberOf! StructureProvider#
   */
  function getTrackingQuality() {
    return coreInterface.call('trackingFeedback');
  }

//======================================================================================================================
// PRIVATE FUNCTIONS
//======================================================================================================================

  function handleTrackingTargetStatusChanged(targetName, event) {
    tracking = event === 'found';
    structureProvider.emit('trackingTargetStatusChanged', tracking);
  }

  function handleTrackingStatusUpdate(target, info) {
    if (info !== undefined) {
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

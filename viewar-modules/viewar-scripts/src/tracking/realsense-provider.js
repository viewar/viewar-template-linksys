import mixinEmitter from 'component-emitter';
import createMesh from './mesh.js';

/**
 * @private
 * @interface RealSenseProvider
 * @emits trackingTargetStatusChanged
 */

/**
 * @private
 * @returns RealSenseProvider
 */
export default function createRealSenseProvider(specification) {
  const name = 'RealSense';
  const { coreInterface, initiallyActive } = specification;

  if (initiallyActive) {
    coreInterface.on('trackingTargetStatusChanged', handleTrackingTargetStatusChanged);
    coreInterface.on('trackingFeedback', handleTrackingFeedback);
  }

  let active = initiallyActive;
  let tracking = false;
  let groundConfirmed = false;

  let quality = 0;
  let meshScanning = false;

  const realSenseProvider = mixinEmitter({
    activate,
    deactivate,
    reset,
    confirmGroundPosition,

    get active() { return active; },
    get tracking() { return true; },
    get groundConfirmed() { return groundConfirmed },

    //===== CUSTOM MEMBERS =====

    startMeshScan,
    stopMeshScan,
    resetMeshScan,
    getMeshList,

    get meshScanning() { return meshScanning; },

    //===== CUSTOM MEMBERS =====

    getStatus,
    get quality() { return quality; },
  });

  return realSenseProvider;

//======================================================================================================================
// PUBLIC INTERFACE
//======================================================================================================================

  function getStatus() {
    return Promise.resolve({
      sensorBatteryLevel: 1,
      sensorConnected: true,
      isStreaming: true
    });
  }

  /**
   * Activates the tracker. Does not guarantee that the tracking will begin before promise is fulfilled.
   * @returns {Promise} resolved when done.
   * @memberOf! RealSenseProvider#
   */
  function activate() {
    return Promise.resolve().then(function () {
      if (!active) {
        coreInterface.on('trackingTargetStatusChanged', handleTrackingTargetStatusChanged);
        coreInterface.on('trackingFeedback', handleTrackingFeedback);
        return coreInterface.call('startTracking', name).then(() => {
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

  /**
   * Deactivates the tracker.
   * @returns {Promise} resolved when done.
   * @memberOf! RealSenseProvider#
   */
  function deactivate() {
    return Promise.resolve().then(function () {
      if (active) {
        coreInterface.off('trackingTargetStatusChanged', handleTrackingTargetStatusChanged);
        coreInterface.off('trackingFeedback', handleTrackingFeedback);
        return coreInterface.call('stopTracking', name).then(() => {
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

  /**
   * Reactivates the tracker.
   * @returns {Promise} resolved when done.
   * @memberOf! RealSenseProvider#
   */
  function reset() {
    return Promise.resolve().then(deactivate).then(activate);
  }

  /**
   * Starts mesh scan.
   * @returns {Promise} resolved when done.
   * @memberOf! RealSenseProvider#
   */
  function startMeshScan() {
    meshScanning = true;
    return coreInterface.call('startMeshScan');
  }

  /**
   * Stops mesh scan.
   * @returns {Promise} resolved when done.
   * @memberOf! RealSenseProvider#
   */
  function stopMeshScan() {
    meshScanning = false;
    return coreInterface.call('stopMeshScan');
  }

  /**
   * Resets mesh scan. Previously scanned mesh is lost.
   * @returns {Promise} resolved when done.
   * @memberOf! RealSenseProvider#
   */
  function resetMeshScan() {
    meshScanning = false;
    return coreInterface.call('resetMeshScan');
  }

  /**
   * Confirms ground position to start feature tracking.
   * @returns {Promise} resolved when done.
   * @memberOf! RealSenseProvider#
   */
  function confirmGroundPosition() {
    groundConfirmed = true;
    return coreInterface.call('confirmGroundPosition', name);
  }

  /**
   * Retrieves the list of stored meshes.
   * @returns {Promise.<Array<Mesh>>} resolved when done.
   * @memberOf! RealSenseProvider#
   */
  function getMeshList() {
    return coreInterface.call('getMeshList')
        .map(meshInfo => createMesh(Object.assign({}, meshInfo, {coreInterface})));
  }

  function handleTrackingFeedback(quality = 0) {
    realSenseProvider.emit('trackingQualityChanged', quality);
  }

  function handleTrackingTargetStatusChanged(targetName, event) {
    tracking = event === 'found';
    realSenseProvider.emit('trackingTargetStatusChanged', tracking);
  }

}

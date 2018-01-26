import mixinEmitter from 'component-emitter';
import { createTrackingTarget } from './tracking-target.js';

/**
 * @interface VisionLibTracker
 * @extends ProtectedEmitter
 * @emits VisionLibTracker#trackingStatusChanged
 * @emits VisionLibTracker#trackingTargetStatusChanged
 */

/**
 * @private
 * @returns VisionLibTracker
 */
export default function createVisionLibProvider(specification) {
  const name = 'VisionLib';
  const { coreInterface } = specification;
  const { targets: rawTargets = [], initiallyActive } = specification;

  const targets = rawTargets.map(createTrackingTarget);
  targets.push(createTrackingTarget({name: "UserTarget"}));

  if (initiallyActive) {
    coreInterface.on('trackingTargetStatusChanged', handleTrackingTargetStatusChanged);
  }

  let active = initiallyActive;

  const visionLibProvider = mixinEmitter({
    activate,
    deactivate,
    reset,

    captureUserTarget,
    removeUserTarget,

    /**
     * @type {boolean}
     * @memberOf! VisionlibTracker#
     */
    get active() { return active; },
    /**
     * @type {boolean}
     * @memberOf! VisionlibTracker#
     */
    get tracking() { return targets.some(target => target.tracked); },
    /**
     * @type {Array<TrackingTarget>}
     * @memberOf! VisionlibTracker#
     */
    get targets() { return targets; },
  });

  return visionLibProvider;

//======================================================================================================================
// PUBLIC INTERFACE
//======================================================================================================================

  /**
   * Activates the tracker. Does not guarantee that the tracking will begin before promise is fulfilled.
   * @returns {Promise} resolved when done.
   * @memberOf! VisionlibTracker#
   */
  function activate() {
    return Promise.resolve().then(function () {
      if (!active) {
        coreInterface.on('trackingTargetStatusChanged', handleTrackingTargetStatusChanged);
        return coreInterface.call('startTracking', name).then(() => {
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
   * @memberOf! VisionlibTracker#
   */
  function deactivate() {
    return Promise.resolve().then(function () {
      if (active) {
        coreInterface.off('trackingTargetStatusChanged', handleTrackingTargetStatusChanged);
        return coreInterface.call('stopTracking', name).then(() => {
          return !(active = false);
        });
      } else {
        return false;
      }
    })
  }

  /**
   * Reactivates the tracker. Resets all tracking targets.
   * @returns {Promise} resolved when done.
   * @memberOf! VisionlibTracker#
   */
  function reset() {
    return Promise.resolve().then(deactivate).then(activate);
  }

  /**
   * Captures a user target from the current camera input.
   * @returns {Promise} resolved when done.
   * @memberOf! VisionlibTracker#
   */
  function captureUserTarget(size) {
    return new Promise(function(resolve) {
      coreInterface.on('customTrackingInfo', function (target, event) {
        if ((target === name || target === 'Qualcomm') && event !== undefined) {
          const info = event;
          switch (info.status) {
            case 'userTargetCaptured':
              resolve(true);
              break;
            case 'userTargetFailed':
              resolve(false);
              break;
            case 'userTargetLowFrameQualityWarning':
              visionLibProvider.emit('userTargetLowQuality');
              break;
          }
        }
      });
      return coreInterface.call('customTrackingCommand', name, 'captureUserTarget', JSON.stringify(size));
    });
  }

  /**
   * Removes the previously captures user target.
   * @returns {Promise} resolved when done.
   * @memberOf! VisionlibTracker#
   */
  function removeUserTarget() {
    return coreInterface.call('customTrackingCommand', name, 'removeUserTarget', '');
  }

//======================================================================================================================
// PRIVATE FUNCTIONS
//======================================================================================================================

  function handleTrackingTargetStatusChanged(targetName, event) {
    let target = targets.find(target => target.name === targetName);

    if (target) {
      target._setTracked(event);

      let trackedTargets = targets.filter(target => target.tracked);
      let untrackedTargets = targets.filter(target => !target.tracked);

      visionLibProvider.emit('trackingTargetStatusChanged', target);
      visionLibProvider.emit('trackingStatusChanged', {target, trackedTargets, untrackedTargets});
    } else {
      console.warn('Unrecognized tracking target: %s', targetName);
    }
  }

}

/**
 * @event VisionlibTracker#trackingTargetStatusChanged
 * @param {TrackingTarget} target
 */


/**
 * @event VisionlibTracker#trackingStatusChanged
 * @param {object} info
 * @param {TrackingTarget} info.target
 * @param {Array<TrackingTarget>} info.trackedTargets
 * @param {Array<TrackingTarget>} info.untrackedTargets
 */

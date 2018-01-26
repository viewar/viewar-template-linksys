import mixinEmitter from 'component-emitter';
import { createTrackingTarget } from './tracking-target.js';

/**
 * @interface VuforiaTracker
 * @extends ProtectedEmitter
 * @emits VuforiaTracker#trackingStatusChanged
 * @emits VuforiaTracker#trackingTargetStatusChanged
 */

/**
 * @private
 * @returns VuforiaTracker
 */
export default function createVuforiaProvider(specification) {
  const name = 'Vuforia';
  const { coreInterface } = specification;
  const { targets: rawTargets = [], initiallyActive } = specification;

  const targets = rawTargets.map(createTrackingTarget);
  targets.push(createTrackingTarget({name: "UserTarget"}));

  if (initiallyActive) {
    coreInterface.on('trackingTargetStatusChanged', handleTrackingTargetStatusChanged);
  }

  let active = initiallyActive;

  const vuforiaProvider = mixinEmitter({
    activate,
    deactivate,
    reset,

    captureUserTarget,
    removeUserTarget,

    /**
     * @type {boolean}
     * @memberOf! VuforiaTracker#
     */
    get active() { return active; },
    /**
     * @type {boolean}
     * @memberOf! VuforiaTracker#
     */
    get tracking() { return targets.some(target => target.tracked); },
    /**
     * @type {Array<TrackingTarget>}
     * @memberOf! VuforiaTracker#
     */
    get targets() { return targets; },
  });

  return vuforiaProvider;

//======================================================================================================================
// PUBLIC INTERFACE
//======================================================================================================================

  /**
   * Activates the tracker. Does not guarantee that the tracking will begin before promise is fulfilled.
   * @returns {Promise} resolved when done.
   * @memberOf! VuforiaTracker#
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
   * @memberOf! VuforiaTracker#
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
   * @memberOf! VuforiaTracker#
   */
  function reset() {
    return Promise.resolve().then(deactivate).then(activate);
  }

  /**
   * Captures a user target from the current camera input.
   * @returns {Promise} resolved when done.
   * @memberOf! VuforiaTracker#
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
              vuforiaProvider.emit('userTargetLowQuality');
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
   * @memberOf! VuforiaTracker#
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

      vuforiaProvider.emit('trackingTargetStatusChanged', target);
      vuforiaProvider.emit('trackingStatusChanged', {target, trackedTargets, untrackedTargets});
    } else {
      console.warn('Unrecognized tracking target: %s', targetName);
    }
  }

}

/**
 * @event VuforiaTracker#trackingTargetStatusChanged
 * @param {TrackingTarget} target
 */


/**
 * @event VuforiaTracker#trackingStatusChanged
 * @param {object} info
 * @param {TrackingTarget} info.target
 * @param {Array<TrackingTarget>} info.trackedTargets
 * @param {Array<TrackingTarget>} info.untrackedTargets
 */

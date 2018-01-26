import mixinEmitter from 'component-emitter';

/**
 * @private
 * @interface ARKitProvider
 * @emits trackingTargetStatusChanged
 */

/**
 * @private
 * @returns ARKitProvider
 */
export default function createARKitProvider(specification) {
  const name = 'ARKit';
  const { coreInterface, initiallyActive } = specification;

  if (initiallyActive) {
    coreInterface.on('trackingTargetStatusChanged', handleTrackingTargetStatusChanged);
  }

  let active = initiallyActive;
  let tracking = false;
  let groundConfirmed = false;

  const arKitProvider = Object.assign({
    activate,
    deactivate,
    reset,
    confirmGroundPosition,

    get active() { return active; },
    get tracking() { return tracking; },
    get groundConfirmed() { return groundConfirmed; },
  });

  mixinEmitter(arKitProvider);

  return arKitProvider;

//======================================================================================================================
// PUBLIC INTERFACE
//======================================================================================================================

  /**
   * Activates the tracker. Does not guarantee that the tracking will begin before promise is fulfilled.
   * @returns {Promise} resolved when done.
   * @memberOf! ARKitProvider#
   */
  function activate() {
    return Promise.resolve().then(function () {
      if (!active) {
        coreInterface.on('trackingTargetStatusChanged', handleTrackingTargetStatusChanged);
        return coreInterface.call('startTracking', name).then(() => {
          tracking = false;
          groundConfirmed = false;
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
   * @memberOf! ARKitProvider#
   */
  function deactivate() {
    return Promise.resolve().then(function () {
      if (active) {
        coreInterface.off('trackingTargetStatusChanged', handleTrackingTargetStatusChanged);
        return coreInterface.call('stopTracking', name).then(() => {
          tracking = false;
          groundConfirmed = false;
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
   * @memberOf! ARKitProvider#
   */
  function reset() {
    return Promise.resolve().then(deactivate).then(activate);
  }

  /**
   * Confirms ground position to start feature tracking.
   * @returns {Promise} resolved when done.
   * @memberOf! ARKitProvider#
   */
  function confirmGroundPosition() {
    return coreInterface.call('confirmGroundPosition', name).then(() => groundConfirmed = true);
  }

//======================================================================================================================
// PRIVATE FUNCTIONS
//======================================================================================================================

  async function handleTrackingTargetStatusChanged(targetName, event) {
    tracking = event === 'found';

    if (tracking) {
      await confirmGroundPosition();
    }
    arKitProvider.emit('trackingTargetStatusChanged', tracking);
  }

}

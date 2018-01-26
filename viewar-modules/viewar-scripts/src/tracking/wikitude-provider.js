import mixinEmitter from 'component-emitter';

/**
 * @private
 * @interface WikitudeProvider
 * @emits trackingTargetStatusChanged
 */

/**
 * @private
 * @returns WikitudeProvider
 */
export default function createWikitudeProvider(specification) {
  const name = 'Wikitude';
  const { coreInterface, initiallyActive } = specification;

  if (initiallyActive) {
    coreInterface.on('trackingTargetStatusChanged', handleTrackingTargetStatusChanged);
  }

  let active = initiallyActive;
  let tracking = false;
  let groundConfirmed = false;

  let floorOffset = 1400;

  const wikitudeProvider = Object.assign({
    activate,
    deactivate,
    reset,
    confirmGroundPosition,

    get active() { return active; },
    get tracking() { return tracking; },
    get groundConfirmed() { return groundConfirmed; },

    //===== CUSTOM MEMBERS =====

    setFloorOffset,
    getFloorOffset,

    get floorOffset() { return floorOffset; },
  });

  mixinEmitter(wikitudeProvider);

  return wikitudeProvider;

//======================================================================================================================
// PUBLIC INTERFACE
//======================================================================================================================

  /**
   * Activates the tracker. Does not guarantee that the tracking will begin before promise is fulfilled.
   * @returns {Promise} resolved when done.
   * @memberOf! WikitudeProvider#
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
   * @memberOf! WikitudeProvider#
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
   * @memberOf! WikitudeProvider#
   */
  function reset() {
    return Promise.resolve().then(deactivate).then(activate);
  }

  /**
   * Confirms ground position to start feature tracking.
   * @returns {Promise} resolved when done.
   * @memberOf! WikitudeProvider#
   */
  function confirmGroundPosition() {
    return coreInterface.call('confirmGroundPosition', name).then(() => groundConfirmed = true);
  }

  /**
   * Sets the current floor offset. The scene will be adjusted vertically according to this offset.
   * @param {number} height
   * @returns {Promise} resolved when done.
   * @memberOf! WikitudeProvider#
   */
  function setFloorOffset(height) {
    if (typeof height === 'number') {
      floorOffset = height;
      return coreInterface.call('customTrackingCommand', name, 'setFloorOffset', JSON.stringify(height));
    } else {
      console.warn('Can\'t set floor offset, given height is not a number.');
      return Promise.resolve();
    }
  }

  /**
   * Retrieves the current floor offset.
   * @returns {Promise.<number>} resolved when done.
   * @memberOf! WikitudeProvider#
   */
  async function getFloorOffset() {
    floorOffset = await coreInterface.call('customTrackingCommand', name, 'getFloorOffset', '{}');
    return floorOffset;
  }

//======================================================================================================================
// PRIVATE FUNCTIONS
//======================================================================================================================

  function handleTrackingTargetStatusChanged(targetName, event) {
    tracking = event === 'found';
    wikitudeProvider.emit('trackingTargetStatusChanged', tracking);
  }

}

import mixinEmitter from 'component-emitter';
import { injector } from '../dependencies';

/**
 * @interface TrackingTarget
 * @extends ProtectedEmitter
 * @emits TrackingTarget#found
 * @emits TrackingTarget#lost
 */

/**
 * @private
 * @returns {TrackingTarget}
 */
export const createTrackingTarget = injector.wireFactory(TrackingTarget, {});

export function TrackingTarget(specification) {
  const { name } = specification;

  return mixinEmitter({
    /**
     * name of the target
     * @type {string}
     * @memberof TrackingTarget#
     */
    name,
    /**
     * tracking status of the target
     * @type {boolean}
     * @memberof TrackingTarget#
     */
    tracked: false,

    _setTracked,
    _info: specification,
  });

//======================================================================================================================
// PRIVILEGED INTERFACE
//======================================================================================================================

  function _setTracked(event) {
    this.tracked = event === 'found';
    this.emit(event);
  }

}

/**
 * fires when the particular target is recognized by the tracker
 * @event TrackingTarget#found
 */

/**
 * fires when the particular target is no longer recognized by the tracker
 * @event TrackingTarget#lost
 */
